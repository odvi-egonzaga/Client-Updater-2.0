import { Redis } from '@upstash/redis'
import { env } from '@/config/env'

// Create Redis client (null if not configured)
const redis = env.UPSTASH_REDIS_URL && env.UPSTASH_REDIS_TOKEN
  ? new Redis({
      url: env.UPSTASH_REDIS_URL,
      token: env.UPSTASH_REDIS_TOKEN,
    })
  : null

// Cache TTL constants (in seconds)
export const CACHE_TTL = {
  LOOKUPS: 60 * 60,           // 1 hour
  USER_PERMISSIONS: 5 * 60,   // 5 minutes
  DASHBOARD_SUMMARY: 2 * 60,  // 2 minutes
  FILTER_OPTIONS: 10 * 60,    // 10 minutes
  CONFIG_SETTINGS: 15 * 60,   // 15 minutes
} as const

// Cache key builders
export const cacheKeys = {
  lookups: 'lookups:all',
  userPermissions: (userId: string) => `user:${userId}:permissions`,
  userBranches: (userId: string) => `user:${userId}:branches`,
  dashboardSummary: (company: string, year: number, month: number) =>
    `dashboard:${company}:${year}:${month}`,
  filterOptions: (company: string) => `filters:${company}`,
  configSettings: 'config:settings',
}

// Cache operations with fallback for when Redis is not configured
export const cache = {
  get: async <T>(key: string): Promise<T | null> => {
    if (!redis) return null
    return redis.get<T>(key)
  },

  set: async (key: string, value: unknown, ttlSeconds: number): Promise<void> => {
    if (!redis) return
    await redis.set(key, value, { ex: ttlSeconds })
  },

  del: async (key: string): Promise<void> => {
    if (!redis) return
    await redis.del(key)
  },

  delPattern: async (pattern: string): Promise<void> => {
    if (!redis) return
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  },

  isAvailable: (): boolean => redis !== null,
}



