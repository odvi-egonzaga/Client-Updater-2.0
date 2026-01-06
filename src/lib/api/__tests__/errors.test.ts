import { describe, it, expect } from 'vitest'
import {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  BusinessLogicError,
  RateLimitError,
  ServiceUnavailableError,
  InternalServerError,
  formatErrorResponse,
  isOperationalError,
  fromZodError,
  createNotFoundError,
  createValidationError,
  createForbiddenError,
  createConflictError,
} from '../errors'
import { ZodError } from 'zod'

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create base error with all properties', () => {
      const error = new AppError('Test message', 'TEST_ERROR', 500, true)

      expect(error.message).toBe('Test message')
      expect(error.code).toBe('TEST_ERROR')
      expect(error.statusCode).toBe(500)
      expect(error.isOperational).toBe(true)
      expect(error.name).toBe('AppError')
    })

    it('should have correct toJSON method', () => {
      const error = new AppError('Test message', 'TEST_ERROR', 500, true)
      const json = error.toJSON()

      expect(json).toEqual({
        name: 'AppError',
        code: 'TEST_ERROR',
        message: 'Test message',
        statusCode: 500,
      })
    })

    it('should maintain stack trace', () => {
      const error = new AppError('Test message', 'TEST_ERROR', 500, true)

      expect(error.stack).toBeDefined()
    })
  })

  describe('NotFoundError', () => {
    it('should create 404 error', () => {
      const error = new NotFoundError('Resource not found')

      expect(error.message).toBe('Resource not found')
      expect(error.code).toBe('NOT_FOUND')
      expect(error.statusCode).toBe(404)
      expect(error.isOperational).toBe(true)
    })

    it('should use default message', () => {
      const error = new NotFoundError()

      expect(error.message).toBe('Resource not found')
    })
  })

  describe('ValidationError', () => {
    it('should create 400 error', () => {
      const error = new ValidationError('Validation failed')

      expect(error.message).toBe('Validation failed')
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.statusCode).toBe(400)
      expect(error.isOperational).toBe(true)
    })

    it('should store details', () => {
      const details = { field: 'email', message: 'Invalid email' }
      const error = new ValidationError('Validation failed', details)

      expect((error as any).details).toEqual(details)
    })
  })

  describe('UnauthorizedError', () => {
    it('should create 401 error', () => {
      const error = new UnauthorizedError('Unauthorized')

      expect(error.message).toBe('Unauthorized')
      expect(error.code).toBe('UNAUTHORIZED')
      expect(error.statusCode).toBe(401)
      expect(error.isOperational).toBe(true)
    })
  })

  describe('ForbiddenError', () => {
    it('should create 403 error', () => {
      const error = new ForbiddenError('Forbidden')

      expect(error.message).toBe('Forbidden')
      expect(error.code).toBe('FORBIDDEN')
      expect(error.statusCode).toBe(403)
      expect(error.isOperational).toBe(true)
    })
  })

  describe('ConflictError', () => {
    it('should create 409 error', () => {
      const error = new ConflictError('Resource conflict')

      expect(error.message).toBe('Resource conflict')
      expect(error.code).toBe('CONFLICT')
      expect(error.statusCode).toBe(409)
      expect(error.isOperational).toBe(true)
    })
  })

  describe('BusinessLogicError', () => {
    it('should create 422 error', () => {
      const error = new BusinessLogicError('Business logic error')

      expect(error.message).toBe('Business logic error')
      expect(error.code).toBe('BUSINESS_LOGIC_ERROR')
      expect(error.statusCode).toBe(422)
      expect(error.isOperational).toBe(true)
    })
  })

  describe('RateLimitError', () => {
    it('should create 429 error', () => {
      const error = new RateLimitError('Rate limit exceeded')

      expect(error.message).toBe('Rate limit exceeded')
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED')
      expect(error.statusCode).toBe(429)
      expect(error.isOperational).toBe(true)
    })

    it('should include retryAfter', () => {
      const error = new RateLimitError('Rate limit exceeded', 60)

      expect(error.retryAfter).toBe(60)
      expect(error.toJSON()).toEqual({
        name: 'RateLimitError',
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded',
        statusCode: 429,
        retryAfter: 60,
      })
    })
  })

  describe('ServiceUnavailableError', () => {
    it('should create 503 error', () => {
      const error = new ServiceUnavailableError('Service temporarily unavailable')

      expect(error.message).toBe('Service temporarily unavailable')
      expect(error.code).toBe('SERVICE_UNAVAILABLE')
      expect(error.statusCode).toBe(503)
      expect(error.isOperational).toBe(true)
    })
  })

  describe('InternalServerError', () => {
    it('should create 500 error', () => {
      const error = new InternalServerError('Internal server error')

      expect(error.message).toBe('Internal server error')
      expect(error.code).toBe('INTERNAL_SERVER_ERROR')
      expect(error.statusCode).toBe(500)
      expect(error.isOperational).toBe(false)
    })
  })
})

