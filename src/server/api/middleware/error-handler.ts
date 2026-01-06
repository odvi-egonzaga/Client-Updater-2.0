import type { Context, Next } from 'hono'
import { ZodError } from 'zod'
import { logger } from '@/lib/logger'

export function createErrorHandler() {
  return async (c: Context, next: Next) => {
    try {
      await next()
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof ZodError) {
        logger.warn('Validation error', {
          error: error.errors,
          path: c.req.path,
        })

        return c.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid request data',
              details: error.errors,
            },
          },
          400
        )
      }

      // Handle other errors
      logger.error('Unhandled error', error as Error, {
        path: c.req.path,
        method: c.req.method,
      })

      return c.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
            details: error instanceof Error ? error.message : undefined,
          },
        },
        500
      )
    }
  }
}
