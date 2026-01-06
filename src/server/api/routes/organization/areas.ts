import { Hono } from 'hono'
import { z } from 'zod'
import {
  listAreas,
  getAreaById,
  createArea,
  updateArea,
  deleteArea,
  getAreaOptions,
} from '@/server/db/queries/areas'
import { hasPermission } from '@/lib/permissions'
import { rateLimitMiddleware } from '@/server/api/middleware/rate-limit'
import { validateRequest } from '@/server/api/middleware/validation'
import { logger } from '@/lib/logger'

export const areaRoutes = new Hono()

// Validation schemas
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  search: z.string().optional(),
  companyId: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
})

const createAreaSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  companyId: z.string().uuid(),
})

const updateAreaSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  companyId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
})

const optionsQuerySchema = z.object({
  companyId: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
})

/**
 * GET /api/organization/areas
 * List areas with pagination, search, filters
 */
areaRoutes.get(
  '/',
  rateLimitMiddleware('read'),
  validateRequest('query', listQuerySchema),
  async (c) => {
    const userId = (c as any).get('userId') as string
    const orgId = (c as any).get('orgId') as string
    const { page, pageSize, search, companyId, isActive } = (c as any).get('validated_query') as any

    try {
      // Check permission
      const hasReadPermission = await hasPermission(userId, orgId, 'areas', 'read')
      if (!hasReadPermission) {
        logger.warn('User does not have areas:read permission', {
          action: 'list_areas',
          userId,
          orgId,
        })

        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to view areas',
            },
          },
          403
        )
      }

      const result = await listAreas({
        page,
        pageSize,
        search,
        companyId,
        isActive,
      })

      logger.info('Retrieved areas list', {
        action: 'list_areas',
        userId,
        orgId,
        page,
        pageSize,
        total: result.meta.total,
        filters: { search, companyId, isActive },
      })

      return c.json({
        success: true,
        data: result.data,
        meta: result.meta,
      })
    } catch (error) {
      logger.error('Failed to retrieve areas list', error as Error, {
        action: 'list_areas',
        userId,
        orgId,
        page,
        pageSize,
        filters: { search, companyId, isActive },
      })

      return c.json(
        {
          success: false,
          error: {
            message: error instanceof Error ? error.message : 'Failed to retrieve areas',
          },
        },
        500
      )
    }
  }
)

/**
 * GET /api/organization/areas/options
 * Get areas for dropdowns
 */
areaRoutes.get(
  '/options',
  rateLimitMiddleware('read'),
  validateRequest('query', optionsQuerySchema),
  async (c) => {
    const userId = (c as any).get('userId') as string
    const orgId = (c as any).get('orgId') as string
    const { companyId, isActive } = (c as any).get('validated_query') as any

    try {
      // Check permission
      const hasReadPermission = await hasPermission(userId, orgId, 'areas', 'read')
      if (!hasReadPermission) {
        logger.warn('User does not have areas:read permission', {
          action: 'get_area_options',
          userId,
          orgId,
        })

        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to view areas',
            },
          },
          403
        )
      }

      const options = await getAreaOptions({ companyId, isActive })

      logger.info('Retrieved area options', {
        action: 'get_area_options',
        userId,
        orgId,
        count: options.length,
        filters: { companyId, isActive },
      })

      return c.json({
        success: true,
        data: options,
      })
    } catch (error) {
      logger.error('Failed to retrieve area options', error as Error, {
        action: 'get_area_options',
        userId,
        orgId,
        filters: { companyId, isActive },
      })

      return c.json(
        {
          success: false,
          error: {
            message: error instanceof Error ? error.message : 'Failed to retrieve area options',
          },
        },
        500
      )
    }
  }
)

/**
 * GET /api/organization/areas/:id
 * Get area by ID
 */
areaRoutes.get('/:id', rateLimitMiddleware('read'), async (c) => {
  const userId = (c as any).get('userId') as string
  const orgId = (c as any).get('orgId') as string
  const id = c.req.param('id')

  try {
    // Check permission
    const hasReadPermission = await hasPermission(userId, orgId, 'areas', 'read')
    if (!hasReadPermission) {
      logger.warn('User does not have areas:read permission', {
        action: 'get_area_by_id',
        userId,
        orgId,
        areaId: id,
      })

      return c.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to view areas',
          },
        },
        403
      )
    }

    const area = await getAreaById(id)

    if (!area) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Area not found',
          },
        },
        404
      )
    }

    logger.info('Retrieved area by ID', {
      action: 'get_area_by_id',
      userId,
      orgId,
      areaId: id,
    })

    return c.json({
      success: true,
      data: area,
    })
  } catch (error) {
    logger.error('Failed to retrieve area by ID', error as Error, {
      action: 'get_area_by_id',
      userId,
      orgId,
      areaId: id,
    })

    return c.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to retrieve area',
        },
      },
      500
    )
  }
})

