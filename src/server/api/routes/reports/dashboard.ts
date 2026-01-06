/**
 * Dashboard reports API routes
 */

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import {
  getStatusSummary,
  getPensionTypeSummary,
  getBranchPerformanceSummary,
  getStatusTrends,
} from '@/features/reports/queries/dashboard.queries'
import { getUserBranchFilter } from '@/lib/territories/filter'
import { hasPermission } from '@/lib/permissions'
import { rateLimitMiddleware } from '@/server/api/middleware/rate-limit'
import { logger } from '@/lib/logger'

export const dashboardRoutes = new Hono()

// Validation schema for dashboard query parameters
const dashboardQuerySchema = z.object({
  companyId: z.string().min(1, 'Company ID is required'),
  periodYear: z.coerce.number().int().min(2000).max(2100),
  periodMonth: z.coerce.number().int().min(1).max(12).optional(),
  periodQuarter: z.coerce.number().int().min(1).max(4).optional(),
})

const trendsQuerySchema = dashboardQuerySchema.extend({
  days: z.coerce.number().int().min(1).max(365).optional().default(30),
})

/**
 * GET /api/reports/dashboard/status-summary
 * Get status distribution with counts and percentages
 */
dashboardRoutes.get(
  '/status-summary',
  rateLimitMiddleware('read'),
  zValidator('query', dashboardQuerySchema),
  async (c) => {
    const start = performance.now()
    const userId = c.get('userId') as string
    const orgId = c.get('orgId') as string
    const { companyId, periodYear, periodMonth, periodQuarter } = c.req.valid('query')

    try {
      // Check permission
      const hasReadPermission = await hasPermission(userId, orgId, 'reports', 'read')
      if (!hasReadPermission) {
        logger.warn('User does not have reports:read permission', {
          action: 'get_status_summary',
          userId,
          orgId,
        })

        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to view dashboard reports',
            },
          },
          403
        )
      }

      // Get user's branch filter for territory access
      const branchFilter = await getUserBranchFilter(userId, orgId)

      // Get status summary
      const summary = await getStatusSummary({
        companyId,
        branchIds: branchFilter.scope === 'territory' ? branchFilter.branchIds : undefined,
        periodYear,
        periodMonth,
        periodQuarter,
      })

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
        data: summary,
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

/**
 * GET /api/reports/dashboard/pension-type-summary
 * Get pension type breakdown with nested status counts
 */
dashboardRoutes.get(
  '/pension-type-summary',
  rateLimitMiddleware('read'),
  zValidator('query', dashboardQuerySchema),
  async (c) => {
    const start = performance.now()
    const userId = c.get('userId') as string
    const orgId = c.get('orgId') as string
    const { companyId, periodYear, periodMonth, periodQuarter } = c.req.valid('query')

    try {
      // Check permission
      const hasReadPermission = await hasPermission(userId, orgId, 'reports', 'read')
      if (!hasReadPermission) {
        logger.warn('User does not have reports:read permission', {
          action: 'get_pension_type_summary',
          userId,
          orgId,
        })

        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to view dashboard reports',
            },
          },
          403
        )
      }

      // Get user's branch filter for territory access
      const branchFilter = await getUserBranchFilter(userId, orgId)

      // Get pension type summary
      const summary = await getPensionTypeSummary({
        companyId,
        branchIds: branchFilter.scope === 'territory' ? branchFilter.branchIds : undefined,
        periodYear,
        periodMonth,
        periodQuarter,
      })

      logger.info('Retrieved pension type summary', {
        action: 'get_pension_type_summary',
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
        data: summary,
        meta: {
          companyId,
          periodYear,
          periodMonth,
          periodQuarter,
        },
      })
    } catch (error) {
      logger.error('Failed to retrieve pension type summary', error as Error, {
        action: 'get_pension_type_summary',
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
            message: 'Failed to retrieve pension type summary',
            details: error instanceof Error ? error.message : undefined,
          },
        },
        500
      )
    }
  }
)

/**
 * GET /api/reports/dashboard/branch-performance
 * Get branch performance metrics with completion rates
 */
dashboardRoutes.get(
  '/branch-performance',
  rateLimitMiddleware('read'),
  zValidator('query', dashboardQuerySchema),
  async (c) => {
    const start = performance.now()
    const userId = c.get('userId') as string
    const orgId = c.get('orgId') as string
    const { companyId, periodYear, periodMonth, periodQuarter } = c.req.valid('query')

    try {
      // Check permission
      const hasReadPermission = await hasPermission(userId, orgId, 'reports', 'read')
      if (!hasReadPermission) {
        logger.warn('User does not have reports:read permission', {
          action: 'get_branch_performance',
          userId,
          orgId,
        })

        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to view dashboard reports',
            },
          },
          403
        )
      }

      // Get user's branch filter for territory access
      const branchFilter = await getUserBranchFilter(userId, orgId)

      // Get branch performance summary
      const summary = await getBranchPerformanceSummary({
        companyId,
        branchIds: branchFilter.scope === 'territory' ? branchFilter.branchIds : undefined,
        periodYear,
        periodMonth,
        periodQuarter,
      })

      logger.info('Retrieved branch performance summary', {
        action: 'get_branch_performance',
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
        data: summary,
        meta: {
          companyId,
          periodYear,
          periodMonth,
          periodQuarter,
        },
      })
    } catch (error) {
      logger.error('Failed to retrieve branch performance summary', error as Error, {
        action: 'get_branch_performance',
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
            message: 'Failed to retrieve branch performance summary',
            details: error instanceof Error ? error.message : undefined,
          },
        },
        500
      )
    }
  }
)

/**
 * GET /api/reports/dashboard/trends
 * Get status trends over time
 */
dashboardRoutes.get(
  '/trends',
  rateLimitMiddleware('read'),
  zValidator('query', trendsQuerySchema),
  async (c) => {
    const start = performance.now()
    const userId = c.get('userId') as string
    const orgId = c.get('orgId') as string
    const { companyId, periodYear, periodMonth, periodQuarter, days } = c.req.valid('query')

    try {
      // Check permission
      const hasReadPermission = await hasPermission(userId, orgId, 'reports', 'read')
      if (!hasReadPermission) {
        logger.warn('User does not have reports:read permission', {
          action: 'get_status_trends',
          userId,
          orgId,
        })

        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to view dashboard reports',
            },
          },
          403
        )
      }

      // Get user's branch filter for territory access
      const branchFilter = await getUserBranchFilter(userId, orgId)

      // Get status trends
      const trends = await getStatusTrends({
        companyId,
        branchIds: branchFilter.scope === 'territory' ? branchFilter.branchIds : undefined,
        periodYear,
        periodMonth,
        periodQuarter,
        days,
      })

      logger.info('Retrieved status trends', {
        action: 'get_status_trends',
        userId,
        orgId,
        companyId,
        periodYear,
        periodMonth,
        periodQuarter,
        days,
        duration: performance.now() - start,
      })

      return c.json({
        success: true,
        data: trends,
        meta: {
          companyId,
          periodYear,
          periodMonth,
          periodQuarter,
          days,
        },
      })
    } catch (error) {
      logger.error('Failed to retrieve status trends', error as Error, {
        action: 'get_status_trends',
        userId,
        orgId,
        companyId,
        periodYear,
        periodMonth,
        periodQuarter,
        days,
      })

      return c.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to retrieve status trends',
            details: error instanceof Error ? error.message : undefined,
          },
        },
        500
      )
    }
  }
)
