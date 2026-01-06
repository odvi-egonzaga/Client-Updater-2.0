import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '@/server/db'
import { configOptions } from '@/server/db/schema/config'
import { eq } from 'drizzle-orm'
import {
  listConfigOptions,
  getConfigOptionById,
  createConfigOption,
  updateConfigOption,
} from '@/server/db/queries/config'
import { hasPermission } from '@/lib/permissions'
import { rateLimitMiddleware } from '@/server/api/middleware/rate-limit'
import { validateRequest } from '@/server/api/middleware/validation'
import { logger } from '@/lib/logger'

export const configOptionRoutes = new Hono()

// Validation schemas
const listQuerySchema = z.object({
  categoryId: z.string().optional(),
  companyId: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  includeInactive: z.coerce.boolean().optional().default(false),
})

const createOptionSchema = z.object({
  categoryId: z.string().uuid(),
  code: z.string().min(1).max(50),
  label: z.string().min(1).max(200),
  value: z.string().max(500).optional(),
  metadata: z.record(z.any()).optional(),
  isDefault: z.boolean().optional().default(false),
  isSystem: z.boolean().optional().default(false),
  sortOrder: z.number().int().min(0).optional().default(0),
  parentOptionId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
})

const updateOptionSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  label: z.string().min(1).max(200).optional(),
  value: z.string().max(500).optional(),
  metadata: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  parentOptionId: z.string().uuid().optional(),
})

/**
 * GET /api/admin/config/options
 * List options with filters
 */
configOptionRoutes.get(
  '/options',
  rateLimitMiddleware('read'),
  validateRequest('query', listQuerySchema),
  async (c) => {
    const userId = (c as any).get('userId') as string
    const orgId = (c as any).get('orgId') as string
    const { categoryId, companyId, isActive, includeInactive } = (c as any).get('validated_query') as any

    try {
      // Check permission
      const hasReadPermission = await hasPermission(userId, orgId, 'config', 'read')
      if (!hasReadPermission) {
        logger.warn('User does not have config:read permission', {
          action: 'list_config_options',
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

      const options = await listConfigOptions({
        categoryId,
        companyId,
        isActive,
        includeInactive,
      })

      logger.info('Retrieved config options', {
        action: 'list_config_options',
        userId,
        orgId,
        count: options.length,
        filters: { categoryId, companyId, isActive },
      })

      return c.json({
        success: true,
        data: options,
      })
    } catch (error) {
      logger.error('Failed to retrieve config options', error as Error, {
        action: 'list_config_options',
        userId,
        orgId,
        filters: { categoryId, companyId, isActive },
      })

      return c.json(
        {
          success: false,
          error: {
            message: error instanceof Error ? error.message : 'Failed to retrieve config options',
          },
        },
        500
      )
    }
  }
)

/**
 * GET /api/admin/config/options/:id
 * Get option by ID
 */
configOptionRoutes.get('/options/:id', rateLimitMiddleware('read'), async (c) => {
  const userId = (c as any).get('userId') as string
  const orgId = (c as any).get('orgId') as string
  const id = c.req.param('id')

  try {
    // Check permission
    const hasReadPermission = await hasPermission(userId, orgId, 'config', 'read')
    if (!hasReadPermission) {
      logger.warn('User does not have config:read permission', {
        action: 'get_config_option_by_id',
        userId,
        orgId,
        optionId: id,
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

    const option = await getConfigOptionById(id)

    if (!option) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Config option not found',
          },
        },
        404
      )
    }

    logger.info('Retrieved config option by ID', {
      action: 'get_config_option_by_id',
      userId,
      orgId,
      optionId: id,
    })

    return c.json({
      success: true,
      data: option,
    })
  } catch (error) {
    logger.error('Failed to retrieve config option by ID', error as Error, {
      action: 'get_config_option_by_id',
      userId,
      orgId,
      optionId: id,
    })

    return c.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to retrieve config option',
        },
      },
      500
    )
  }
})

/**
 * POST /api/admin/config/options
 * Create option
 */
configOptionRoutes.post(
  '/options',
  rateLimitMiddleware('write'),
  validateRequest('json', createOptionSchema),
  async (c) => {
    const userId = (c as any).get('userId') as string
    const orgId = (c as any).get('orgId') as string
    const data = (c as any).get('validated_json') as any

    try {
      // Check permission
      const hasManagePermission = await hasPermission(userId, orgId, 'config', 'manage')
      if (!hasManagePermission) {
        logger.warn('User does not have config:manage permission', {
          action: 'create_config_option',
          userId,
          orgId,
        })

        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to modify configuration',
            },
          },
          403
        )
      }

      const option = await createConfigOption({
        ...data,
        createdBy: userId,
      })

      logger.info('Created config option', {
        action: 'create_config_option',
        userId,
        orgId,
        optionId: option.id,
        code: option.code,
      })

      return c.json(
        {
          success: true,
          data: option,
        },
        201
      )
    } catch (error) {
      logger.error('Failed to create config option', error as Error, {
        action: 'create_config_option',
        userId,
        orgId,
        code: data.code,
      })

      return c.json(
        {
          success: false,
          error: {
            code: error instanceof Error && error.message.includes('not found') ? 'NOT_FOUND' : 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Failed to create config option',
          },
        },
        error instanceof Error && error.message.includes('not found') ? 404 : 500
      )
    }
  }
)

