import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { getConfigAuditLog } from '@/server/db/queries/config'
import { hasPermission } from '@/lib/permissions'
import { rateLimitMiddleware } from '@/server/api/middleware/rate-limit'
import { logger } from '@/lib/logger'

export const configAuditRoutes = new Hono()

// Validation schemas
const auditLogQuerySchema = z.object({
  tableName: z.string().optional(),
  recordId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
})

/**
 * GET /api/admin/config/audit-log
 * Get audit log with filters
 */
configAuditRoutes.get(
  '/audit-log',
  rateLimitMiddleware('read'),
  zValidator('query', auditLogQuerySchema),
  async (c) => {
    const userId = c.get('userId') as string
    const orgId = c.get('orgId') as string
    const { tableName, recordId, limit } = c.req.valid('query')

    try {
      // Check permission
      const hasReadPermission = await hasPermission(userId, orgId, 'config', 'read')
      if (!hasReadPermission) {
        logger.warn('User does not have config:read permission', {
          action: 'get_config_audit_log',
          userId,
          orgId,
        })

        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to view configuration',
            },
          },
          403
        )
      }

      const auditLog = await getConfigAuditLog({
        tableName,
        recordId,
        limit,
      })

      logger.info('Retrieved config audit log', {
        action: 'get_config_audit_log',
        userId,
        orgId,
        count: auditLog.length,
        filters: { tableName, recordId, limit },
      })

      return c.json({
        success: true,
        data: auditLog,
      })
    } catch (error) {
      logger.error('Failed to retrieve config audit log', error as Error, {
        action: 'get_config_audit_log',
        userId,
        orgId,
        filters: { tableName, recordId, limit },
      })

      return c.json(
        {
          success: false,
          error: {
            message: error instanceof Error ? error.message : 'Failed to retrieve config audit log',
          },
        },
        500
      )
    }
  }
)
