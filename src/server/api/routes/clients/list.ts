import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '@/server/db'
import { getClients, countClients } from '@/server/db/queries/clients'
import { getUserBranchFilter } from '@/lib/territories/filter'
import { hasPermission } from '@/lib/permissions'
import { rateLimitMiddleware } from '@/server/api/middleware/rate-limit'
import { validateRequest } from '@/server/api/middleware/validation'
import { logger } from '@/lib/logger'

export const clientListRoutes = new Hono()

// Validation schema for query parameters
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  pensionTypeId: z.string().optional(),
  pensionerTypeId: z.string().optional(),
  productId: z.string().optional(),
  parStatusId: z.string().optional(),
  accountTypeId: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().optional(),
})

/**
 * GET /api/clients
 * List clients with pagination and filtering
 */
clientListRoutes.get(
  '/',
  rateLimitMiddleware('read'),
  validateRequest('query', listQuerySchema),
  async (c) => {
    const start = performance.now()
    const userId = c.get('userId') as string
    const orgId = c.get('orgId') as string
    const {
      page,
      pageSize,
      sortBy,
      sortOrder,
      pensionTypeId,
      pensionerTypeId,
      productId,
      parStatusId,
      accountTypeId,
      isActive,
      search,
    } = c.get('validated_query')

    try {
      // Check permission
      const hasReadPermission = await hasPermission(userId, orgId, 'clients', 'read')
      if (!hasReadPermission) {
        logger.warn('User does not have clients:read permission', {
          action: 'list_clients',
          userId,
          orgId,
        })

        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to view clients',
            },
          },
          403
        )
      }

      // Get user's branch filter for territory access
      const branchFilter = await getUserBranchFilter(userId, orgId)

      // If user has no access, return empty result
      if (branchFilter.scope === 'none') {
        return c.json({
          success: true,
          data: [],
          meta: {
            page,
            pageSize,
            total: 0,
            totalPages: 0,
          },
        })
      }

      // Build filters object
      const filters: any = {
        pensionTypeId,
        pensionerTypeId,
        productId,
        parStatusId,
        accountTypeId,
        isActive,
        search,
      }

      // Add branch IDs if user has territory access
      if (branchFilter.scope === 'territory') {
        filters.branchIds = branchFilter.branchIds
      }

      // Get clients and total count in parallel
      const [clients, total] = await Promise.all([
        getClients(db, page, pageSize, filters),
        countClients(db, filters),
      ])

      const totalPages = Math.ceil(total / pageSize)

      logger.info('Retrieved clients list', {
        action: 'list_clients',
        userId,
        orgId,
        page,
        pageSize,
        total,
        filters,
      })

      return c.json({
        success: true,
        data: clients,
        meta: {
          page,
          pageSize,
          total,
          totalPages,
        },
      })
    } catch (error) {
      logger.error('Failed to retrieve clients list', error as Error, {
        action: 'list_clients',
        userId,
        orgId,
        page,
        pageSize,
        filters: { pensionTypeId, pensionerTypeId, productId, parStatusId, accountTypeId, isActive, search },
      })

      return c.json(
        {
          success: false,
          error: {
            message: error instanceof Error ? error.message : 'Failed to retrieve clients',
          },
        },
        500
      )
    }
  }
)
