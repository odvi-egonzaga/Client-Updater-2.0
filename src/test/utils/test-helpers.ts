import { Hono } from 'hono'
import type { MiddlewareHandler } from 'hono'
import { createErrorHandler } from '@/server/api/middleware/error-handler'

/**
 * Create a test Hono app with proper middleware setup
 */
export function createTestApp(): Hono {
  const app = new Hono()

  // Add error handler middleware
  app.use('*', createErrorHandler())

  // Add mock auth middleware to set required context variables
  app.use('*', async (c, next) => {
    // Use type assertions to bypass Hono's type constraints for test purposes
    ;(c as any).set('userId', 'test-user-id')
    ;(c as any).set('orgId', 'test-org-id')
    ;(c as any).set('auth', {
      userId: 'test-user-id',
      orgId: 'test-org-id',
    })
    await next()
  })

  return app
}
