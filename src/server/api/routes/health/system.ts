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



