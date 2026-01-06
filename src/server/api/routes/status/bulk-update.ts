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
import { users, clients, products } from '@/server/db/schema'
import { eq, and } from 'drizzle-orm'

export const statusBulkUpdateRoutes = new Hono()

// Validation schema for single status update
const singleUpdateSchema = z.object({
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

// Validation schema for bulk update request body
const bulkUpdateBodySchema = z.object({
  updates: z.array(singleUpdateSchema).min(1, 'At least one update is required').max(100, 'Maximum 100 updates per request'),
})

/**
 * POST /api/status/bulk-update
 * Bulk update multiple clients' status
 */
statusBulkUpdateRoutes.post(
  '/bulk-update',
  rateLimitMiddleware('write'),
  zValidator('json', bulkUpdateBodySchema),
  async (c) => {
    const start = performance.now()
    const userId = c.get('userId') as string
    const orgId = c.get('orgId') as string
    const { updates } = c.req.valid('json')

    try {
      // Check permission
      const hasBulkUpdatePermission = await hasPermission(userId, orgId, 'status', 'bulk_update')
      if (!hasBulkUpdatePermission) {
        logger.warn('User does not have status:bulk_update permission', {
          action: 'bulk_update_status',
          userId,
          orgId,
        })

        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to bulk update client status',
            },
          },
          403
        )
      }

      // Get user's branch filter for territory access
      const branchFilter = await getUserBranchFilter(userId, orgId)

      // If user has no access, return all failed
      if (branchFilter.scope === 'none') {
        const results = updates.map((update) => ({
          clientId: update.clientId,
          success: false,
          error: 'You do not have permission to access this client',
        }))

        return c.json({
          success: true,
          data: {
            successful: 0,
            failed: updates.length,
            results,
          },
        })
      }

      // Process updates
      const results = []
      let successful = 0
      let failed = 0

      for (const update of updates) {
        try {
          // Get client to verify territory access
          const client = await db
            .select({
              id: clients.id,
              branchId: clients.branchId,
              productId: clients.productId,
            })
            .from(clients)
            .where(eq(clients.id, update.clientId))
            .limit(1)

          if (!client[0]) {
            results.push({
              clientId: update.clientId,
              success: false,
              error: 'Client not found',
            })
            failed++
            continue
          }

          // Check if user can access this client's branch
          if (branchFilter.scope === 'territory' && !branchFilter.branchIds.includes(client[0].branchId)) {
            results.push({
              clientId: update.clientId,
              success: false,
              error: 'You do not have permission to access this client',
            })
            failed++
            continue
          }

          // Get company ID for validation
          const product = await db
            .select({ companyId: products.companyId })
            .from(products)
            .where(eq(products.id, client[0].productId))
            .limit(1)

          if (!product[0]) {
            results.push({
              clientId: update.clientId,
              success: false,
              error: 'Product not found',
            })
            failed++
            continue
          }

          const companyId = product[0].companyId

          // Get current status
          const currentStatus = await getClientCurrentStatus(
            db,
            update.clientId,
            update.periodType,
            update.periodYear,
            update.periodMonth,
            update.periodQuarter
          )

          // Validate status update
          const validationResult = await validateStatusUpdate({
            clientPeriodStatusId: currentStatus?.id || '',
            fromStatusId: currentStatus?.statusTypeId,
            toStatusId: update.statusId,
            reasonId: update.reasonId,
            remarks: update.remarks,
            companyId,
            updatedBy: userId,
          })

          if (!validationResult.isValid) {
            results.push({
              clientId: update.clientId,
              success: false,
              error: validationResult.error?.message || 'Validation failed',
            })
            failed++
            continue
          }

          let clientPeriodStatusId: string

          // Create or update period status
          if (currentStatus) {
            // Update existing status
            const updated = await updateClientPeriodStatus(db, currentStatus.id, {
              statusTypeId: update.statusId,
              reasonId: update.reasonId,
              remarks: update.remarks,
              hasPayment: update.hasPayment,
              updateCount: (currentStatus.updateCount || 0) + 1,
              isTerminal: await isTerminalStatus(update.statusId),
              updatedBy: userId,
            })

            if (!updated) {
              results.push({
                clientId: update.clientId,
                success: false,
                error: 'Failed to update client status',
              })
              failed++
              continue
            }

            clientPeriodStatusId = updated.id
          } else {
            // Create new period status
            const created = await createClientPeriodStatus(db, {
              clientId: update.clientId,
              periodType: update.periodType,
              periodYear: update.periodYear,
              periodMonth: update.periodMonth,
              periodQuarter: update.periodQuarter,
              statusTypeId: update.statusId,
              reasonId: update.reasonId,
              remarks: update.remarks,
              hasPayment: update.hasPayment,
              updateCount: 1,
              isTerminal: await isTerminalStatus(update.statusId),
              updatedBy: userId,
            })

            clientPeriodStatusId = created.id
          }

          // Record status event
          await recordStatusEvent(db, {
            clientPeriodStatusId,
            statusTypeId: update.statusId,
            reasonId: update.reasonId,
            remarks: update.remarks,
            hasPayment: update.hasPayment,
            createdBy: userId,
          })

          results.push({
            clientId: update.clientId,
            success: true,
            error: null,
          })
          successful++
        } catch (error) {
          logger.error('Failed to update client status in bulk operation', error as Error, {
            action: 'bulk_update_status',
            userId,
            orgId,
            clientId: update.clientId,
          })

          results.push({
            clientId: update.clientId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
          failed++
        }
      }

      logger.info('Bulk updated client status', {
        action: 'bulk_update_status',
        userId,
        orgId,
        total: updates.length,
        successful,
        failed,
        duration: performance.now() - start,
      })

      return c.json({
        success: true,
        data: {
          successful,
          failed,
          results,
        },
      })
    } catch (error) {
      logger.error('Failed to bulk update client status', error as Error, {
        action: 'bulk_update_status',
        userId,
        orgId,
      })

      return c.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to bulk update client status',
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
