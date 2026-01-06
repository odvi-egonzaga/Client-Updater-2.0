/**
 * Performance Middleware
 *
 * This module provides middleware for monitoring and optimizing API performance.
 */

import { createMiddleware } from 'hono/factory'
import { logger } from '@/lib/logger'

// Request timeout configuration
const DEFAULT_TIMEOUT_MS = 30000 // 30 seconds

// Query count thresholds
const QUERY_COUNT_WARNING_THRESHOLD = 50
const QUERY_COUNT_ERROR_THRESHOLD = 100

// Performance metrics storage (in production, use a proper metrics system)
const performanceMetrics = new Map<string, {
  count: number
  totalTime: number
  maxTime: number
  minTime: number
}>()

/**
 * Request timeout middleware
 * Aborts requests that take too long to complete
 */
export const requestTimeout = (timeoutMs: number = DEFAULT_TIMEOUT_MS) => {
  return createMiddleware(async (c, next) => {
    const timeout = setTimeout(() => {
      logger.error('Request timeout', {
        path: c.req.path,
        method: c.req.method,
        timeoutMs,
      } as any)
    }, timeoutMs)

    try {
      await next()
    } finally {
      clearTimeout(timeout)
    }
  })
}

/**
 * Query count limiter middleware
 * Monitors and warns about high query counts
 */
export const queryCountLimiter = createMiddleware(async (c, next) => {
  const queryCount = {
    select: 0,
    insert: 0,
    update: 0,
    delete: 0,
  }

  // Store query count in context for monitoring
  c.set('queryCount', queryCount)

  const startTime = Date.now()

  await next()

  const duration = Date.now() - startTime
  const totalQueries = Object.values(queryCount).reduce((sum, count) => sum + count, 0)

  // Log query information
  if (totalQueries > 0) {
    logger.info('Request query count', {
      path: c.req.path,
      method: c.req.method,
      queryCount,
      totalQueries,
      durationMs: duration,
    })
  }

  // Warn on high query counts
  if (totalQueries >= QUERY_COUNT_ERROR_THRESHOLD) {
    logger.error('Excessive query count detected', {
      path: c.req.path,
      method: c.req.method,
      queryCount,
      totalQueries,
      threshold: QUERY_COUNT_ERROR_THRESHOLD,
    } as any)
  } else if (totalQueries >= QUERY_COUNT_WARNING_THRESHOLD) {
    logger.warn('High query count detected', {
      path: c.req.path,
      method: c.req.method,
      queryCount,
      totalQueries,
      threshold: QUERY_COUNT_WARNING_THRESHOLD,
    })
  }
})

/**
 * Performance tracking middleware
 * Tracks request duration and aggregates metrics
 */
export const performanceTracker = createMiddleware(async (c, next) => {
  const startTime = Date.now()
  const path = c.req.path
  const method = c.req.method

  await next()

  const duration = Date.now() - startTime

  // Update performance metrics
  const key = `${method} ${path}`
  const existing = performanceMetrics.get(key) || {
    count: 0,
    totalTime: 0,
    maxTime: 0,
    minTime: Infinity,
  }

  existing.count++
  existing.totalTime += duration
  existing.maxTime = Math.max(existing.maxTime, duration)
  existing.minTime = Math.min(existing.minTime, duration)

  performanceMetrics.set(key, existing)

  // Log slow requests
  if (duration > 1000) {
    logger.warn('Slow request detected', {
      path,
      method,
      durationMs: duration,
      status: c.res.status,
    })
  }

  // Add performance headers
  c.res.headers.set('X-Response-Time', `${duration}ms`)
})

/**
 * Get performance metrics
 * Returns aggregated performance statistics
 */
export function getPerformanceMetrics() {
  const metrics: Array<{
    path: string
    count: number
    avgTime: number
    maxTime: number
    minTime: number
  }> = []

  for (const [key, value] of performanceMetrics.entries()) {
    metrics.push({
      path: key,
      count: value.count,
      avgTime: value.totalTime / value.count,
      maxTime: value.maxTime,
      minTime: value.minTime === Infinity ? 0 : value.minTime,
    })
  }

  return metrics.sort((a, b) => b.avgTime - a.avgTime)
}

/**
 * Reset performance metrics
 * Clears all stored performance data
 */
export function resetPerformanceMetrics() {
  performanceMetrics.clear()
  logger.info('Performance metrics reset')
}

/**
 * Memory usage middleware
 * Logs memory usage for each request (development only)
 */
export const memoryUsage = createMiddleware(async (c, next) => {
  if (process.env.NODE_ENV === 'development') {
    const before = process.memoryUsage()

    await next()

    const after = process.memoryUsage()
    const diff = {
      rss: after.rss - before.rss,
      heapTotal: after.heapTotal - before.heapTotal,
      heapUsed: after.heapUsed - before.heapUsed,
      external: after.external - before.external,
    }

    logger.debug('Memory usage', {
      path: c.req.path,
      method: c.req.method,
      before,
      after,
      diff,
    })
  } else {
    await next()
  }
})

/**
 * Response size middleware
 * Tracks response sizes for monitoring
 */
export const responseSize = createMiddleware(async (c, next) => {
  await next()

  const contentLength = c.res.headers.get('content-length')
  const size = contentLength ? parseInt(contentLength, 10) : 0

  if (size > 1024 * 1024) {
    // Log responses larger than 1MB
    logger.warn('Large response detected', {
      path: c.req.path,
      method: c.req.method,
      sizeBytes: size,
      sizeMB: (size / (1024 * 1024)).toFixed(2),
    })
  }

  c.res.headers.set('X-Response-Size', `${size} bytes`)
})

/**
 * Rate limiting by response time
 * Limits requests based on average response time
 */
export const responseTimeRateLimit = createMiddleware(async (c, next) => {
  const key = `${c.req.method} ${c.req.path}`
  const metrics = performanceMetrics.get(key)

  // If we have metrics and average time is high, add delay
  if (metrics && metrics.count > 10 && (metrics.totalTime / metrics.count) > 2000) {
    const avgTime = metrics.totalTime / metrics.count
    const delay = Math.min(avgTime * 0.1, 5000) // Max 5 second delay
    logger.warn('Applying response time rate limit', {
      path: c.req.path,
      method: c.req.method,
      avgTime: avgTime,
      delayMs: delay,
    })

    await new Promise((resolve) => setTimeout(resolve, delay))
  }

  await next()
})
