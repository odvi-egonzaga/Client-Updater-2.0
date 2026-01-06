import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '@/server/db'
import { getUserPermissions, setUserPermissions } from '@/server/db/queries/permissions'
import { validateRequest } from '@/server/api/middleware/validation'
import { logger } from '@/lib/logger'

export const userPermissionsRoutes = new Hono()

// Validation schema for setting user permissions
const setPermissionsSchema = z.object({
  permissions: z.array(
    z.object({
      permissionId: z.string(),
      companyId: z.string(),
      scope: z.enum(['self', 'all', 'team', 'branch', 'area']),
    })
  ),
})

/**
 * GET /api/users/:id/permissions
 * Get user's permissions
 */
userPermissionsRoutes.get('/:id/permissions', async (c) => {
  const start = performance.now()
  const userId = c.req.param('id')
  const companyId = c.req.query('companyId')

  try {
    const permissions = await getUserPermissions(db, userId, companyId)

    logger.info('Retrieved user permissions', {
      action: 'get_user_permissions',
      userId,
      companyId,
      count: permissions.length,
    })

    return c.json({
      success: true,
      data: permissions,
    })
  } catch (error) {
    logger.error('Failed to retrieve user permissions', error as Error, {
      action: 'get_user_permissions',
      userId,
      companyId,
    })

    return c.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to retrieve user permissions',
        },
      },
      500
    )
  }
})

/**
 * PUT /api/users/:id/permissions
 * Set user's permissions (replaces all existing permissions)
 */
userPermissionsRoutes.put('/:id/permissions', validateRequest('json', setPermissionsSchema), async (c) => {
  const start = performance.now()
  const userId = c.req.param('id')
  const { permissions } = c.get('validated_json')

  try {
    const result = await setUserPermissions(db, userId, permissions)

    logger.info('Set user permissions', {
      action: 'set_user_permissions',
      userId,
      count: result.length,
    })

    return c.json({
      success: true,
      data: result,
    })
  } catch (error) {
    logger.error('Failed to set user permissions', error as Error, {
      action: 'set_user_permissions',
      userId,
    })

    return c.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to set user permissions',
        },
      },
      500
    )
  }
})
