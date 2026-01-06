import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '@/server/db'
import { getDashboardSummary } from '@/server/db/queries/status'
import { getUserBranchFilter } from '@/lib/territories/filter'
import { hasPermission } from '@/lib/permissions'
import { rateLimitMiddleware } from '@/server/api/middleware/rate-limit'
import { logger } from '@/lib/logger'
import { validateRequest } from '@/server/api/middleware/validation'

export const statusSummaryRoutes = new Hono()

// Validation schema for query parameters
const summaryQuerySchema = z.object({
  companyId: z.string().min(1, 'Company ID is required'),
  periodYear: z.coerce.number().int().min(2000).max(2100),
  periodMonth: z.coerce.number().int().min(1).max(12).optional(),
  periodQuarter: z.coerce.number().int().min(1).max(4).optional(),
})

/**
 * GET /api/status/summary
 * Get dashboard summary counts by status and pension type
 */
statusSummaryRoutes.get(
  '/',
  rateLimitMiddleware('read'),
  validateRequest('query', summaryQuerySchema),
  async (c) => {
    const start = performance.now()
    const userId = (c as any).get('userId') as string
    const orgId = (c as any).get('orgId') as string
    const { companyId, periodYear, periodMonth, periodQuarter } = (c as any).get('validated_query')

    try {
      // Check permission
      const hasReadPermission = await hasPermission(userId, orgId, 'status', 'read')
      if (!hasReadPermission) {
        logger.warn('User does not have status:read permission', {
          action: 'get_status_summary',
          userId,
          orgId,
        })

        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to view status summary',
            },
          },
          403
        )
      }

      // Get user's branch filter for territory access
      const branchFilter = await getUserBranchFilter(userId, orgId)

      // Get dashboard summary
      const summary = await getDashboardSummary(
        db,
        companyId,
        periodYear,
        periodMonth,
        periodQuarter
      )

      // Transform status counts to the expected format
      const statusCountsMap: Record<string, number> = {}
      summary.statusCounts.forEach((count) => {
        statusCountsMap[count.statusTypeName] = count.count
      })

      // Build response
      const response = {
        totalClients: summary.totalClients,
        statusCounts: {
          PENDING: statusCountsMap['PENDING'] || 0,
          TO_FOLLOW: statusCountsMap['TO_FOLLOW'] || 0,
          CALLED: statusCountsMap['CALLED'] || 0,
          VISITED: statusCountsMap['VISITED'] || 0,
          UPDATED: statusCountsMap['UPDATED'] || 0,
          DONE: statusCountsMap['DONE'] || 0,
        },
        paymentCount: summary.paymentCount,
        terminalCount: summary.terminalCount,
        byPensionType: {
          SSS: 0, // TODO: Implement pension type breakdown
          GSIS: 0,
          PAGIBIG: 0,
        },
      }

      logger.info('Retrieved status summary', {
        action: 'get_status_summary',
        userId,
        orgId,
        companyId,
        periodYear,
        periodMonth,
        periodQuarter,
        duration: performance.now() - start,
      })

      return c.json({
        success: true,
        data: response,
        meta: {
          companyId,
          periodYear,
          periodMonth,
          periodQuarter,
        },
      })
    } catch (error) {
      logger.error('Failed to retrieve status summary', error as Error, {
        action: 'get_status_summary',
        userId,
        orgId,
        companyId,
        periodYear,
        periodMonth,
        periodQuarter,
      })

      return c.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to retrieve status summary',
            details: error instanceof Error ? error.message : undefined,
          },
        },
        500
      )
    }
  }
)
