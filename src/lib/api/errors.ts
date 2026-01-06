// Enhanced error handling with standardized error classes
import { ZodError } from 'zod'

/**
 * Base application error class
 * All custom errors should extend this class
 */
export class AppError extends Error {
  code: string
  statusCode: number
  isOperational: boolean

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.statusCode = statusCode
    this.isOperational = isOperational

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor)
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
    }
  }
}

/**
 * Not found error (404)
 * Used when a requested resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 'NOT_FOUND', 404, true)
  }
}

/**
 * Validation error (400)
 * Used when request validation fails
 */
export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: any) {
    super(message, 'VALIDATION_ERROR', 400, true)
    if (details) {
      (this as any).details = details
    }
  }
}

/**
 * Unauthorized error (401)
 * Used when authentication is required but not provided
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401, true)
  }
}

/**
 * Forbidden error (403)
 * Used when user is authenticated but lacks permission
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 'FORBIDDEN', 403, true)
  }
}

/**
 * Conflict error (409)
 * Used when a request conflicts with current state
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 'CONFLICT', 409, true)
  }
}

/**
 * Business logic error (422)
 * Used when business rules are violated
 */
export class BusinessLogicError extends AppError {
  constructor(message: string = 'Business logic error') {
    super(message, 'BUSINESS_LOGIC_ERROR', 422, true)
  }
}

/**
 * Rate limit error (429)
 * Used when rate limit is exceeded
 */
export class RateLimitError extends AppError {
  retryAfter?: number

  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, true)
    this.retryAfter = retryAfter
  }

  toJSON() {
    const json = super.toJSON()
    if (this.retryAfter) {
      (json as any).retryAfter = this.retryAfter
    }
    return json
  }
}

/**
 * Service unavailable error (503)
 * Used when a service is temporarily unavailable
 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, 'SERVICE_UNAVAILABLE', 503, true)
  }
}

/**
 * Internal server error (500)
 * Used for unexpected server errors
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(message, 'INTERNAL_SERVER_ERROR', 500, false)
  }
}

/**
 * Error response format
 */
export interface ErrorResponse {
  error: {
    name: string
    code: string
    message: string
    statusCode: number
    details?: any
    stack?: string
  }
}

/**
 * Format error for API response
 */
export function formatErrorResponse(error: Error, includeStack: boolean = false): ErrorResponse {
  if (error instanceof AppError) {
    const response: ErrorResponse = {
      error: {
        name: error.name,
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
      },
    }

    // Add details if present
    if ('details' in error) {
      response.error.details = (error as any).details
    }

    // Add stack trace in development or if explicitly requested
    if (includeStack && error.stack) {
      response.error.stack = error.stack
    }

    return response
  }

  if (error instanceof ZodError) {
    return {
      error: {
        name: 'ValidationError',
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        statusCode: 400,
        details: error.errors,
      },
    }
  }

  // Default error response
  const response: ErrorResponse = {
    error: {
      name: 'InternalServerError',
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : error.message,
      statusCode: 500,
    },
  }

  if (includeStack && error.stack) {
    response.error.stack = error.stack
  }

  return response
}

/**
 * Check if error is operational (should not crash the process)
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational
  }
  return false
}

/**
 * Convert Zod validation error to ValidationError
 */
export function fromZodError(zodError: ZodError): ValidationError {
  const details = zodError.errors.map((err) => ({
    path: err.path.join('.'),
    message: err.message,
    code: err.code,
  }))

  return new ValidationError('Validation failed', details)
}

/**
 * Create a not found error for a specific resource
 */
export function createNotFoundError(resource: string, identifier?: string): NotFoundError {
  const message = identifier 
    ? `${resource} with identifier '${identifier}' not found`
    : `${resource} not found`
  return new NotFoundError(message)
}

/**
 * Create a validation error with field details
 */
export function createValidationError(field: string, message: string): ValidationError {
  return new ValidationError(`Validation failed: ${field}`, {
    field,
    message,
  })
}

/**
 * Create a forbidden error for a specific action
 */
export function createForbiddenError(action: string, resource?: string): ForbiddenError {
  const message = resource 
    ? `You do not have permission to ${action} ${resource}`
    : `You do not have permission to ${action}`
  return new ForbiddenError(message)
}

/**
 * Create a conflict error with details
 */
export function createConflictError(message: string, details?: any): ConflictError {
  const error = new ConflictError(message)
  if (details) {
    (error as any).details = details
  }
  return error
}
