import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { env } from '@/config/env'

export const RATE_LIMIT_TYPES = ['read', 'write', 'export', 'login'] as const
export type RateLimitType = typeof RATE_LIMIT_TYPES[number]

export interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number
}

// Create Redis client for rate limiting
const redis = env.UPSTASH_REDIS_URL && env.UPSTASH_REDIS_TOKEN
  ? new Redis({
      url: env.UPSTASH_REDIS_URL,
      token: env.UPSTASH_REDIS_TOKEN,
    })
  : null

// Rate limiters for different operation types
const rateLimiters = redis
  ? {
      read: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(env.RATE_LIMIT_READ_REQUESTS, '1m'),
        prefix: 'ratelimit:read',
      }),
      write: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(env.RATE_LIMIT_WRITE_REQUESTS, '1m'),
        prefix: 'ratelimit:write',
      }),
      export: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(env.RATE_LIMIT_EXPORT_REQUESTS, '5m'),
        prefix: 'ratelimit:export',
      }),
      login: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(env.RATE_LIMIT_LOGIN_ATTEMPTS, '5m'),
        prefix: 'ratelimit:login',
      }),
    }
  : null

/**
 * Check rate limit for an operation
 * Returns success: true if not rate limited
 * Returns success: true always if Redis not configured (development mode)
 */
export async function checkRateLimit(
  type: RateLimitType,
  identifier: string
): Promise<RateLimitResult> {
  if (!rateLimiters) {
    // No rate limiting if Redis not configured
    return {
      success: true,
      remaining: 999,
      reset: Date.now() + 60000,
    }
  }

  const limiter = rateLimiters[type]
  const result = await limiter.limit(identifier)

  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  }
}

/**
 * Check if rate limiting is available
 */
export function isRateLimitingEnabled(): boolean {
  return rateLimiters !== null
}






