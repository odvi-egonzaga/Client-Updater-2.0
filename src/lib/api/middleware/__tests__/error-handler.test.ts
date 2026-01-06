import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { ZodError } from 'zod'
import {
  createErrorHandler,
  asyncHandler,
  validateRequest,
  notFoundHandler,
  methodNotAllowedHandler,
} from '../error-handler'
import {
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  InternalServerError,
  fromZodError,
} from '../errors'
import { logActivity } from '@/lib/services/activity-logger'

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock activity logger
vi.mock('@/lib/services/activity-logger', () => ({
  logActivity: vi.fn(),
}))

describe('Error Handler Middleware', () => {
  let app: Hono

  beforeEach(() => {
    vi.clearAllMocks()
    app = new Hono()
  })

  describe('createErrorHandler', () => {
    it('should handle AppError correctly', async () => {
      app.use('*', createErrorHandler())
      app.get('/test', () => {
        throw new NotFoundError('Resource not found')
      })

      const res = await app.request('/test')

      expect(res.status).toBe(404)
      const json = await res.json()
      expect(json.error.code).toBe('NOT_FOUND')
      expect(json.error.message).toBe('Resource not found')
    })

    it('should handle ZodError correctly', async () => {
      app.use('*', createErrorHandler())
      app.get('/test', () => {
        throw new ZodError([
          {
            code: 'invalid_type',
            expected: 'string',
            received: 'number',
            path: ['email'],
            message: 'Expected string, received number',
          },
        ])
      })

      const res = await app.request('/test')

      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })

    it('should handle generic Error correctly', async () => {
      app.use('*', createErrorHandler())
      app.get('/test', () => {
        throw new Error('Something went wrong')
      })

      const res = await app.request('/test')

      expect(res.status).toBe(500)
      const json = await res.json()
      expect(json.error.code).toBe('INTERNAL_SERVER_ERROR')
    })

    it('should log server errors to activity log', async () => {
      app.use('*', createErrorHandler())
      app.get('/test', () => {
        throw new InternalServerError('Database error')
      })

      await app.request('/test')

      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ERROR',
          resource: 'system',
          statusCode: 500,
          errorMessage: 'Database error',
        })
      )
    })

    it('should not log client errors to activity log', async () => {
      app.use('*', createErrorHandler())
      app.get('/test', () => {
        throw new NotFoundError('Resource not found')
      })

      await app.request('/test')

      expect(logActivity).not.toHaveBeenCalled()
    })

    it('should include stack trace in development', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      app.use('*', createErrorHandler())
      app.get('/test', () => {
        throw new Error('Test error')
      })

      const res = await app.request('/test')
      const json = await res.json()

      expect(json.error.stack).toBeDefined()

      process.env.NODE_ENV = originalEnv
    })

    it('should not include stack trace in production', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      app.use('*', createErrorHandler())
      app.get('/test', () => {
        throw new Error('Test error')
      })

      const res = await app.request('/test')
      const json = await res.json()

      expect(json.error.stack).toBeUndefined()

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('asyncHandler', () => {
    it('should handle successful async route', async () => {
      app.get('/test', asyncHandler(async () => {
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }))

      const res = await app.request('/test')

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
    })

    it('should handle errors in async route', async () => {
      app.get('/test', asyncHandler(async () => {
        throw new NotFoundError('Resource not found')
      }))

      const res = await app.request('/test')

      expect(res.status).toBe(404)
      const json = await res.json()
      expect(json.error.code).toBe('NOT_FOUND')
    })
  })

  describe('validateRequest', () => {
    it('should validate request body successfully', async () => {
      const schema = {
        parse: vi.fn().mockReturnValue({ email: 'test@example.com' }),
      }

      app.post('/test', validateRequest(schema, async (c) => {
        const data = c.get('validatedData')
        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json' },
        })
      }))

      const res = await app.request('/test', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
        headers: { 'Content-Type': 'application/json' },
      })

      expect(res.status).toBe(200)
      expect(schema.parse).toHaveBeenCalled()
    })

    it('should return validation error on invalid data', async () => {
      const schema = {
        parse: vi.fn().mockImplementation(() => {
          throw new ZodError([
            {
              code: 'invalid_type',
              expected: 'string',
              received: 'number',
              path: ['email'],
              message: 'Expected string, received number',
            },
          ])
        }),
      }

      app.post('/test', validateRequest(schema, async (c) => {
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }))

      const res = await app.request('/test', {
        method: 'POST',
        body: JSON.stringify({ email: 123 }),
        headers: { 'Content-Type': 'application/json' },
      })

      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('notFoundHandler', () => {
    it('should return 404 for unmatched routes', async () => {
      app.all('*', notFoundHandler)

      const res = await app.request('/nonexistent')

      expect(res.status).toBe(404)
      const json = await res.json()
      expect(json.error.code).toBe('NOT_FOUND')
      expect(json.error.message).toContain('Route GET /nonexistent not found')
    })
  })

  describe('methodNotAllowedHandler', () => {
    it('should return 405 for wrong HTTP method', async () => {
      app.all('*', methodNotAllowedHandler(['GET', 'POST']))

      const res = await app.request('/test', { method: 'DELETE' })

      expect(res.status).toBe(405)
      const json = await res.json()
      expect(json.error.code).toBe('METHOD_NOT_ALLOWED')
      expect(json.error.message).toContain('Method DELETE not allowed')
      expect(res.headers.get('Allow')).toBe('GET, POST')
    })
  })
})