/**
 * POST /api/organization/areas
 * Create area
 */
areaRoutes.post(
  '/',
  rateLimitMiddleware('write'),
  validateRequest('json', createAreaSchema),
  async (c) => {
    const userId = (c as any).get('userId') as string
    const orgId = (c as any).get('orgId') as string
    const data = (c as any).get('validated_json') as any

    try {
      // Check permission
      const hasManagePermission = await hasPermission(userId, orgId, 'areas', 'manage')
      if (!hasManagePermission) {
        logger.warn('User does not have areas:manage permission', {
          action: 'create_area',
          userId,
          orgId,
        })

        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to create areas',
            },
          },
          403
        )
      }

      const area = await createArea(data)

      logger.info('Created area', {
        action: 'create_area',
        userId,
        orgId,
        areaId: area.id,
        code: area.code,
      })

      return c.json(
        {
          success: true,
          data: area,
        },
        201
      )
    } catch (error) {
      logger.error('Failed to create area', error as Error, {
        action: 'create_area',
        userId,
        orgId,
        code: data.code,
      })

      return c.json(
        {
          success: false,
          error: {
            code: error instanceof Error && error.message.includes('already exists') ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Failed to create area',
          },
        },
        error instanceof Error && error.message.includes('already exists') ? 400 : 500
      )
    }
  }
)

/**
 * PATCH /api/organization/areas/:id
 * Update area
 */
areaRoutes.patch(
  '/:id',
  rateLimitMiddleware('write'),
  validateRequest('json', updateAreaSchema),
  async (c) => {
    const userId = (c as any).get('userId') as string
    const orgId = (c as any).get('orgId') as string
    const id = c.req.param('id')
    const data = (c as any).get('validated_json') as any

    try {
      // Check permission
      const hasManagePermission = await hasPermission(userId, orgId, 'areas', 'manage')
      if (!hasManagePermission) {
        logger.warn('User does not have areas:manage permission', {
          action: 'update_area',
          userId,
          orgId,
          areaId: id,
        })

        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to update areas',
            },
          },
          403
        )
      }

      const area = await updateArea(id, data)

      logger.info('Updated area', {
        action: 'update_area',
        userId,
        orgId,
        areaId: id,
      })

      return c.json({
        success: true,
        data: area,
      })
    } catch (error) {
      logger.error('Failed to update area', error as Error, {
        action: 'update_area',
        userId,
        orgId,
        areaId: id,
      })

      return c.json(
        {
          success: false,
          error: {
            code: error instanceof Error && error.message.includes('not found') ? 'NOT_FOUND' : 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Failed to update area',
          },
        },
        error instanceof Error && error.message.includes('not found') ? 404 : 500
      )
    }
  }
)

/**
 * DELETE /api/organization/areas/:id
 * Delete area (soft delete)
 */
areaRoutes.delete('/:id', rateLimitMiddleware('write'), async (c) => {
  const userId = (c as any).get('userId') as string
  const orgId = (c as any).get('orgId') as string
  const id = c.req.param('id')

  try {
    // Check permission
    const hasManagePermission = await hasPermission(userId, orgId, 'areas', 'manage')
    if (!hasManagePermission) {
      logger.warn('User does not have areas:manage permission', {
        action: 'delete_area',
        userId,
        orgId,
        areaId: id,
      })

      return c.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to delete areas',
          },
        },
        403
      )
    }

    await deleteArea(id)

    logger.info('Deleted area', {
      action: 'delete_area',
      userId,
      orgId,
      areaId: id,
    })

    return c.json({
      success: true,
      data: null,
    })
  } catch (error) {
    logger.error('Failed to delete area', error as Error, {
      action: 'delete_area',
      userId,
      orgId,
      areaId: id,
    })

    return c.json(
      {
        success: false,
        error: {
          code: error instanceof Error && error.message.includes('not found') ? 'NOT_FOUND' : 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete area',
        },
      },
      error instanceof Error && error.message.includes('not found') ? 404 : 500
    )
  }
})
