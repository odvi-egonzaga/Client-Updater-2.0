import { Hono } from 'hono'
import { clerkHealthRoutes } from './clerk'
import { databaseHealthRoutes } from './database'
import { storageHealthRoutes } from './storage'
import { edgeFunctionsHealthRoutes } from './edge-functions'
import { snowflakeHealthRoutes } from './snowflake'
import { nextbankHealthRoutes } from './nextbank'
import { synologyHealthRoutes } from './synology'
import { frameworkHealthRoutes } from './framework'
import { awsS3HealthRoutes } from './aws-s3'
import { systemHealthRoute } from './system'

export const healthRoutes = new Hono()

healthRoutes.route('/system', systemHealthRoute)
healthRoutes.route('/clerk', clerkHealthRoutes)
healthRoutes.route('/database', databaseHealthRoutes)
healthRoutes.route('/storage', storageHealthRoutes)
healthRoutes.route('/edge', edgeFunctionsHealthRoutes)
healthRoutes.route('/snowflake', snowflakeHealthRoutes)
healthRoutes.route('/nextbank', nextbankHealthRoutes)
healthRoutes.route('/synology', synologyHealthRoutes)
healthRoutes.route('/framework', frameworkHealthRoutes)
healthRoutes.route('/aws-s3', awsS3HealthRoutes)

healthRoutes.get('/all', async (c) => {
  const start = performance.now()
  const baseUrl = new URL(c.req.url).origin

  // Define all health check endpoints to call
  const checks = [
    { name: 'Clerk User', url: `${baseUrl}/api/health/clerk/user` },
    { name: 'Clerk Org', url: `${baseUrl}/api/health/clerk/org` },
    { name: 'Clerk Members', url: `${baseUrl}/api/health/clerk/members` },
    { name: 'Database Write', url: `${baseUrl}/api/health/database/write`, method: 'POST' as const },
    { name: 'Database Read', url: `${baseUrl}/api/health/database/read` },
    { name: 'Database Delete', url: `${baseUrl}/api/health/database/delete`, method: 'DELETE' as const },
    { name: 'Storage Upload', url: `${baseUrl}/api/health/storage/upload`, method: 'POST' as const },
    { name: 'Storage Download', url: `${baseUrl}/api/health/storage/download` },
    { name: 'Storage Delete', url: `${baseUrl}/api/health/storage/delete`, method: 'DELETE' as const },
    { name: 'Edge Ping', url: `${baseUrl}/api/health/edge/ping` },
    { name: 'Edge Auth', url: `${baseUrl}/api/health/edge/auth` },
    { name: 'Snowflake Connect', url: `${baseUrl}/api/health/snowflake/connect` },
    { name: 'Snowflake Query', url: `${baseUrl}/api/health/snowflake/query` },
    { name: 'NextBank Ping', url: `${baseUrl}/api/health/nextbank/ping` },
    { name: 'NextBank Auth', url: `${baseUrl}/api/health/nextbank/auth` },
    { name: 'Synology Ping', url: `${baseUrl}/api/health/synology/ping` },
    { name: 'Synology Auth', url: `${baseUrl}/api/health/synology/auth` },
    { name: 'AWS S3 Connect', url: `${baseUrl}/api/health/aws-s3/connect` },
  ]

  // Run all checks in parallel
  const results = await Promise.allSettled(
    checks.map(async (check) => {
      const checkStart = performance.now()
      try {
        const response = await fetch(check.url, {
          method: check.method ?? 'GET',
          headers: {
            'Content-Type': 'application/json',
            // Forward auth header if present
            ...(c.req.header('authorization') && {
              authorization: c.req.header('authorization')!,
            }),
          },
        })

        const data = await response.json()

        return {
          name: check.name,
          status: response.ok ? data.status ?? 'healthy' : 'error',
          responseTimeMs: Math.round(performance.now() - checkStart),
          httpStatus: response.status,
          data,
        }
      } catch (error) {
        return {
          name: check.name,
          status: 'error',
          responseTimeMs: Math.round(performance.now() - checkStart),
          httpStatus: 500,
          error: error instanceof Error ? error.message : 'Check failed',
        }
      }
    })
  )

  // Aggregate results by service
  const services = {
    clerk: results.filter((r) => r.status === 'fulfilled' && r.value.name.includes('Clerk')),
    database: results.filter((r) => r.status === 'fulfilled' && r.value.name.includes('Database')),
    storage: results.filter((r) => r.status === 'fulfilled' && r.value.name.includes('Storage')),
    edge: results.filter((r) => r.status === 'fulfilled' && r.value.name.includes('Edge')),
    snowflake: results.filter((r) => r.status === 'fulfilled' && r.value.name.includes('Snowflake')),
    nextbank: results.filter((r) => r.status === 'fulfilled' && r.value.name.includes('NextBank')),
    awsS3: results.filter((r) => r.status === 'fulfilled' && r.value.name.includes('AWS S3')),
  }

  // Determine overall status
  const allResults = results.map((r) => (r.status === 'fulfilled' ? r.value : null))
  const hasErrors = allResults.some((r) => r && (r.status === 'error' || r.httpStatus >= 400))
  const allHealthy = allResults.every((r) => r?.status === 'healthy')

  return c.json({
    status: hasErrors ? 'unhealthy' : allHealthy ? 'healthy' : 'partial',
    responseTimeMs: Math.round(performance.now() - start),
    timestamp: new Date().toISOString(),
    services: services,
    checks: allResults,
  })
})
