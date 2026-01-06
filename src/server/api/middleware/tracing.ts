import { Context, Next } from 'hono'
import { logger } from '@/lib/logger'

export async function tracingMiddleware(c: Context, next: Next) {
  const requestId = c.req.header('x-request-id') || crypto.randomUUID()
  const start = Date.now()

  // Set request ID for downstream use
  c.set('requestId', requestId)
  c.header('X-Request-ID', requestId)

  try {
    await next()

    logger.info('Request completed', {
      requestId,
      duration_ms: Date.now() - start,
      path: new URL(c.req.url).pathname,
      method: c.req.method,
      status: c.res.status,
      userId: c.get('userId'),
    })
  } catch (error) {
    logger.error('Request failed', error as Error, {
      requestId,
      duration_ms: Date.now() - start,
      path: new URL(c.req.url).pathname,
      method: c.req.method,
      userId: c.get('userId'),
    })
    throw error
  }
}






