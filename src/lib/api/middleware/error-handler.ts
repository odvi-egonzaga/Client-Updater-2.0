// Error handler middleware for Hono
import type { Context, Next } from 'hono'
import type { Middleware } from 'hono'
import { ZodError } from 'zod'
import {
  AppError,
  formatErrorResponse,
  isOperationalError,
  fromZodError,
  InternalServerError,
} from '../errors'
import { logger } from '@/lib/logger'
import { logActivity } from '@/lib/services/activity-logger'

/**
 * Error handler middleware
 * Catches all errors and returns consistent JSON responses
 */
export function createErrorHandler(): Middleware {
  return async (c: Context, next: Next) => {
    try {
      await next()
    } catch (error) {
      return handleError(c, error as Error)
    }
  }
}

/**
 * Handle error and return appropriate response
 */
async function handleError(c: Context, error: Error) {
  const userId = c.get('userId') || 'anonymous'
  const requestId = c.get('requestId')
  const path = c.req.path
  const method = c.req.method

  // Determine if we should include stack traces
  const includeStack = process.env.NODE_ENV !== 'production'

  // Format error response
  let formattedError
  let statusCode = 500

  if (error instanceof AppError) {
    formattedError = formatErrorResponse(error, includeStack)
    statusCode = error.statusCode
  } else if (error instanceof ZodError) {
    const validationError = fromZodError(error)
    formattedError = formatErrorResponse(validationError, includeStack)
    statusCode = validationError.statusCode
  } else {
    // Unknown error - wrap in internal server error
    const internalError = new InternalServerError(
      process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : error.message
    )
    formattedError = formatErrorResponse(internalError, includeStack)
    statusCode = internalError.statusCode
  }

  // Log error details
  const errorMeta = {
    requestId,
    userId,
    path,
    method,
    statusCode,
    isOperational: isOperationalError(error),
  }

  if (statusCode >= 500) {
    logger.error('Server error occurred', error, errorMeta)
  } else if (statusCode >= 400) {
    logger.warn('Client error occurred', error, errorMeta)
  }

  // Log server errors to activity log
  if (statusCode >= 500) {
    try {
      await logActivity({
        userId,
        action: 'ERROR',
        resource: 'system',
        details: {
          error: error.message,
          path,
          method,
          requestId,
        },
        statusCode,
        errorMessage: error.message,
      })
    } catch (logError) {
      // Never throw when logging errors
      console.error('[ErrorHandler] Failed to log error:', logError)
    }
  }

  // Set response status and body
  c.status(statusCode)
  return c.json(formattedError)
}

/**
 * Async handler wrapper
 * Wraps async route handlers to catch errors
 */
export function asyncHandler<T extends any[]>(
  handler: (c: Context, ...args: T) => Promise<Response>
) {
  return async (c: Context, ...args: T): Promise<Response> => {
    try {
      return await handler(c, ...args)
    } catch (error) {
      return handleError(c, error as Error)
    }
  }
}

/**
 * Validate request handler
 * Validates request using Zod schema
 */
export function validateRequest<T extends any[]>(
  schema: any,
  handler: (c: Context, ...args: T) => Promise<Response>
) {
  return async (c: Context, ...args: T): Promise<Response> => {
    try {
      const body = await c.req.json()
      const validatedData = schema.parse(body)
      
      // Set validated data in context
      c.set('validatedData', validatedData)
      
      return await handler(c, ...args)
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error)
        return handleError(c, validationError)
      }
      return handleError(c, error as Error)
    }
  }
}

/**
 * Not found handler
 * Handles 404 errors for unmatched routes
 */
export function notFoundHandler(c: Context) {
  const path = c.req.path
  const method = c.req.method

  const error = {
    error: {
      name: 'NotFoundError',
      code: 'NOT_FOUND',
      message: `Route ${method} ${path} not found`,
      statusCode: 404,
    },
  }

  logger.warn('Route not found', {
    path,
    method,
    statusCode: 404,
  })

  c.status(404)
  return c.json(error)
}

/**
 * Method not allowed handler
 * Handles 405 errors for wrong HTTP methods
 */
export function methodNotAllowedHandler(c: Context, allowedMethods: string[]) {
  const path = c.req.path
  const method = c.req.method

  const error = {
    error: {
      name: 'MethodNotAllowedError',
      code: 'METHOD_NOT_ALLOWED',
      message: `Method ${method} not allowed for ${path}. Allowed methods: ${allowedMethods.join(', ')}`,
      statusCode: 405,
    },
  }

  c.header('Allow', allowedMethods.join(', '))

  logger.warn('Method not allowed', {
    path,
    method,
    allowedMethods,
    statusCode: 405,
  })

  c.status(405)
  return c.json(error)
}
