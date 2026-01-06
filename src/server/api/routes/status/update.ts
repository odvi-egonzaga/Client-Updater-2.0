import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '@/server/db'
import {
  getClientCurrentStatus,
  updateClientPeriodStatus,
  recordStatusEvent,
  createClientPeriodStatus,
} from '@/server/db/queries/status'
import { getUserBranchFilter } from '@/lib/territories/filter'
import { hasPermission } from '@/lib/permissions'
import { validateStatusUpdate } from '@/lib/status/validation'
import { rateLimitMiddleware } from '@/server/api/middleware/rate-limit'
import { logger } from '@/lib/logger'
import { users, clients, products, companies } from '@/server/db/schema'
import { eq, and } from 'drizzle-orm'

export const statusUpdateRoutes = new Hono()

// Validation schema for status update request body
const updateBodySchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  periodType: z.enum(['monthly', 'quarterly']),
  periodYear: z.coerce.number().int().min(2000).max(2100),
  periodMonth: z.coerce.number().int().min(1).max(12).nullable().optional(),
  periodQuarter: z.coerce.number().int().min(1).max(4).nullable().optional(),
  statusId: z.string().min(1, 'Status ID is required'),
  reasonId: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
  hasPayment: z.boolean().default(false),
})

/**
 * POST /api/status/update
 * Update single client status
 */
statusUpdateRoutes.post(
  '/update',
  rateLimitMiddleware('write'),
  zValidator('json', updateBodySchema),
  async (c) => {
    const start = performance.now()
    const userId = c.get('userId') as string
    const orgId = c.get('orgId') as string
    const body = c.req.valid('json')

    try {
      // Check permission
      const hasUpdatePermission = await hasPermission(userId, orgId, 'status', 'update')
      if (!hasUpdatePermission) {
        logger.warn('User does not have status:update permission', {
          action: 'update_status',
          userId,
          orgId,
          clientId: body.clientId,
        })

        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to update client status',
            },
          },
          403
        )
      }

      // Get user's branch filter for territory access
      const branchFilter = await getUserBranchFilter(userId, orgId)

      // Get client to verify territory access
      const client = await db
        .select({
          id: clients.id,
          branchId: clients.branchId,
          productId: clients.productId,
        })
        .from(clients)
        .where(eq(clients.id, body.clientId))
        .limit(1)

      if (!client[0]) {
        return c.json(
          {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Client not found',
            },
          },
          404
        )
      }

      // Check if user can access this client's branch
      if (branchFilter.scope === 'none') {
        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to access this client',
            },
          },
          403
        )
      }

      if (branchFilter.scope === 'territory' && !branchFilter.branchIds.includes(client[0].branchId)) {
        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to access this client',
            },
          },
          403
        )
      }

      // Get company ID for validation
      const product = await db
        .select({ companyId: products.companyId })
        .from(products)
        .where(eq(products.id, client[0].productId))
        .limit(1)

      if (!product[0]) {
        return c.json(
          {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Product not found',
            },
          },
          404
        )
      }

      const companyId = product[0].companyId

      // Get current status
      const currentStatus = await getClientCurrentStatus(
        db,
        body.clientId,
        body.periodType,
        body.periodYear,
        body.periodMonth,
        body.periodQuarter
      )

      // Validate status update
      const validationResult = await validateStatusUpdate({
        clientPeriodStatusId: currentStatus?.id || '',
        fromStatusId: currentStatus?.statusTypeId,
        toStatusId: body.statusId,
        reasonId: body.reasonId,
        remarks: body.remarks,
        companyId,
        updatedBy: userId,
      })

      if (!validationResult.isValid) {
        return c.json(
          {
            success: false,
            error: {
              code: validationResult.error?.code || 'VALIDATION_ERROR',
              message: validationResult.error?.message || 'Validation failed',
              details: validationResult.error?.details,
            },
          },
          400
        )
      }

      let clientPeriodStatusId: string

      // Create or update period status
      if (currentStatus) {
        // Update existing status
        const updated = await updateClientPeriodStatus(db, currentStatus.id, {
          statusTypeId: body.statusId,
          reasonId: body.reasonId,
          remarks: body.remarks,
          hasPayment: body.hasPayment,
          updateCount: (currentStatus.updateCount || 0) + 1,
          isTerminal: await isTerminalStatus(body.statusId),
          updatedBy: userId,
        })

        if (!updated) {
          return c.json(
            {
              success: false,
              error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to update client status',
              },
            },
            500
          )
        }

        clientPeriodStatusId = updated.id
      } else {
        // Create new period status
        const created = await createClientPeriodStatus(db, {
          clientId: body.clientId,
          periodType: body.periodType,
          periodYear: body.periodYear,
          periodMonth: body.periodMonth,
          periodQuarter: body.periodQuarter,
          statusTypeId: body.statusId,
          reasonId: body.reasonId,
          remarks: body.remarks,
          hasPayment: body.hasPayment,
          updateCount: 1,
          isTerminal: await isTerminalStatus(body.statusId),
          updatedBy: userId,
        })

        clientPeriodStatusId = created.id
      }

      // Record status event
      const event = await recordStatusEvent(db, {
        clientPeriodStatusId,
        statusTypeId: body.statusId,
        reasonId: body.reasonId,
        remarks: body.remarks,
        hasPayment: body.hasPayment,
        createdBy: userId,
      })

      logger.info('Updated client status', {
        action: 'update_status',
        userId,
        orgId,
        clientId: body.clientId,
        statusId: body.statusId,
        duration: performance.now() - start,
      })

      return c.json({
        success: true,
        data: {
          status: {
            id: clientPeriodStatusId,
            clientId: body.clientId,
            statusId: body.statusId,
          },
          event: {
            id: event.id,
            eventSequence: event.eventSequence,
          },
        },
      })
    } catch (error) {
      logger.error('Failed to update client status', error as Error, {
        action: 'update_status',
        userId,
        orgId,
        clientId: body.clientId,
      })

      return c.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to update client status',
            details: error instanceof Error ? error.message : undefined,
          },
        },
        500
      )
    }
  }
)

// Helper function to check if status is terminal
async function isTerminalStatus(statusId: string): Promise<boolean> {
  const { isTerminalStatus } = await import('@/lib/status/validation')
  return isTerminalStatus(statusId)
}
