import { Hono } from 'hono'
import { z } from 'zod'
import { listConfigSettings, getConfigSetting, setConfigSetting } from '@/server/db/queries/config'
import { hasPermission } from '@/lib/permissions'
import { rateLimitMiddleware } from '@/server/api/middleware/rate-limit'
import { validateRequest } from '@/server/api/middleware/validation'
import { logger } from '@/lib/logger'

export const configSettingRoutes = new Hono()

// Validation schemas
const listQuerySchema = z.object({
  companyId: z.string().optional(),
  isPublic: z.coerce.boolean().optional(),
})

const setSettingSchema = z.object({
  value: z.string().min(1),
  valueType: z.enum(['string', 'number', 'boolean', 'json']).optional(),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().optional(),
  companyId: z.string().uuid().optional(),
})

/**
 * GET /api/admin/config/settings
 * List settings
 */
configSettingRoutes.get(
  '/settings',
  rateLimitMiddleware('read'),
  validateRequest('query', listQuerySchema),
  async (c) => {
    const userId = (c as any).get('userId')
    const orgId = (c as any).get('orgId')
    const { companyId, isPublic } = (c as any).get('validated_query')

    try {
      // Check permission
      const hasReadPermission = await hasPermission(userId, orgId, 'config', 'read')
      if (!hasReadPermission) {
        logger.warn('User does not have config:read permission', {
          action: 'list_config_settings',
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

      const settings = await listConfigSettings({ companyId, isPublic })

      logger.info('Retrieved config settings', {
        action: 'list_config_settings',
        userId,
        orgId,
        count: settings.length,
        filters: { companyId, isPublic },
      })

      return c.json({
        success: true,
        data: settings,
      })
    } catch (error) {
      logger.error('Failed to retrieve config settings', error as Error, {
        action: 'list_config_settings',
        userId,
        orgId,
        filters: { companyId, isPublic },
      })

      return c.json(
        {
          success: false,
          error: {
            message: error instanceof Error ? error.message : 'Failed to retrieve config settings',
          },
        },
        500
      )
    }
  }
)

/**
 * GET /api/admin/config/settings/:key
 * Get setting by key
 */
configSettingRoutes.get('/settings/:key', rateLimitMiddleware('read'), async (c) => {
  const userId = (c as any).get('userId')
  const orgId = (c as any).get('orgId')
  const key = c.req.param('key')

  try {
    // Check permission
    const hasReadPermission = await hasPermission(userId, orgId, 'config', 'read')
    if (!hasReadPermission) {
      logger.warn('User does not have config:read permission', {
        action: 'get_config_setting',
        userId,
        orgId,
        key,
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

    const setting = await getConfigSetting(key)

    if (!setting) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Config setting not found',
          },
        },
        404
      )
    }

    logger.info('Retrieved config setting by key', {
      action: 'get_config_setting',
      userId,
      orgId,
      key,
    })

    return c.json({
      success: true,
      data: setting,
    })
  } catch (error) {
    logger.error('Failed to retrieve config setting by key', error as Error, {
      action: 'get_config_setting',
      userId,
      orgId,
      key,
    })

    return c.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to retrieve config setting',
        },
      },
      500
    )
  }
})

/**
 * PUT /api/admin/config/settings/:key
 * Set setting (create or update)
 */
configSettingRoutes.put(
  '/settings/:key',
  rateLimitMiddleware('write'),
  validateRequest('json', setSettingSchema),
  async (c) => {
    const userId = (c as any).get('userId')
    const orgId = (c as any).get('orgId')
    const key = c.req.param('key')
    const data = (c as any).get('validated_json')

    try {
      // Check permission
      const hasManagePermission = await hasPermission(userId, orgId, 'config', 'manage')
      if (!hasManagePermission) {
        logger.warn('User does not have config:manage permission', {
          action: 'set_config_setting',
          userId,
          orgId,
          key,
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

      const setting = await setConfigSetting({
        key,
        ...data,
        updatedBy: userId,
      })

      logger.info('Set config setting', {
        action: 'set_config_setting',
        userId,
        orgId,
        key,
        operation: 'create_or_update',
      })

      return c.json({
        success: true,
        data: setting,
      })
    } catch (error) {
      logger.error('Failed to set config setting', error as Error, {
        action: 'set_config_setting',
        userId,
        orgId,
        key,
      })

      return c.json(
        {
          success: false,
          error: {
            code: error instanceof Error && error.message.includes('not found') ? 'NOT_FOUND' : 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Failed to set config setting',
          },
        },
        error instanceof Error && error.message.includes('not found') ? 404 : 500
      )
    }
  }
)
