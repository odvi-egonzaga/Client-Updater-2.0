import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '@/server/db'
import {
  getClientCurrentStatus,
  getClientStatusHistory,
} from '@/server/db/queries/status'
import { getUserBranchFilter } from '@/lib/territories/filter'
import { hasPermission } from '@/lib/permissions'
import { rateLimitMiddleware } from '@/server/api/middleware/rate-limit'
import { logger } from '@/lib/logger'
import { users } from '@/server/db/schema/users'
import { eq, inArray } from 'drizzle-orm'

export const clientStatusRoutes = new Hono()

// Validation schema for client status query parameters
const clientStatusQuerySchema = z.object({
  periodType: z.enum(['monthly', 'quarterly']),
  periodYear: z.coerce.number().int().min(2000).max(2100),
  periodMonth: z.coerce.number().int().min(1).max(12).optional(),
  periodQuarter: z.coerce.number().int().min(1).max(4).optional(),
})

// Validation schema for history query parameters
const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
})

/**
 * GET /api/status/:clientId
 * Get client status for specific period
 */
clientStatusRoutes.get(
  '/:clientId',
  rateLimitMiddleware('read'),
  zValidator('param', z.object({ clientId: z.string() })),
  zValidator('query', clientStatusQuerySchema),
  async (c) => {
    const start = performance.now()
    const userId = c.get('userId') as string
    const orgId = c.get('orgId') as string
    const { clientId } = c.req.valid('param')
    const { periodType, periodYear, periodMonth, periodQuarter } = c.req.valid('query')

    try {
      // Check permission
      const hasReadPermission = await hasPermission(userId, orgId, 'status', 'read')
      if (!hasReadPermission) {
        logger.warn('User does not have status:read permission', {
          action: 'get_client_status',
          userId,
          orgId,
          clientId,
        })

        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to view client status',
            },
          },
          403
        )
      }

      // Get client status
      const status = await getClientCurrentStatus(
        db,
        clientId,
        periodType,
        periodYear,
        periodMonth,
        periodQuarter
      )

      if (!status) {
        return c.json(
          {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Client status not found for the specified period',
            },
          },
          404
        )
      }

      // Get user info for updatedBy
      let updatedBy = null
      if (status.updatedBy) {
        const user = await db
          .select({
            id: users.id,
            name: db.raw(`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.email}) as name`),
          })
          .from(users)
          .where(eq(users.id, status.updatedBy))
          .limit(1)

        if (user[0]) {
          updatedBy = {
            id: user[0].id,
            name: user[0].name,
          }
        }
      }

      // Build response
      const response = {
        id: status.id,
        clientId: status.clientId,
        periodType: status.periodType,
        periodYear: status.periodYear,
        periodMonth: status.periodMonth,
        periodQuarter: status.periodQuarter,
        status: {
          id: status.statusTypeId,
          name: status.statusTypeName,
          code: status.statusTypeName, // Using name as code for now
        },
        reason: status.reasonId
          ? {
              id: status.reasonId,
              name: status.reasonName,
              code: status.reasonName, // Using name as code for now
            }
          : null,
        remarks: status.remarks,
        hasPayment: status.hasPayment,
        updateCount: status.updateCount,
        isTerminal: status.isTerminal,
        updatedBy,
        updatedAt: status.updatedAt,
      }

      logger.info('Retrieved client status', {
        action: 'get_client_status',
        userId,
        orgId,
        clientId,
        periodType,
        periodYear,
        periodMonth,
        periodQuarter,
        duration: performance.now() - start,
      })

      return c.json({
        success: true,
        data: response,
      })
    } catch (error) {
      logger.error('Failed to retrieve client status', error as Error, {
        action: 'get_client_status',
        userId,
        orgId,
        clientId,
        periodType,
        periodYear,
        periodMonth,
        periodQuarter,
      })

      return c.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to retrieve client status',
            details: error instanceof Error ? error.message : undefined,
          },
        },
        500
      )
    }
  }
)

/**
 * GET /api/status/:clientId/history
 * Get status change history for a client
 */
clientStatusRoutes.get(
  '/:clientId/history',
  rateLimitMiddleware('read'),
  zValidator('param', z.object({ clientId: z.string() })),
  zValidator('query', historyQuerySchema),
  async (c) => {
    const start = performance.now()
    const userId = c.get('userId') as string
    const orgId = c.get('orgId') as string
    const { clientId } = c.req.valid('param')
    const { limit } = c.req.valid('query')

    try {
      // Check permission
      const hasReadPermission = await hasPermission(userId, orgId, 'status', 'read')
      if (!hasReadPermission) {
        logger.warn('User does not have status:read permission', {
          action: 'get_client_status_history',
          userId,
          orgId,
          clientId,
        })

        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to view client status history',
            },
          },
          403
        )
      }

      // Get status history
      const history = await getClientStatusHistory(db, clientId, limit)

      // Get user info for createdBy
      const userIds = [...new Set(history.map((h) => h.createdBy).filter(Boolean))]
      const usersMap = new Map<string, { id: string; name: string }>()

      if (userIds.length > 0) {
        const usersData = await db
          .select({
            id: users.id,
            name: db.raw(`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.email}) as name`),
          })
          .from(users)
          .where(inArray(users.id, userIds))

        usersData.forEach((user) => {
          usersMap.set(user.id, { id: user.id, name: user.name })
        })
      }

      // Build response
      const response = history.map((event) => ({
        id: event.id,
        eventSequence: event.eventSequence,
        status: {
          id: event.statusTypeId,
          name: event.statusTypeName,
          code: event.statusTypeName, // Using name as code for now
        },
        reason: event.reasonId
          ? {
              id: event.reasonId,
              name: event.reasonName,
              code: event.reasonName, // Using name as code for now
            }
          : null,
        remarks: event.remarks,
        hasPayment: event.hasPayment,
        createdBy: usersMap.get(event.createdBy) || {
          id: event.createdBy,
          name: 'Unknown',
        },
        createdAt: event.createdAt,
      }))

      logger.info('Retrieved client status history', {
        action: 'get_client_status_history',
        userId,
        orgId,
        clientId,
        count: response.length,
        limit,
        duration: performance.now() - start,
      })

      return c.json({
        success: true,
        data: response,
        meta: {
          total: response.length,
          limit,
        },
      })
    } catch (error) {
      logger.error('Failed to retrieve client status history', error as Error, {
        action: 'get_client_status_history',
        userId,
        orgId,
        clientId,
        limit,
      })

      return c.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to retrieve client status history',
            details: error instanceof Error ? error.message : undefined,
          },
        },
        500
      )
    }
  }
)
