# Client Updater v2 - Phase 0-1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up infrastructure (caching, queuing, rate limiting) and foundation (database schema, shared utilities, auth integration).

**Architecture:** Next.js 15 frontend with Hono API routes, Supabase PostgreSQL via Drizzle ORM, Upstash Redis for caching/rate limiting, Supabase Queue (pgmq) for background jobs.

**Tech Stack:** Next.js 15, TypeScript, Drizzle ORM, Hono, Upstash Redis, Zod, Clerk Auth

**Reference:** See `docs/plans/2026-01-05-client-updater-v2-design.md` for full design document.

---

## Phase 0: Infrastructure Setup

### Task 1: Add Upstash Redis Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install Upstash packages**

Run:
```bash
cd client-updater-version-2 && pnpm add @upstash/redis @upstash/ratelimit
```

**Step 2: Verify installation**

Run: `pnpm list @upstash/redis @upstash/ratelimit`
Expected: Both packages listed with versions

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add upstash redis and ratelimit packages"
```

---

### Task 2: Add Environment Variables for Infrastructure

**Files:**
- Modify: `src/config/env.ts`

**Step 1: Write failing test for new env vars**

Create: `src/config/__tests__/env-infrastructure.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Infrastructure Environment Variables', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('should parse Upstash Redis URL', async () => {
    vi.stubEnv('UPSTASH_REDIS_URL', 'https://test.upstash.io')
    vi.stubEnv('UPSTASH_REDIS_TOKEN', 'test-token')

    const { env } = await import('../env')
    expect(env.UPSTASH_REDIS_URL).toBe('https://test.upstash.io')
    expect(env.UPSTASH_REDIS_TOKEN).toBe('test-token')
  })

  it('should have default rate limit values', async () => {
    const { env } = await import('../env')
    expect(env.RATE_LIMIT_READ_REQUESTS).toBe(100)
    expect(env.RATE_LIMIT_WRITE_REQUESTS).toBe(30)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test src/config/__tests__/env-infrastructure.test.ts`
Expected: FAIL - properties don't exist

**Step 3: Add infrastructure env vars to schema**

Modify: `src/config/env.ts` - Add after existing env vars:

```typescript
  // Upstash Redis (Caching & Rate Limiting)
  UPSTASH_REDIS_URL: z.string().url().optional(),
  UPSTASH_REDIS_TOKEN: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_READ_REQUESTS: z.coerce.number().default(100),
  RATE_LIMIT_WRITE_REQUESTS: z.coerce.number().default(30),
  RATE_LIMIT_EXPORT_REQUESTS: z.coerce.number().default(5),
  RATE_LIMIT_LOGIN_ATTEMPTS: z.coerce.number().default(5),

  // Circuit Breaker
  CIRCUIT_SNOWFLAKE_THRESHOLD: z.coerce.number().default(5),
  CIRCUIT_SNOWFLAKE_COOLDOWN_MS: z.coerce.number().default(60000),
  CIRCUIT_NEXTBANK_THRESHOLD: z.coerce.number().default(3),
  CIRCUIT_NEXTBANK_COOLDOWN_MS: z.coerce.number().default(30000),

  // Data Retention (days)
  RETENTION_ACTIVITY_LOGS: z.coerce.number().default(90),
  RETENTION_COMPLETED_JOBS: z.coerce.number().default(7),
  RETENTION_EXPORT_FILES: z.coerce.number().default(30),

  // Health Check
  HEALTH_CHECK_TIMEOUT_MS: z.coerce.number().default(5000),
```

**Step 4: Run test to verify it passes**

Run: `pnpm test src/config/__tests__/env-infrastructure.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/config/env.ts src/config/__tests__/env-infrastructure.test.ts
git commit -m "feat: add infrastructure environment variables"
```

---

### Task 3: Create Redis Cache Service

**Files:**
- Create: `src/lib/cache/redis.ts`
- Create: `src/lib/cache/index.ts`
- Create: `src/lib/cache/__tests__/redis.test.ts`

**Step 1: Write failing test for cache service**

Create: `src/lib/cache/__tests__/redis.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Upstash Redis
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    keys: vi.fn().mockResolvedValue([]),
  })),
}))

