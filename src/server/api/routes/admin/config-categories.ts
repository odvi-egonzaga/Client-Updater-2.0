import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { listConfigCategories, getCategoryByCode } from '@/server/db/queries/config'
import { hasPermission } from '@/lib/permissions'
import { rateLimitMiddleware } from '@/server/api/middleware/rate-limit'
import { logger } from '@/lib/logger'

export const configCategoryRoutes = new Hono()

// Validation schemas
const listQuerySchema = z.object({
  isActive: z.coerce.boolean().optional(),
})

/**
 * GET /api/admin/config/categories
 * List categories
 */
configCategoryRoutes.get(
  '/categories',
  rateLimitMiddleware('read'),
  zValidator('query', listQuerySchema),
  async (c) => {
    const userId = c.get('userId') as string
    const orgId = c.get('orgId') as string
    const { isActive } = c.req.valid('query')

    try {
      // Check permission
      const hasReadPermission = await hasPermission(userId, orgId, 'config', 'read')
      if (!hasReadPermission) {
        logger.warn('User does not have config:read permission', {
          action: 'list_config_categories',
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

      const categories = await listConfigCategories({ isActive })

      logger.info('Retrieved config categories', {
        action: 'list_config_categories',
        userId,
        orgId,
        count: categories.length,
        filters: { isActive },
      })

      return c.json({
        success: true,
        data: categories,
      })
    } catch (error) {
      logger.error('Failed to retrieve config categories', error as Error, {
        action: 'list_config_categories',
        userId,
        orgId,
        filters: { isActive },
      })

      return c.json(
        {
          success: false,
          error: {
            message: error instanceof Error ? error.message : 'Failed to retrieve config categories',
          },
        },
        500
      )
    }
  }
)

/**
 * GET /api/admin/config/categories/:code
 * Get category by code
 */
configCategoryRoutes.get('/categories/:code', rateLimitMiddleware('read'), async (c) => {
  const userId = c.get('userId') as string
  const orgId = c.get('orgId') as string
  const code = c.req.param('code')

  try {
    // Check permission
    const hasReadPermission = await hasPermission(userId, orgId, 'config', 'read')
    if (!hasReadPermission) {
      logger.warn('User does not have config:read permission', {
        action: 'get_category_by_code',
        userId,
        orgId,
        code,
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

    const category = await getCategoryByCode(code)

    if (!category) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Config category not found',
          },
        },
        404
      )
    }

    logger.info('Retrieved config category by code', {
      action: 'get_category_by_code',
      userId,
      orgId,
      code,
    })

    return c.json({
      success: true,
      data: category,
    })
  } catch (error) {
    logger.error('Failed to retrieve config category by code', error as Error, {
      action: 'get_category_by_code',
      userId,
      orgId,
      code,
    })

    return c.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to retrieve config category',
        },
      },
      500
    )
  }
})