describe('Error Formatting', () => {
  describe('formatErrorResponse', () => {
    it('should format AppError correctly', () => {
      const error = new NotFoundError('Resource not found')
      const response = formatErrorResponse(error, false)

      expect(response).toEqual({
        error: {
          name: 'NotFoundError',
          code: 'NOT_FOUND',
          message: 'Resource not found',
          statusCode: 404,
        },
      })
    })

    it('should include stack trace when requested', () => {
      const error = new NotFoundError('Resource not found')
      const response = formatErrorResponse(error, true)

      expect(response.error.stack).toBeDefined()
    })

    it('should include details when present', () => {
      const details = { field: 'email' }
      const error = new ValidationError('Validation failed', details)
      const response = formatErrorResponse(error, false)

      expect(response.error.details).toEqual(details)
    })

    it('should format ZodError correctly', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['email'],
          message: 'Expected string, received number',
        },
      ])

      const response = formatErrorResponse(zodError, false)

      expect(response.error.name).toBe('ValidationError')
      expect(response.error.code).toBe('VALIDATION_ERROR')
      expect(response.error.statusCode).toBe(400)
      expect(response.error.details).toBeDefined()
    })

    it('should format generic Error correctly', () => {
      const error = new Error('Something went wrong')
      const response = formatErrorResponse(error, false)

      expect(response.error.name).toBe('InternalServerError')
      expect(response.error.code).toBe('INTERNAL_SERVER_ERROR')
      expect(response.error.statusCode).toBe(500)
    })

    it('should hide generic error message in production', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const error = new Error('Sensitive error message')
      const response = formatErrorResponse(error, false)

      expect(response.error.message).toBe('An unexpected error occurred')

      process.env.NODE_ENV = originalEnv
    })

    it('should show generic error message in development', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const error = new Error('Sensitive error message')
      const response = formatErrorResponse(error, false)

      expect(response.error.message).toBe('Sensitive error message')

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('isOperationalError', () => {
    it('should return true for operational errors', () => {
      const error = new NotFoundError('Resource not found')

      expect(isOperationalError(error)).toBe(true)
    })

    it('should return false for non-operational errors', () => {
      const error = new InternalServerError('Internal server error')

      expect(isOperationalError(error)).toBe(false)
    })

    it('should return false for generic errors', () => {
      const error = new Error('Generic error')

      expect(isOperationalError(error)).toBe(false)
    })
  })

  describe('fromZodError', () => {
    it('should convert ZodError to ValidationError', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['email'],
          message: 'Expected string, received number',
        },
      ])

      const error = fromZodError(zodError)

      expect(error).toBeInstanceOf(ValidationError)
      expect(error.code).toBe('VALIDATION_ERROR')
      expect((error as any).details).toBeDefined()
    })

    it('should format ZodError details correctly', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['email'],
          message: 'Expected string, received number',
        },
      ])

      const error = fromZodError(zodError)
      const details = (error as any).details

      expect(details).toHaveLength(1)
      expect(details[0]).toEqual({
        path: 'email',
        message: 'Expected string, received number',
        code: 'invalid_type',
      })
    })
  })
})

describe('Error Factory Functions', () => {
  describe('createNotFoundError', () => {
    it('should create NotFoundError with resource name', () => {
      const error = createNotFoundError('Client')

      expect(error).toBeInstanceOf(NotFoundError)
      expect(error.message).toBe('Client not found')
    })

    it('should create NotFoundError with resource and identifier', () => {
      const error = createNotFoundError('Client', 'client-123')

      expect(error).toBeInstanceOf(NotFoundError)
      expect(error.message).toBe('Client with identifier \'client-123\' not found')
    })
  })

  describe('createValidationError', () => {
    it('should create ValidationError with field and message', () => {
      const error = createValidationError('email', 'Invalid email format')

      expect(error).toBeInstanceOf(ValidationError)
      expect(error.message).toBe('Validation failed: email')
      expect((error as any).details).toEqual({
        field: 'email',
        message: 'Invalid email format',
      })
    })
  })

  describe('createForbiddenError', () => {
    it('should create ForbiddenError with action', () => {
      const error = createForbiddenError('delete', 'clients')

      expect(error).toBeInstanceOf(ForbiddenError)
      expect(error.message).toBe('You do not have permission to delete clients')
    })

    it('should create ForbiddenError with action only', () => {
      const error = createForbiddenError('delete')

      expect(error).toBeInstanceOf(ForbiddenError)
      expect(error.message).toBe('You do not have permission to delete')
    })
  })

  describe('createConflictError', () => {
    it('should create ConflictError with message', () => {
      const error = createConflictError('Email already exists')

      expect(error).toBeInstanceOf(ConflictError)
      expect(error.message).toBe('Email already exists')
    })

    it('should create ConflictError with details', () => {
      const details = { field: 'email', value: 'test@example.com' }
      const error = createConflictError('Email already exists', details)

      expect(error).toBeInstanceOf(ConflictError)
      expect((error as any).details).toEqual(details)
    })
  })
})