describe('Cache Service', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('UPSTASH_REDIS_URL', 'https://test.upstash.io')
    vi.stubEnv('UPSTASH_REDIS_TOKEN', 'test-token')
  })

  it('should export cache functions', async () => {
    const { cache } = await import('../redis')
    expect(cache).toBeDefined()
    expect(cache.get).toBeDefined()
    expect(cache.set).toBeDefined()
    expect(cache.del).toBeDefined()
    expect(cache.delPattern).toBeDefined()
  })

  it('should export cache key builders', async () => {
    const { cacheKeys } = await import('../redis')
    expect(cacheKeys.lookups).toBe('lookups:all')
    expect(cacheKeys.userPermissions('user-1')).toBe('user:user-1:permissions')
    expect(cacheKeys.userBranches('user-1')).toBe('user:user-1:branches')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/cache/__tests__/redis.test.ts`
Expected: FAIL - module not found

**Step 3: Create cache service**

Create: `src/lib/cache/redis.ts`

```typescript
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
```

Create: `src/lib/cache/index.ts`

```typescript
export { cache, cacheKeys, CACHE_TTL } from './redis'
```

**Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/cache/__tests__/redis.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/cache/
git commit -m "feat: add Redis cache service with Upstash"
```

---

### Task 4: Create Rate Limiting Middleware

**Files:**
- Create: `src/lib/rate-limit/index.ts`
- Create: `src/lib/rate-limit/__tests__/rate-limit.test.ts`

**Step 1: Write failing test for rate limiter**

Create: `src/lib/rate-limit/__tests__/rate-limit.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Upstash
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(() => ({})),
}))

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: vi.fn().mockImplementation(() => ({
    limit: vi.fn().mockResolvedValue({
      success: true,
      remaining: 99,
      reset: Date.now() + 60000,
    }),
  })),
}))

describe('Rate Limiting', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('UPSTASH_REDIS_URL', 'https://test.upstash.io')
    vi.stubEnv('UPSTASH_REDIS_TOKEN', 'test-token')
  })

  it('should export rate limit checker', async () => {
    const { checkRateLimit } = await import('../index')
    expect(checkRateLimit).toBeDefined()
  })

  it('should return rate limit result', async () => {
    const { checkRateLimit } = await import('../index')
    const result = await checkRateLimit('read', 'user-123')

    expect(result).toHaveProperty('success')
    expect(result).toHaveProperty('remaining')
    expect(result).toHaveProperty('reset')
  })

  it('should export rate limit types', async () => {
    const { RATE_LIMIT_TYPES } = await import('../index')
    expect(RATE_LIMIT_TYPES).toContain('read')
    expect(RATE_LIMIT_TYPES).toContain('write')
    expect(RATE_LIMIT_TYPES).toContain('export')
    expect(RATE_LIMIT_TYPES).toContain('login')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/rate-limit/__tests__/rate-limit.test.ts`
Expected: FAIL - module not found

**Step 3: Create rate limiting service**

Create: `src/lib/rate-limit/index.ts`

```typescript
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
```

**Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/rate-limit/__tests__/rate-limit.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/rate-limit/
git commit -m "feat: add rate limiting with Upstash Ratelimit"
```

---

### Task 5: Create Circuit Breaker Service

**Files:**
- Create: `src/lib/resilience/circuit-breaker.ts`
- Create: `src/lib/resilience/index.ts`
- Create: `src/lib/resilience/__tests__/circuit-breaker.test.ts`

**Step 1: Write failing test for circuit breaker**

Create: `src/lib/resilience/__tests__/circuit-breaker.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CircuitBreaker, CircuitOpenError } from '../circuit-breaker'

describe('CircuitBreaker', () => {
  let circuit: CircuitBreaker

  beforeEach(() => {
    circuit = new CircuitBreaker('test', {
      failureThreshold: 3,
      cooldownMs: 1000,
      successThreshold: 2,
    })
  })

  it('should execute function when circuit is closed', async () => {
    const fn = vi.fn().mockResolvedValue('success')
    const result = await circuit.execute(fn)

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalled()
  })

  it('should open circuit after failure threshold', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'))

    // Fail 3 times to open circuit
    for (let i = 0; i < 3; i++) {
      await expect(circuit.execute(fn)).rejects.toThrow('fail')
    }

    // Next call should fail with CircuitOpenError
    await expect(circuit.execute(fn)).rejects.toBeInstanceOf(CircuitOpenError)
  })

  it('should reset failures on success', async () => {
    const failFn = vi.fn().mockRejectedValue(new Error('fail'))
    const successFn = vi.fn().mockResolvedValue('success')

    // Fail twice
    await expect(circuit.execute(failFn)).rejects.toThrow()
    await expect(circuit.execute(failFn)).rejects.toThrow()

    // Success should reset
    await circuit.execute(successFn)

    // Can fail twice more without opening
    await expect(circuit.execute(failFn)).rejects.toThrow()
    await expect(circuit.execute(failFn)).rejects.toThrow()

    // Still not open
    const fn = vi.fn().mockResolvedValue('ok')
    const result = await circuit.execute(fn)
    expect(result).toBe('ok')
  })

  it('should expose circuit state', () => {
    expect(circuit.getState()).toBe('closed')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/resilience/__tests__/circuit-breaker.test.ts`
Expected: FAIL - module not found

**Step 3: Create circuit breaker**

Create: `src/lib/resilience/circuit-breaker.ts`

```typescript
export class CircuitOpenError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CircuitOpenError'
  }
}

interface CircuitState {
  status: 'closed' | 'open' | 'half-open'
  failures: number
  successes: number
  lastFailure: number | null
  lastCheck: number
}

interface CircuitBreakerConfig {
  failureThreshold: number
  cooldownMs: number
  successThreshold: number
}

export class CircuitBreaker {
  private state: CircuitState = {
    status: 'closed',
    failures: 0,
    successes: 0,
    lastFailure: null,
    lastCheck: Date.now(),
  }

  constructor(
    private name: string,
    private config: CircuitBreakerConfig
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state.status === 'open') {
      if (Date.now() - this.state.lastCheck > this.config.cooldownMs) {
        this.state.status = 'half-open'
        this.state.successes = 0
      } else {
        throw new CircuitOpenError(`Circuit ${this.name} is open`)
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess(): void {
    if (this.state.status === 'half-open') {
      this.state.successes++
      if (this.state.successes >= this.config.successThreshold) {
        this.state.status = 'closed'
        this.state.failures = 0
      }
    } else {
      this.state.failures = 0
    }
  }

  private onFailure(): void {
    this.state.failures++
    this.state.lastFailure = Date.now()
    this.state.lastCheck = Date.now()

    if (this.state.failures >= this.config.failureThreshold) {
      this.state.status = 'open'
    }
  }

  getState(): 'closed' | 'open' | 'half-open' {
    return this.state.status
  }

  getFailures(): number {
    return this.state.failures
  }
}
```

Create: `src/lib/resilience/index.ts`

```typescript
import { env } from '@/config/env'
import { CircuitBreaker } from './circuit-breaker'

export { CircuitBreaker, CircuitOpenError } from './circuit-breaker'

// Pre-configured circuit breakers for external services
export const circuits = {
  snowflake: new CircuitBreaker('snowflake', {
    failureThreshold: env.CIRCUIT_SNOWFLAKE_THRESHOLD,
    cooldownMs: env.CIRCUIT_SNOWFLAKE_COOLDOWN_MS,
    successThreshold: 3,
  }),
  nextbank: new CircuitBreaker('nextbank', {
    failureThreshold: env.CIRCUIT_NEXTBANK_THRESHOLD,
    cooldownMs: env.CIRCUIT_NEXTBANK_COOLDOWN_MS,
    successThreshold: 2,
  }),
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/resilience/__tests__/circuit-breaker.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/resilience/
git commit -m "feat: add circuit breaker for external service resilience"
```

---

### Task 6: Create Logger Service

**Files:**
- Create: `src/lib/logger/index.ts`
- Create: `src/lib/logger/__tests__/logger.test.ts`

**Step 1: Write failing test for logger**

Create: `src/lib/logger/__tests__/logger.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('should export logger with standard methods', async () => {
    const { logger } = await import('../index')
    expect(logger.info).toBeDefined()
    expect(logger.error).toBeDefined()
    expect(logger.warn).toBeDefined()
    expect(logger.debug).toBeDefined()
  })

  it('should log info messages as JSON', async () => {
    const { logger } = await import('../index')
    logger.info('test message', { userId: '123' })

    expect(console.log).toHaveBeenCalled()
    const logged = JSON.parse((console.log as ReturnType<typeof vi.fn>).mock.calls[0][0])
    expect(logged.level).toBe('info')
    expect(logged.message).toBe('test message')
    expect(logged.userId).toBe('123')
  })

  it('should log errors with stack trace', async () => {
    const { logger } = await import('../index')
    const error = new Error('test error')
    logger.error('operation failed', error, { requestId: 'req-1' })

    expect(console.error).toHaveBeenCalled()
    const logged = JSON.parse((console.error as ReturnType<typeof vi.fn>).mock.calls[0][0])
    expect(logged.level).toBe('error')
    expect(logged.error.message).toBe('test error')
    expect(logged.requestId).toBe('req-1')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/logger/__tests__/logger.test.ts`
Expected: FAIL - module not found

**Step 3: Create logger service**

Create: `src/lib/logger/index.ts`

```typescript
interface LogMeta {
  requestId?: string
  userId?: string
  action?: string
  resource?: string
  resourceId?: string
  duration_ms?: number
  [key: string]: unknown
}

interface LogEntry extends LogMeta {
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  timestamp: string
  error?: {
    name: string
    message: string
    stack?: string
  }
}

function formatLog(entry: LogEntry): string {
  return JSON.stringify(entry)
}

export const logger = {
  debug: (message: string, meta?: LogMeta): void => {
    if (process.env.NODE_ENV === 'development') {
      console.log(formatLog({
        level: 'debug',
        message,
        timestamp: new Date().toISOString(),
        ...meta,
      }))
    }
  },

  info: (message: string, meta?: LogMeta): void => {
    console.log(formatLog({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    }))
  },

  warn: (message: string, meta?: LogMeta): void => {
    console.warn(formatLog({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    }))
  },

  error: (message: string, error: Error, meta?: LogMeta): void => {
    console.error(formatLog({
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      ...meta,
    }))
  },
}

export type { LogMeta, LogEntry }
```

**Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/logger/__tests__/logger.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/logger/
git commit -m "feat: add structured JSON logger"
```

---

### Task 7: Create API Middleware with Rate Limiting and Logging

**Files:**
- Create: `src/server/api/middleware/rate-limit.ts`
- Create: `src/server/api/middleware/tracing.ts`
- Modify: `src/server/api/index.ts`

**Step 1: Create rate limit middleware**

Create: `src/server/api/middleware/rate-limit.ts`

```typescript
import { Context, Next } from 'hono'
import { checkRateLimit, RateLimitType } from '@/lib/rate-limit'

export function rateLimitMiddleware(type: RateLimitType = 'read') {
  return async (c: Context, next: Next) => {
    const userId = c.get('userId') as string | undefined
    const identifier = userId || c.req.header('x-forwarded-for') || 'anonymous'

    const result = await checkRateLimit(type, identifier)

    // Set rate limit headers
    c.header('X-RateLimit-Remaining', String(result.remaining))
    c.header('X-RateLimit-Reset', String(result.reset))

    if (!result.success) {
      return c.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
          },
        },
        429
      )
    }

    await next()
  }
}
```

**Step 2: Create tracing middleware**

Create: `src/server/api/middleware/tracing.ts`

```typescript
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
```

**Step 3: Update API index to use new middleware**

Modify: `src/server/api/index.ts`

```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authMiddleware } from './middleware/auth'
import { tracingMiddleware } from './middleware/tracing'
import { healthRoutes } from './routes/health'
import { usersRoutes } from './routes/users'

const app = new Hono().basePath('/api')

// Global middleware
app.use('*', tracingMiddleware)
app.use('*', cors())

// Public routes
app.get('/ping', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Protected routes - require authentication
app.use('*', authMiddleware)
app.route('/health', healthRoutes)
app.route('/users', usersRoutes)

export { app }
export type AppType = typeof app
```

**Step 4: Run existing tests to verify no regressions**

Run: `pnpm test`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/server/api/middleware/ src/server/api/index.ts
git commit -m "feat: add rate limiting and request tracing middleware"
```

---

### Task 8: Create Health Check Endpoint with Service Status

**Files:**
- Create: `src/server/api/routes/health/system.ts`
- Modify: `src/server/api/routes/health/index.ts`

**Step 1: Write failing test for system health**

Create: `src/server/api/routes/health/__tests__/system.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { Hono } from 'hono'
import { systemHealthRoute } from '../system'

describe('System Health Endpoint', () => {
  it('should return health status', async () => {
    const app = new Hono()
    app.route('/system', systemHealthRoute)

    const res = await app.request('/system')
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toHaveProperty('status')
    expect(data).toHaveProperty('timestamp')
    expect(data).toHaveProperty('services')
  })

  it('should include queue status', async () => {
    const app = new Hono()
    app.route('/system', systemHealthRoute)

    const res = await app.request('/system')
    const data = await res.json()

    expect(data).toHaveProperty('queues')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test src/server/api/routes/health/__tests__/system.test.ts`
Expected: FAIL - module not found

**Step 3: Create system health endpoint**

Create: `src/server/api/routes/health/system.ts`

```typescript
import { Hono } from 'hono'
import { cache } from '@/lib/cache'
import { isRateLimitingEnabled } from '@/lib/rate-limit'
import { circuits } from '@/lib/resilience'
import { db } from '@/server/db'
import { sql } from 'drizzle-orm'

export const systemHealthRoute = new Hono()

interface ServiceStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  latency_ms?: number
  circuit?: string
  error?: string
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  services: Record<string, ServiceStatus>
  queues: Record<string, { pending: number; processing: number; dead: number }>
}

async function checkDatabase(): Promise<ServiceStatus> {
  const start = Date.now()
  try {
    await db.execute(sql`SELECT 1`)
    return { status: 'healthy', latency_ms: Date.now() - start }
  } catch (error) {
    return { status: 'unhealthy', error: (error as Error).message }
  }
}

async function checkRedis(): Promise<ServiceStatus> {
  if (!cache.isAvailable()) {
    return { status: 'degraded', error: 'Redis not configured' }
  }
  const start = Date.now()
  try {
    await cache.set('health:ping', 'pong', 10)
    return { status: 'healthy', latency_ms: Date.now() - start }
  } catch (error) {
    return { status: 'unhealthy', error: (error as Error).message }
  }
}

function checkCircuits(): Record<string, ServiceStatus> {
  return {
    snowflake: {
      status: circuits.snowflake.getState() === 'open' ? 'unhealthy' : 'healthy',
      circuit: circuits.snowflake.getState(),
    },
    nextbank: {
      status: circuits.nextbank.getState() === 'open' ? 'unhealthy' : 'healthy',
      circuit: circuits.nextbank.getState(),
    },
  }
}

systemHealthRoute.get('/', async (c) => {
  const [dbStatus, redisStatus] = await Promise.all([
    checkDatabase(),
    checkRedis(),
  ])

  const circuitStatuses = checkCircuits()

  const services: Record<string, ServiceStatus> = {
    database: dbStatus,
    redis: redisStatus,
    ...circuitStatuses,
  }

  // Determine overall status
  const statuses = Object.values(services).map((s) => s.status)
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
  if (statuses.includes('unhealthy')) {
    overallStatus = 'unhealthy'
  } else if (statuses.includes('degraded')) {
    overallStatus = 'degraded'
  }

  const response: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.0.0',
    services,
    queues: {
      exports: { pending: 0, processing: 0, dead: 0 },
      sync: { pending: 0, processing: 0, dead: 0 },
    },
  }

  return c.json(response, overallStatus === 'unhealthy' ? 503 : 200)
})
```

**Step 4: Update health routes index**

Modify: `src/server/api/routes/health/index.ts` - Add import and route:

```typescript
// Add to existing imports
import { systemHealthRoute } from './system'

// Add to routes
healthRoutes.route('/system', systemHealthRoute)
```

**Step 5: Run test to verify it passes**

Run: `pnpm test src/server/api/routes/health/__tests__/system.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/server/api/routes/health/
git commit -m "feat: add comprehensive system health endpoint"
```

---

## Phase 1: Foundation - Database Schema

### Task 9: Create Lookup Tables Schema

**Files:**
- Create: `src/server/db/schema/lookups.ts`
- Modify: `src/server/db/schema/index.ts`

**Step 1: Write failing test for lookup schema**

Create: `src/server/db/schema/__tests__/lookups.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import * as lookups from '../lookups'

describe('Lookup Tables Schema', () => {
  it('should export companies table', () => {
    expect(lookups.companies).toBeDefined()
    expect(lookups.companies._.name).toBe('companies')
  })

  it('should export pension_types table', () => {
    expect(lookups.pensionTypes).toBeDefined()
    expect(lookups.pensionTypes._.name).toBe('pension_types')
  })

  it('should export status_types table', () => {
    expect(lookups.statusTypes).toBeDefined()
    expect(lookups.statusTypes._.name).toBe('status_types')
  })

  it('should export status_reasons table', () => {
    expect(lookups.statusReasons).toBeDefined()
    expect(lookups.statusReasons._.name).toBe('status_reasons')
  })

  it('should have common lookup columns', () => {
    // Check companies has standard columns
    const columns = Object.keys(lookups.companies._.columns)
    expect(columns).toContain('id')
    expect(columns).toContain('code')
    expect(columns).toContain('name')
    expect(columns).toContain('isActive')
    expect(columns).toContain('sortOrder')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test src/server/db/schema/__tests__/lookups.test.ts`
Expected: FAIL - module not found

**Step 3: Create lookup tables schema**

Create: `src/server/db/schema/lookups.ts`

```typescript
import { pgTable, uuid, varchar, boolean, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Common columns for lookup tables
const lookupColumns = {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  isSystem: boolean('is_system').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}

// Enums
export const trackingCycleEnum = pgEnum('tracking_cycle', ['monthly', 'quarterly'])

// Companies (FCASH, PCNI)
export const companies = pgTable('companies', {
  ...lookupColumns,
})

// Pension Types (SSS, GSIS, PVAO, etc.)
export const pensionTypes = pgTable('pension_types', {
  ...lookupColumns,
  companyId: uuid('company_id').references(() => companies.id),
})

// Pensioner Types (DEPENDENT, DISABILITY, RETIREE, ITF)
export const pensionerTypes = pgTable('pensioner_types', {
  ...lookupColumns,
  pensionTypeId: uuid('pension_type_id').references(() => pensionTypes.id),
})

// Products
export const products = pgTable('products', {
  ...lookupColumns,
  companyId: uuid('company_id').references(() => companies.id),
  trackingCycle: trackingCycleEnum('tracking_cycle').default('monthly').notNull(),
})

// Account Types (PASSBOOK, ATM, BOTH, NONE)
export const accountTypes = pgTable('account_types', {
  ...lookupColumns,
})

// PAR Statuses (current, 30+, 60+)
export const parStatuses = pgTable('par_statuses', {
  ...lookupColumns,
  isTrackable: boolean('is_trackable').default(true).notNull(),
})

// Status Types (PENDING, TO_FOLLOW, CALLED, VISITED, UPDATED, DONE)
export const statusTypes = pgTable('status_types', {
  ...lookupColumns,
  sequence: integer('sequence').default(0).notNull(),
  companyId: uuid('company_id').references(() => companies.id),
})

// Status Reasons
export const statusReasons = pgTable('status_reasons', {
  ...lookupColumns,
  statusTypeId: uuid('status_type_id').references(() => statusTypes.id),
  isTerminal: boolean('is_terminal').default(false).notNull(),
  requiresRemarks: boolean('requires_remarks').default(false).notNull(),
})

// Relations
export const companiesRelations = relations(companies, ({ many }) => ({
  pensionTypes: many(pensionTypes),
  products: many(products),
  statusTypes: many(statusTypes),
}))

export const pensionTypesRelations = relations(pensionTypes, ({ one, many }) => ({
  company: one(companies, {
    fields: [pensionTypes.companyId],
    references: [companies.id],
  }),
  pensionerTypes: many(pensionerTypes),
}))

export const pensionerTypesRelations = relations(pensionerTypes, ({ one }) => ({
  pensionType: one(pensionTypes, {
    fields: [pensionerTypes.pensionTypeId],
    references: [pensionTypes.id],
  }),
}))

export const productsRelations = relations(products, ({ one }) => ({
  company: one(companies, {
    fields: [products.companyId],
    references: [companies.id],
  }),
}))

export const statusTypesRelations = relations(statusTypes, ({ one, many }) => ({
  company: one(companies, {
    fields: [statusTypes.companyId],
    references: [companies.id],
  }),
  reasons: many(statusReasons),
}))

export const statusReasonsRelations = relations(statusReasons, ({ one }) => ({
  statusType: one(statusTypes, {
    fields: [statusReasons.statusTypeId],
    references: [statusTypes.id],
  }),
}))

// Type exports
export type Company = typeof companies.$inferSelect
export type NewCompany = typeof companies.$inferInsert
export type PensionType = typeof pensionTypes.$inferSelect
export type NewPensionType = typeof pensionTypes.$inferInsert
export type PensionerType = typeof pensionerTypes.$inferSelect
export type StatusType = typeof statusTypes.$inferSelect
export type StatusReason = typeof statusReasons.$inferSelect
export type Product = typeof products.$inferSelect
export type AccountType = typeof accountTypes.$inferSelect
export type ParStatus = typeof parStatuses.$inferSelect
```

**Step 4: Update schema index**

Modify: `src/server/db/schema/index.ts`

```typescript
export * from './users'
export * from './health-checks'
export * from './lookups'
```

**Step 5: Run test to verify it passes**

Run: `pnpm test src/server/db/schema/__tests__/lookups.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/server/db/schema/
git commit -m "feat: add lookup tables schema (companies, pension types, status types)"
```

---

### Task 10: Create Organization Schema (Areas, Branches)

**Files:**
- Create: `src/server/db/schema/organization.ts`
- Modify: `src/server/db/schema/index.ts`

**Step 1: Write failing test**

Create: `src/server/db/schema/__tests__/organization.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import * as org from '../organization'

describe('Organization Schema', () => {
  it('should export areas table', () => {
    expect(org.areas).toBeDefined()
    expect(org.areas._.name).toBe('areas')
  })

  it('should export branches table', () => {
    expect(org.branches).toBeDefined()
    expect(org.branches._.name).toBe('branches')
  })

  it('should export area_branches junction table', () => {
    expect(org.areaBranches).toBeDefined()
    expect(org.areaBranches._.name).toBe('area_branches')
  })

  it('should export branch_contacts table', () => {
    expect(org.branchContacts).toBeDefined()
    expect(org.branchContacts._.name).toBe('branch_contacts')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test src/server/db/schema/__tests__/organization.test.ts`
Expected: FAIL - module not found

**Step 3: Create organization schema**

Create: `src/server/db/schema/organization.ts`

```typescript
import { pgTable, uuid, varchar, boolean, timestamp, primaryKey } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { companies } from './lookups'

// Areas
export const areas = pgTable('areas', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  companyId: uuid('company_id').references(() => companies.id),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Branches
export const branches = pgTable('branches', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  location: varchar('location', { length: 500 }),
  category: varchar('category', { length: 100 }),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Area-Branch junction table
export const areaBranches = pgTable('area_branches', {
  areaId: uuid('area_id').notNull().references(() => areas.id),
  branchId: uuid('branch_id').notNull().references(() => branches.id),
  isPrimary: boolean('is_primary').default(false).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.areaId, table.branchId] }),
}))

// Branch contacts
export const branchContacts = pgTable('branch_contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  branchId: uuid('branch_id').notNull().references(() => branches.id),
  type: varchar('type', { length: 50 }).notNull(), // phone, email, etc.
  value: varchar('value', { length: 255 }).notNull(),
  isPrimary: boolean('is_primary').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Relations
export const areasRelations = relations(areas, ({ one, many }) => ({
  company: one(companies, {
    fields: [areas.companyId],
    references: [companies.id],
  }),
  areaBranches: many(areaBranches),
}))

export const branchesRelations = relations(branches, ({ many }) => ({
  areaBranches: many(areaBranches),
  contacts: many(branchContacts),
}))

export const areaBranchesRelations = relations(areaBranches, ({ one }) => ({
  area: one(areas, {
    fields: [areaBranches.areaId],
    references: [areas.id],
  }),
  branch: one(branches, {
    fields: [areaBranches.branchId],
    references: [branches.id],
  }),
}))

export const branchContactsRelations = relations(branchContacts, ({ one }) => ({
  branch: one(branches, {
    fields: [branchContacts.branchId],
    references: [branches.id],
  }),
}))

// Type exports
export type Area = typeof areas.$inferSelect
export type NewArea = typeof areas.$inferInsert
export type Branch = typeof branches.$inferSelect
export type NewBranch = typeof branches.$inferInsert
export type AreaBranch = typeof areaBranches.$inferSelect
export type BranchContact = typeof branchContacts.$inferSelect
```

**Step 4: Update schema index**

Add to `src/server/db/schema/index.ts`:

```typescript
export * from './organization'
```

**Step 5: Run test to verify it passes**

Run: `pnpm test src/server/db/schema/__tests__/organization.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/server/db/schema/
git commit -m "feat: add organization schema (areas, branches)"
```

---

### Task 11: Extend Users Schema with Permissions

**Files:**
- Modify: `src/server/db/schema/users.ts`

**Step 1: Write failing test for new user columns**

Modify: `src/server/db/schema/__tests__/users.test.ts` - Add tests:

```typescript
import { describe, it, expect } from 'vitest'
import * as schema from '../users'

describe('Users Schema', () => {
  it('should export users table', () => {
    expect(schema.users).toBeDefined()
    expect(schema.users._.name).toBe('users')
  })

  it('should have isActive column', () => {
    const columns = Object.keys(schema.users._.columns)
    expect(columns).toContain('isActive')
  })

  it('should export permissions table', () => {
    expect(schema.permissions).toBeDefined()
    expect(schema.permissions._.name).toBe('permissions')
  })

  it('should export user_permissions junction table', () => {
    expect(schema.userPermissions).toBeDefined()
    expect(schema.userPermissions._.name).toBe('user_permissions')
  })

  it('should export user_branches junction table', () => {
    expect(schema.userBranches).toBeDefined()
    expect(schema.userBranches._.name).toBe('user_branches')
  })

  it('should export user_areas junction table', () => {
    expect(schema.userAreas).toBeDefined()
    expect(schema.userAreas._.name).toBe('user_areas')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test src/server/db/schema/__tests__/users.test.ts`
Expected: FAIL - new tables don't exist

**Step 3: Update users schema with permissions**

Replace: `src/server/db/schema/users.ts`

```typescript
import { pgTable, uuid, varchar, boolean, timestamp, text, integer, primaryKey, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { companies } from './lookups'
import { branches, areas } from './organization'

// Enums
export const permissionScopeEnum = pgEnum('permission_scope', ['self', 'branch', 'area', 'all'])

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: varchar('clerk_id', { length: 255 }).unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  imageUrl: text('image_url'),
  isActive: boolean('is_active').default(true).notNull(),
  mustChangePassword: boolean('must_change_password').default(false).notNull(),
  passwordChangedAt: timestamp('password_changed_at'),
  lastLoginAt: timestamp('last_login_at'),
  loginCount: integer('login_count').default(0).notNull(),
  failedLoginCount: integer('failed_login_count').default(0).notNull(),
  lockedUntil: timestamp('locked_until'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Permissions
export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 100 }).notNull().unique(),
  resource: varchar('resource', { length: 50 }).notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  description: varchar('description', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// User-Permission junction with scope
export const userPermissions = pgTable('user_permissions', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  permissionId: uuid('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').references(() => companies.id),
  scope: permissionScopeEnum('scope').default('self').notNull(),
  grantedAt: timestamp('granted_at').defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.permissionId] }),
}))

// User-Branch assignment
export const userBranches = pgTable('user_branches', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  grantedAt: timestamp('granted_at').defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.branchId] }),
}))

// User-Area assignment (grants all branches in area)
export const userAreas = pgTable('user_areas', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  areaId: uuid('area_id').notNull().references(() => areas.id, { onDelete: 'cascade' }),
  grantedAt: timestamp('granted_at').defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.areaId] }),
}))

// User sessions for tracking active sessions
export const userSessions = pgTable('user_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionToken: varchar('session_token', { length: 255 }).notNull().unique(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  revokedAt: timestamp('revoked_at'),
  revokedReason: varchar('revoked_reason', { length: 255 }),
})

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  permissions: many(userPermissions),
  branches: many(userBranches),
  areas: many(userAreas),
  sessions: many(userSessions),
}))

export const permissionsRelations = relations(permissions, ({ many }) => ({
  userPermissions: many(userPermissions),
}))

export const userPermissionsRelations = relations(userPermissions, ({ one }) => ({
  user: one(users, {
    fields: [userPermissions.userId],
    references: [users.id],
  }),
  permission: one(permissions, {
    fields: [userPermissions.permissionId],
    references: [permissions.id],
  }),
  company: one(companies, {
    fields: [userPermissions.companyId],
    references: [companies.id],
  }),
}))

export const userBranchesRelations = relations(userBranches, ({ one }) => ({
  user: one(users, {
    fields: [userBranches.userId],
    references: [users.id],
  }),
  branch: one(branches, {
    fields: [userBranches.branchId],
    references: [branches.id],
  }),
}))

export const userAreasRelations = relations(userAreas, ({ one }) => ({
  user: one(users, {
    fields: [userAreas.userId],
    references: [users.id],
  }),
  area: one(areas, {
    fields: [userAreas.areaId],
    references: [areas.id],
  }),
}))

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}))

