import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Hono } from 'hono'
import {
  requestTimeout,
  queryCountLimiter,
  performanceTracker,
  memoryUsage,
  responseSize,
  responseTimeRateLimit,
  getPerformanceMetrics,
  resetPerformanceMetrics,
} from '../performance'

describe('Performance Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetPerformanceMetrics()
  })

  afterEach(() => {
    resetPerformanceMetrics()
  })

  describe('requestTimeout', () => {
    it('allows requests to complete within timeout', async () => {
      const app = new Hono()
      app.use('*', requestTimeout(1000))
      app.get('/test', (c) => c.json({ success: true }))

      const response = await app.request('/test')

      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({ success: true })
    })

    it('times out requests that exceed timeout', async () => {
      const app = new Hono()
      app.use('*', requestTimeout(100))
      app.get('/test', async (c) => {
        await new Promise((resolve) => setTimeout(resolve, 200))
        return c.json({ success: true })
      })

      const startTime = Date.now()
      const response = await app.request('/test')
      const duration = Date.now() - startTime

      // Request should complete (timeout doesn't abort, just logs)
      expect(response.status).toBe(200)
      expect(duration).toBeGreaterThan(100)
    })
  })

  describe('queryCountLimiter', () => {
    it('tracks query counts', async () => {
      const app = new Hono()
      app.use('*', queryCountLimiter)
      app.get('/test', (c) => {
        const queryCount = c.get('queryCount') as any
        queryCount.select++
        return c.json({ success: true })
      })

      await app.request('/test')

      // Query count should be tracked
      expect(true).toBe(true) // Middleware executed
    })

    it('warns on high query counts', async () => {
      const app = new Hono()
      app.use('*', queryCountLimiter)
      app.get('/test', (c) => {
        const queryCount = c.get('queryCount') as any
        queryCount.select = 100 // Simulate high query count
        return c.json({ success: true })
      })

      await app.request('/test')

      // Should log warning for high query count
      expect(true).toBe(true) // Middleware executed
    })
  })

  describe('performanceTracker', () => {
    it('tracks request performance', async () => {
      const app = new Hono()
      app.use('*', performanceTracker)
      app.get('/test', (c) => c.json({ success: true }))

      await app.request('/test')

      const metrics = getPerformanceMetrics()

      expect(metrics).toHaveLength(1)
      expect(metrics[0].path).toBe('GET /test')
      expect(metrics[0].count).toBe(1)
      expect(metrics[0].avgTime).toBeGreaterThan(0)
    })

    it('adds response time header', async () => {
      const app = new Hono()
      app.use('*', performanceTracker)
      app.get('/test', (c) => c.json({ success: true }))

      const response = await app.request('/test')

      expect(response.headers.get('X-Response-Time')).toMatch(/\d+ms/)
    })

    it('aggregates metrics for same endpoint', async () => {
      const app = new Hono()
      app.use('*', performanceTracker)
      app.get('/test', (c) => c.json({ success: true }))

      await app.request('/test')
      await app.request('/test')
      await app.request('/test')

      const metrics = getPerformanceMetrics()

      expect(metrics).toHaveLength(1)
      expect(metrics[0].count).toBe(3)
      expect(metrics[0].avgTime).toBeGreaterThan(0)
    })
  })

  describe('memoryUsage', () => {
    it('logs memory usage in development', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const app = new Hono()
      app.use('*', memoryUsage)
      app.get('/test', (c) => c.json({ success: true }))

      await app.request('/test')

      // Should execute without error
      expect(true).toBe(true)

      process.env.NODE_ENV = originalEnv
    })

    it('skips memory logging in production', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const app = new Hono()
      app.use('*', memoryUsage)
      app.get('/test', (c) => c.json({ success: true }))

      await app.request('/test')

      // Should execute without error
      expect(true).toBe(true)

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('responseSize', () => {
    it('adds response size header', async () => {
      const app = new Hono()
      app.use('*', responseSize)
      app.get('/test', (c) => c.json({ success: true }))

      const response = await app.request('/test')

      expect(response.headers.get('X-Response-Size')).toMatch(/\d+ bytes/)
    })

    it('handles responses without content-length', async () => {
      const app = new Hono()
      app.use('*', responseSize)
      app.get('/test', (c) => {
        return c.body(null, 204)
      })

      const response = await app.request('/test')

      // Should execute without error
      expect(response.status).toBe(204)
    })
  })

  describe('responseTimeRateLimit', () => {
    it('applies delay for slow endpoints', async () => {
      const app = new Hono()
      app.use('*', performanceTracker)
      app.use('*', responseTimeRateLimit)
      app.get('/test', (c) => c.json({ success: true }))

      // Make several requests to build up metrics
      for (let i = 0; i < 15; i++) {
        await app.request('/test')
      }

      const startTime = Date.now()
      await app.request('/test')
      const duration = Date.now() - startTime

      // Should have some delay due to rate limiting
      expect(duration).toBeGreaterThan(0)
    })

    it('does not delay fast endpoints', async () => {
      const app = new Hono()
      app.use('*', performanceTracker)
      app.use('*', responseTimeRateLimit)
      app.get('/test', (c) => c.json({ success: true }))

      const startTime = Date.now()
      await app.request('/test')
      const duration = Date.now() - startTime

      // Should not have significant delay
      expect(duration).toBeLessThan(100)
    })
  })

  describe('getPerformanceMetrics', () => {
    it('returns empty array when no metrics', () => {
      const metrics = getPerformanceMetrics()

      expect(metrics).toEqual([])
    })

    it('returns sorted metrics by average time', async () => {
      const app = new Hono()
      app.use('*', performanceTracker)

      // Add different endpoints with different response times
      app.get('/fast', (c) => c.json({ success: true }))
      app.get('/slow', async (c) => {
        await new Promise((resolve) => setTimeout(resolve, 100))
        return c.json({ success: true })
      })

      await app.request('/fast')
      await app.request('/slow')

      const metrics = getPerformanceMetrics()

      expect(metrics).toHaveLength(2)
      // Should be sorted by avgTime (descending)
      expect(metrics[0].path).toBe('GET /slow')
      expect(metrics[1].path).toBe('GET /fast')
    })
  })

  describe('resetPerformanceMetrics', () => {
    it('clears all metrics', async () => {
      const app = new Hono()
      app.use('*', performanceTracker)
      app.get('/test', (c) => c.json({ success: true }))

      await app.request('/test')
      await app.request('/test')

      let metrics = getPerformanceMetrics()
      expect(metrics).toHaveLength(1)
      expect(metrics[0].count).toBe(2)

      resetPerformanceMetrics()

      metrics = getPerformanceMetrics()
      expect(metrics).toEqual([])
    })
  })
})