/**
 * PATCH /api/admin/config/options/:id
 * Update option (protects system options)
 */
configOptionRoutes.patch(
  '/options/:id',
  rateLimitMiddleware('write'),
  validateRequest('json', updateOptionSchema),
  async (c) => {
    const userId = (c as any).get('userId') as string
    const orgId = (c as any).get('orgId') as string
    const id = c.req.param('id')
    const data = (c as any).get('validated_json') as any

    try {
      // Check permission
      const hasManagePermission = await hasPermission(userId, orgId, 'config', 'manage')
      if (!hasManagePermission) {
        logger.warn('User does not have config:manage permission', {
          action: 'update_config_option',
          userId,
          orgId,
          optionId: id,
        })

        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to modify configuration',
            },
          },
          403
        )
      }

      // Get existing option to check if it's a system option
      const existing = await getConfigOptionById(id)
      if (!existing) {
        return c.json(
          {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Config option not found',
            },
          },
          404
        )
      }

      // Protect system options - only allow updating non-system fields
      if (existing.isSystem) {
        // Filter out system-protected fields
        const allowedUpdates: any = {}
        if (data.value !== undefined) allowedUpdates.value = data.value
        if (data.isActive !== undefined) allowedUpdates.isActive = data.isActive
        if (data.sortOrder !== undefined) allowedUpdates.sortOrder = data.sortOrder

        // If no allowed updates, return error
        if (Object.keys(allowedUpdates).length === 0) {
          return c.json(
            {
              success: false,
              error: {
                code: 'FORBIDDEN',
                message: 'Cannot modify system option fields. Only value, isActive, and sortOrder can be updated for system options.',
              },
            },
            403
          )
        }

        const option = await updateConfigOption(id, allowedUpdates)

        logger.info('Updated system config option (restricted)', {
          action: 'update_config_option',
          userId,
          orgId,
          optionId: id,
          isSystem: true,
        })

        return c.json({
          success: true,
          data: option,
        })
      }

      // Non-system options can be fully updated
      const option = await updateConfigOption(id, data)

      logger.info('Updated config option', {
        action: 'update_config_option',
        userId,
        orgId,
        optionId: id,
        isSystem: false,
      })

      return c.json({
        success: true,
        data: option,
      })
    } catch (error) {
      logger.error('Failed to update config option', error as Error, {
        action: 'update_config_option',
        userId,
        orgId,
        optionId: id,
      })

      return c.json(
        {
          success: false,
          error: {
            code: error instanceof Error && error.message.includes('not found') ? 'NOT_FOUND' : 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Failed to update config option',
          },
        },
        error instanceof Error && error.message.includes('not found') ? 404 : 500
      )
    }
  }
)

/**
 * DELETE /api/admin/config/options/:id
 * Delete option (protects system options)
 */
configOptionRoutes.delete('/options/:id', rateLimitMiddleware('write'), async (c) => {
  const userId = (c as any).get('userId') as string
  const orgId = (c as any).get('orgId') as string
  const id = c.req.param('id')

  try {
    // Check permission
    const hasManagePermission = await hasPermission(userId, orgId, 'config', 'manage')
    if (!hasManagePermission) {
      logger.warn('User does not have config:manage permission', {
        action: 'delete_config_option',
        userId,
        orgId,
        optionId: id,
      })

      return c.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to modify configuration',
          },
        },
        403
      )
    }

    // Get existing option to check if it's a system option
    const existing = await getConfigOptionById(id)
    if (!existing) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Config option not found',
          },
        },
        404
      )
    }

    // Protect system options
    if (existing.isSystem) {
      logger.warn('Attempted to delete system config option', {
        action: 'delete_config_option',
        userId,
        orgId,
        optionId: id,
        isSystem: true,
      })

      return c.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Cannot delete system options',
          },
        },
        403
      )
    }

    // Delete the option
    await db.delete(configOptions).where(eq(configOptions.id, id))

    logger.info('Deleted config option', {
      action: 'delete_config_option',
      userId,
      orgId,
      optionId: id,
      isSystem: false,
    })

    return c.json({
      success: true,
      data: null,
    })
  } catch (error) {
    logger.error('Failed to delete config option', error as Error, {
      action: 'delete_config_option',
      userId,
      orgId,
      optionId: id,
    })

    return c.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to delete config option',
        },
      },
      500
    )
  }
})