// Type exports
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Permission = typeof permissions.$inferSelect
export type NewPermission = typeof permissions.$inferInsert
export type UserPermission = typeof userPermissions.$inferSelect
export type UserBranch = typeof userBranches.$inferSelect
export type UserArea = typeof userAreas.$inferSelect
export type UserSession = typeof userSessions.$inferSelect
```

**Step 4: Run test to verify it passes**

Run: `pnpm test src/server/db/schema/__tests__/users.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/server/db/schema/users.ts src/server/db/schema/__tests__/users.test.ts
git commit -m "feat: extend users schema with permissions and territory assignments"
```

---

### Task 12: Create Clients Schema

**Files:**
- Create: `src/server/db/schema/clients.ts`
- Modify: `src/server/db/schema/index.ts`

**Step 1: Write failing test**

Create: `src/server/db/schema/__tests__/clients.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import * as clients from '../clients'

describe('Clients Schema', () => {
  it('should export clients table', () => {
    expect(clients.clients).toBeDefined()
    expect(clients.clients._.name).toBe('clients')
  })

  it('should export client_period_status table', () => {
    expect(clients.clientPeriodStatus).toBeDefined()
    expect(clients.clientPeriodStatus._.name).toBe('client_period_status')
  })

  it('should export status_events table', () => {
    expect(clients.statusEvents).toBeDefined()
    expect(clients.statusEvents._.name).toBe('status_events')
  })

  it('should have required client columns', () => {
    const columns = Object.keys(clients.clients._.columns)
    expect(columns).toContain('clientCode')
    expect(columns).toContain('fullName')
    expect(columns).toContain('branchId')
    expect(columns).toContain('pensionTypeId')
    expect(columns).toContain('syncSource')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test src/server/db/schema/__tests__/clients.test.ts`
Expected: FAIL - module not found

**Step 3: Create clients schema**

Create: `src/server/db/schema/clients.ts`

```typescript
import { pgTable, uuid, varchar, boolean, timestamp, text, decimal, integer, date, pgEnum, unique } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { pensionTypes, pensionerTypes, products, accountTypes, parStatuses, statusTypes, statusReasons } from './lookups'
import { branches } from './organization'
import { users } from './users'

// Enums
export const syncSourceEnum = pgEnum('sync_source', ['snowflake', 'nextbank'])
export const periodTypeEnum = pgEnum('period_type', ['monthly', 'quarterly'])

// Main clients table
export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientCode: varchar('client_code', { length: 50 }).notNull().unique(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  pensionNumber: varchar('pension_number', { length: 100 }),
  birthDate: date('birth_date'),
  contactNumber: varchar('contact_number', { length: 50 }),
  contactNumberAlt: varchar('contact_number_alt', { length: 50 }),

  // Foreign keys
  pensionTypeId: uuid('pension_type_id').references(() => pensionTypes.id),
  pensionerTypeId: uuid('pensioner_type_id').references(() => pensionerTypes.id),
  productId: uuid('product_id').references(() => products.id),
  branchId: uuid('branch_id').references(() => branches.id),
  parStatusId: uuid('par_status_id').references(() => parStatuses.id),
  accountTypeId: uuid('account_type_id').references(() => accountTypes.id),

  // Financial
  pastDueAmount: decimal('past_due_amount', { precision: 15, scale: 2 }),
  loanStatus: varchar('loan_status', { length: 50 }),

  // Status
  isActive: boolean('is_active').default(true).notNull(),

  // Sync tracking
  lastSyncedAt: timestamp('last_synced_at'),
  syncSource: syncSourceEnum('sync_source'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
})

// Client period status (current snapshot)
export const clientPeriodStatus = pgTable('client_period_status', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),

  // Period
  periodType: periodTypeEnum('period_type').notNull(),
  periodMonth: integer('period_month'), // 1-12 for monthly
  periodQuarter: integer('period_quarter'), // 1-4 for quarterly
  periodYear: integer('period_year').notNull(),

  // Status
  statusTypeId: uuid('status_type_id').references(() => statusTypes.id),
  reasonId: uuid('reason_id').references(() => statusReasons.id),
  remarks: text('remarks'),
  hasPayment: boolean('has_payment').default(false).notNull(),
  updateCount: integer('update_count').default(0).notNull(),
  isTerminal: boolean('is_terminal').default(false).notNull(),

  // Tracking
  updatedBy: uuid('updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uniquePeriod: unique().on(table.clientId, table.periodType, table.periodMonth, table.periodQuarter, table.periodYear),
}))

// Status events (audit trail)
export const statusEvents = pgTable('status_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientPeriodStatusId: uuid('client_period_status_id').notNull().references(() => clientPeriodStatus.id, { onDelete: 'cascade' }),

  // Status at time of event
  statusTypeId: uuid('status_type_id').references(() => statusTypes.id),
  reasonId: uuid('reason_id').references(() => statusReasons.id),
  remarks: text('remarks'),
  hasPayment: boolean('has_payment').default(false).notNull(),

  // Event tracking
  eventSequence: integer('event_sequence').notNull(),

  // Audit
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Client sync history
export const clientSyncHistory = pgTable('client_sync_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  fieldChanged: varchar('field_changed', { length: 100 }).notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  syncJobId: uuid('sync_job_id'),
  changedAt: timestamp('changed_at').defaultNow().notNull(),
})

// Relations
export const clientsRelations = relations(clients, ({ one, many }) => ({
  pensionType: one(pensionTypes, {
    fields: [clients.pensionTypeId],
    references: [pensionTypes.id],
  }),
  pensionerType: one(pensionerTypes, {
    fields: [clients.pensionerTypeId],
    references: [pensionerTypes.id],
  }),
  product: one(products, {
    fields: [clients.productId],
    references: [products.id],
  }),
  branch: one(branches, {
    fields: [clients.branchId],
    references: [branches.id],
  }),
  parStatus: one(parStatuses, {
    fields: [clients.parStatusId],
    references: [parStatuses.id],
  }),
  accountType: one(accountTypes, {
    fields: [clients.accountTypeId],
    references: [accountTypes.id],
  }),
  periodStatuses: many(clientPeriodStatus),
  syncHistory: many(clientSyncHistory),
}))

export const clientPeriodStatusRelations = relations(clientPeriodStatus, ({ one, many }) => ({
  client: one(clients, {
    fields: [clientPeriodStatus.clientId],
    references: [clients.id],
  }),
  statusType: one(statusTypes, {
    fields: [clientPeriodStatus.statusTypeId],
    references: [statusTypes.id],
  }),
  reason: one(statusReasons, {
    fields: [clientPeriodStatus.reasonId],
    references: [statusReasons.id],
  }),
  updatedByUser: one(users, {
    fields: [clientPeriodStatus.updatedBy],
    references: [users.id],
  }),
  events: many(statusEvents),
}))

export const statusEventsRelations = relations(statusEvents, ({ one }) => ({
  periodStatus: one(clientPeriodStatus, {
    fields: [statusEvents.clientPeriodStatusId],
    references: [clientPeriodStatus.id],
  }),
  statusType: one(statusTypes, {
    fields: [statusEvents.statusTypeId],
    references: [statusTypes.id],
  }),
  reason: one(statusReasons, {
    fields: [statusEvents.reasonId],
    references: [statusReasons.id],
  }),
  createdByUser: one(users, {
    fields: [statusEvents.createdBy],
    references: [users.id],
  }),
}))

// Type exports
export type Client = typeof clients.$inferSelect
export type NewClient = typeof clients.$inferInsert
export type ClientPeriodStatus = typeof clientPeriodStatus.$inferSelect
export type NewClientPeriodStatus = typeof clientPeriodStatus.$inferInsert
export type StatusEvent = typeof statusEvents.$inferSelect
export type NewStatusEvent = typeof statusEvents.$inferInsert
export type ClientSyncHistory = typeof clientSyncHistory.$inferSelect
```

**Step 4: Update schema index**

Add to `src/server/db/schema/index.ts`:

```typescript
export * from './clients'
```

**Step 5: Run test to verify it passes**

Run: `pnpm test src/server/db/schema/__tests__/clients.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/server/db/schema/
git commit -m "feat: add clients schema with status tracking"
```

---

### Task 13: Create Jobs and Config Schema

**Files:**
- Create: `src/server/db/schema/jobs.ts`
- Create: `src/server/db/schema/config.ts`
- Modify: `src/server/db/schema/index.ts`

**Step 1: Create jobs schema**

Create: `src/server/db/schema/jobs.ts`

```typescript
import { pgTable, uuid, varchar, timestamp, text, integer, jsonb, pgEnum, bigserial } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { users } from './users'

// Enums
export const jobStatusEnum = pgEnum('job_status', ['pending', 'processing', 'completed', 'failed', 'dead'])
export const syncJobTypeEnum = pgEnum('sync_job_type', ['snowflake', 'nextbank'])
export const exportFormatEnum = pgEnum('export_format', ['csv', 'xlsx'])

// Sync jobs
export const syncJobs = pgTable('sync_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: syncJobTypeEnum('type').notNull(),
  status: jobStatusEnum('status').default('pending').notNull(),
  parameters: jsonb('parameters'),
  recordsProcessed: integer('records_processed').default(0),
  recordsCreated: integer('records_created').default(0),
  recordsUpdated: integer('records_updated').default(0),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  error: text('error'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Export jobs
export const exportJobs = pgTable('export_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: varchar('type', { length: 50 }).notNull(), // clients, status, report
  format: exportFormatEnum('format').notNull(),
  status: jobStatusEnum('status').default('pending').notNull(),
  parameters: jsonb('parameters'), // filters, columns, etc.
  filePath: varchar('file_path', { length: 500 }),
  fileSize: integer('file_size'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  error: text('error'),
  expiresAt: timestamp('expires_at'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Generic job queue for background processing
export const jobQueue = pgTable('job_queue', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  queueName: varchar('queue_name', { length: 50 }).notNull(),
  payload: jsonb('payload').notNull(),
  status: jobStatusEnum('status').default('pending').notNull(),
  priority: integer('priority').default(0).notNull(),
  attempts: integer('attempts').default(0).notNull(),
  maxAttempts: integer('max_attempts').default(3).notNull(),
  scheduledAt: timestamp('scheduled_at').defaultNow().notNull(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  error: text('error'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Scheduled jobs config (for pg_cron)
export const scheduledJobs = pgTable('scheduled_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  cronExpression: varchar('cron_expression', { length: 50 }).notNull(),
  functionName: varchar('function_name', { length: 100 }).notNull(),
  payload: jsonb('payload'),
  isActive: boolean('is_active').default(true).notNull(),
  lastRunAt: timestamp('last_run_at'),
  nextRunAt: timestamp('next_run_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

import { boolean } from 'drizzle-orm/pg-core'

// Relations
export const syncJobsRelations = relations(syncJobs, ({ one }) => ({
  createdByUser: one(users, {
    fields: [syncJobs.createdBy],
    references: [users.id],
  }),
}))

export const exportJobsRelations = relations(exportJobs, ({ one }) => ({
  createdByUser: one(users, {
    fields: [exportJobs.createdBy],
    references: [users.id],
  }),
}))

// Type exports
export type SyncJob = typeof syncJobs.$inferSelect
export type NewSyncJob = typeof syncJobs.$inferInsert
export type ExportJob = typeof exportJobs.$inferSelect
export type NewExportJob = typeof exportJobs.$inferInsert
export type JobQueueItem = typeof jobQueue.$inferSelect
export type NewJobQueueItem = typeof jobQueue.$inferInsert
export type ScheduledJob = typeof scheduledJobs.$inferSelect
```

**Step 2: Create config schema**

Create: `src/server/db/schema/config.ts`

```typescript
import { pgTable, uuid, varchar, boolean, timestamp, text, integer, jsonb, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { companies } from './lookups'
import { users } from './users'

// Enums
export const valueTypeEnum = pgEnum('value_type', ['string', 'number', 'boolean', 'json'])

// Config categories
export const configCategories = pgTable('config_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Config options (dropdown options, etc.)
export const configOptions = pgTable('config_options', {
  id: uuid('id').primaryKey().defaultRandom(),
  categoryId: uuid('category_id').notNull().references(() => configCategories.id),
  code: varchar('code', { length: 100 }).notNull(),
  label: varchar('label', { length: 255 }).notNull(),
  value: text('value'),
  metadata: jsonb('metadata'),
  isActive: boolean('is_active').default(true).notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  parentOptionId: uuid('parent_option_id'),
  companyId: uuid('company_id').references(() => companies.id),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Config settings (key-value system settings)
export const configSettings = pgTable('config_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: text('value'),
  valueType: valueTypeEnum('value_type').default('string').notNull(),
  description: text('description'),
  isPublic: boolean('is_public').default(false).notNull(),
  companyId: uuid('company_id').references(() => companies.id),
  updatedBy: uuid('updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Config audit log
export const configAuditLog = pgTable('config_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  tableName: varchar('table_name', { length: 100 }).notNull(),
  recordId: uuid('record_id').notNull(),
  action: varchar('action', { length: 20 }).notNull(), // create, update, delete
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  changedBy: uuid('changed_by').references(() => users.id),
  changedAt: timestamp('changed_at').defaultNow().notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
})

// Activity logs
export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(),
  resource: varchar('resource', { length: 100 }),
  resourceId: uuid('resource_id'),
  details: jsonb('details'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  durationMs: integer('duration_ms'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Relations
export const configCategoriesRelations = relations(configCategories, ({ many }) => ({
  options: many(configOptions),
}))

export const configOptionsRelations = relations(configOptions, ({ one, many }) => ({
  category: one(configCategories, {
    fields: [configOptions.categoryId],
    references: [configCategories.id],
  }),
  parent: one(configOptions, {
    fields: [configOptions.parentOptionId],
    references: [configOptions.id],
    relationName: 'parent_child',
  }),
  children: many(configOptions, {
    relationName: 'parent_child',
  }),
  company: one(companies, {
    fields: [configOptions.companyId],
    references: [companies.id],
  }),
  createdByUser: one(users, {
    fields: [configOptions.createdBy],
    references: [users.id],
  }),
}))

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}))

// Type exports
export type ConfigCategory = typeof configCategories.$inferSelect
export type NewConfigCategory = typeof configCategories.$inferInsert
export type ConfigOption = typeof configOptions.$inferSelect
export type NewConfigOption = typeof configOptions.$inferInsert
export type ConfigSetting = typeof configSettings.$inferSelect
export type NewConfigSetting = typeof configSettings.$inferInsert
export type ConfigAuditLogEntry = typeof configAuditLog.$inferSelect
export type ActivityLog = typeof activityLogs.$inferSelect
export type NewActivityLog = typeof activityLogs.$inferInsert
```

**Step 3: Update schema index**

Add to `src/server/db/schema/index.ts`:

```typescript
export * from './jobs'
export * from './config'
```

**Step 4: Run all tests to verify no regressions**

Run: `pnpm test`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/server/db/schema/
git commit -m "feat: add jobs and config schema for background processing and admin settings"
```

---

### Task 14: Generate and Apply Database Migration

**Files:**
- Generated migration files in `drizzle/` folder

**Step 1: Generate migration**

Run:
```bash
cd client-updater-version-2 && pnpm db:generate
```

Expected: Migration files generated in `drizzle/` folder

**Step 2: Review generated SQL**

Read the generated migration file to ensure all tables are correct.

**Step 3: Apply migration to database**

Run:
```bash
pnpm db:push
```

Expected: Schema applied to database

**Step 4: Verify with Drizzle Studio**

Run:
```bash
pnpm db:studio
```

Expected: All tables visible in Drizzle Studio

**Step 5: Commit**

```bash
git add drizzle/
git commit -m "chore: add database migration for Phase 0-1 schema"
```

---

### Task 15: Create Database Seed Script

**Files:**
- Create: `src/server/db/seed/index.ts`
- Create: `src/server/db/seed/lookups.ts`
- Create: `src/server/db/seed/permissions.ts`

**Step 1: Create lookups seed data**

Create: `src/server/db/seed/lookups.ts`

```typescript
import { db } from '@/server/db'
import { companies, pensionTypes, pensionerTypes, accountTypes, parStatuses, statusTypes, statusReasons, products } from '@/server/db/schema'

export async function seedLookups() {
  console.log('Seeding lookup tables...')

  // Companies
  const [fcash, pcni] = await db.insert(companies).values([
    { code: 'FCASH', name: 'FCASH', isSystem: true },
    { code: 'PCNI', name: 'PCNI', isSystem: true },
  ]).returning()

  console.log('  - Companies seeded')

  // Pension Types
  const pensionTypesData = [
    { code: 'SSS', name: 'SSS', companyId: fcash.id, isSystem: true },
    { code: 'GSIS', name: 'GSIS', companyId: fcash.id, isSystem: true },
    { code: 'PVAO', name: 'PVAO', companyId: fcash.id, isSystem: true },
    { code: 'NON_PNP', name: 'Non-PNP', companyId: pcni.id, isSystem: true },
    { code: 'PNP', name: 'PNP', companyId: pcni.id, isSystem: true },
  ]
  await db.insert(pensionTypes).values(pensionTypesData)
  console.log('  - Pension Types seeded')

  // Pensioner Types
  const pensionerTypesData = [
    { code: 'DEPENDENT', name: 'Dependent', isSystem: true },
    { code: 'DISABILITY', name: 'Disability', isSystem: true },
    { code: 'RETIREE', name: 'Retiree', isSystem: true },
    { code: 'ITF', name: 'ITF', isSystem: true },
  ]
  await db.insert(pensionerTypes).values(pensionerTypesData)
  console.log('  - Pensioner Types seeded')

  // Account Types
  const accountTypesData = [
    { code: 'PASSBOOK', name: 'Passbook', isSystem: true, sortOrder: 1 },
    { code: 'ATM', name: 'ATM', isSystem: true, sortOrder: 2 },
    { code: 'BOTH', name: 'Both', isSystem: true, sortOrder: 3 },
    { code: 'NONE', name: 'None', isSystem: true, sortOrder: 4 },
  ]
  await db.insert(accountTypes).values(accountTypesData)
  console.log('  - Account Types seeded')

  // PAR Statuses
  const parStatusesData = [
    { code: 'do_not_show', name: 'Current', isTrackable: true, isSystem: true, sortOrder: 1 },
    { code: 'tele_130', name: '30+ Days', isTrackable: true, isSystem: true, sortOrder: 2 },
    { code: 'tele_hardcore', name: '60+ Days', isTrackable: false, isSystem: true, sortOrder: 3 },
  ]
  await db.insert(parStatuses).values(parStatusesData)
  console.log('  - PAR Statuses seeded')

  // Status Types
  const statusTypesData = [
    { code: 'PENDING', name: 'Pending', sequence: 1, isSystem: true },
    { code: 'TO_FOLLOW', name: 'To Follow', sequence: 2, isSystem: true },
    { code: 'CALLED', name: 'Called', sequence: 3, isSystem: true },
    { code: 'VISITED', name: 'Visited', sequence: 4, companyId: fcash.id, isSystem: true },
    { code: 'UPDATED', name: 'Updated', sequence: 5, isSystem: true },
    { code: 'DONE', name: 'Done', sequence: 6, isSystem: true },
  ]
  const insertedStatusTypes = await db.insert(statusTypes).values(statusTypesData).returning()
  console.log('  - Status Types seeded')

  // Status Reasons
  const doneStatus = insertedStatusTypes.find(s => s.code === 'DONE')!
  const statusReasonsData = [
    { code: 'DECEASED', name: 'Deceased', statusTypeId: doneStatus.id, isTerminal: true, isSystem: true },
    { code: 'FULLY_PAID', name: 'Fully Paid', statusTypeId: doneStatus.id, isTerminal: true, isSystem: true },
    { code: 'CONFIRMED', name: 'Confirmed', statusTypeId: doneStatus.id, isTerminal: false, isSystem: true },
    { code: 'NOT_REACHABLE', name: 'Not Reachable', statusTypeId: doneStatus.id, requiresRemarks: true, isSystem: true },
  ]
  await db.insert(statusReasons).values(statusReasonsData)
  console.log('  - Status Reasons seeded')

  // Products
  const productsData = [
    { code: 'FCASH_SSS', name: 'FCASH SSS', companyId: fcash.id, trackingCycle: 'monthly' as const, isSystem: true },
    { code: 'FCASH_GSIS', name: 'FCASH GSIS', companyId: fcash.id, trackingCycle: 'monthly' as const, isSystem: true },
    { code: 'PCNI_NON_PNP', name: 'PCNI Non-PNP', companyId: pcni.id, trackingCycle: 'monthly' as const, isSystem: true },
    { code: 'PCNI_PNP', name: 'PCNI PNP', companyId: pcni.id, trackingCycle: 'quarterly' as const, isSystem: true },
  ]
  await db.insert(products).values(productsData)
  console.log('  - Products seeded')

  console.log('Lookup tables seeded successfully!')
}
```

**Step 2: Create permissions seed data**

Create: `src/server/db/seed/permissions.ts`

```typescript
import { db } from '@/server/db'
import { permissions } from '@/server/db/schema'

const PERMISSIONS = [
  // Clients
  { code: 'clients:read', resource: 'clients', action: 'read', description: 'View client list and details' },
  { code: 'clients:update', resource: 'clients', action: 'update', description: 'Update client information' },

  // Status
  { code: 'status:read', resource: 'status', action: 'read', description: 'View client status' },
  { code: 'status:update', resource: 'status', action: 'update', description: 'Update client status' },
  { code: 'status:history:read', resource: 'status', action: 'history:read', description: 'View status history' },

  // Reports
  { code: 'reports:read', resource: 'reports', action: 'read', description: 'View reports' },
  { code: 'reports:export', resource: 'reports', action: 'export', description: 'Export reports' },

  // Users
  { code: 'users:read', resource: 'users', action: 'read', description: 'View user list' },
  { code: 'users:manage', resource: 'users', action: 'manage', description: 'Create/update/delete users' },

  // Branches
  { code: 'branches:read', resource: 'branches', action: 'read', description: 'View branches' },
  { code: 'branches:manage', resource: 'branches', action: 'manage', description: 'Manage branches' },

  // Areas
  { code: 'areas:read', resource: 'areas', action: 'read', description: 'View areas' },
  { code: 'areas:manage', resource: 'areas', action: 'manage', description: 'Manage areas' },

  // Config
  { code: 'config:read', resource: 'config', action: 'read', description: 'View configuration' },
  { code: 'config:manage', resource: 'config', action: 'manage', description: 'Manage configuration' },

  // Sync
  { code: 'sync:read', resource: 'sync', action: 'read', description: 'View sync status' },
  { code: 'sync:execute', resource: 'sync', action: 'execute', description: 'Trigger sync jobs' },
]

export async function seedPermissions() {
  console.log('Seeding permissions...')

  await db.insert(permissions).values(PERMISSIONS).onConflictDoNothing()

  console.log(`  - ${PERMISSIONS.length} permissions seeded`)
  console.log('Permissions seeded successfully!')
}
```

**Step 3: Create main seed script**

Create: `src/server/db/seed/index.ts`

```typescript
import { seedLookups } from './lookups'
import { seedPermissions } from './permissions'

async function main() {
  console.log('Starting database seed...\n')

  try {
    await seedLookups()
    console.log('')
    await seedPermissions()

    console.log('\n✅ Database seeded successfully!')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Seed failed:', error)
    process.exit(1)
  }
}

main()
```

**Step 4: Add seed script to package.json**

Add to scripts in `package.json`:

```json
"db:seed": "tsx src/server/db/seed/index.ts"
```

**Step 5: Run the seed script**

Run:
```bash
pnpm db:seed
```

Expected: All lookup tables populated with initial data

**Step 6: Commit**

```bash
git add src/server/db/seed/ package.json
git commit -m "feat: add database seed scripts for lookups and permissions"
```

---

## Summary

This plan covers:

**Phase 0: Infrastructure (Tasks 1-8)**
- Upstash Redis packages
- Environment variables for infrastructure
- Cache service with TTL management
- Rate limiting middleware
- Circuit breaker for external services
- JSON logger
- API middleware integration
- System health endpoint

**Phase 1: Foundation (Tasks 9-15)**
- Lookup tables schema
- Organization schema (areas, branches)
- Extended users schema with permissions
- Clients schema with status tracking
- Jobs and config schema
- Database migration
- Seed scripts

**Total: 15 tasks**

---

## Execution Handoff

**Plan complete and saved to `docs/plans/2026-01-05-phase-0-1-implementation.md`.**

Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
