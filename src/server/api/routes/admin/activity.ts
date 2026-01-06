import { Hono } from 'hono'
import { listActivityLogs } from '@/features/activity/queries/activity.queries'
import { hasPermission } from '@/lib/permissions'
import { rateLimitMiddleware } from '@/server/api/middleware/rate-limit'
import { logger } from '@/lib/logger'

export const activityRoutes = new Hono()

/**
 * GET /api/admin/activity
 * List activity logs with pagination and filters
 */
activityRoutes.get('/', rateLimitMiddleware('read'), async (c) => {
  const userId = c.get('userId') as string | undefined
  const orgId = c.get('orgId') as string | undefined
  try {
    // Check permission
    if (userId && orgId) {
      const hasReadPermission = await hasPermission(userId, orgId, 'config', 'read')
      if (!hasReadPermission) {
      logger.warn('User does not have config:read permission', {
        action: 'list_activity_logs',
        userId,
        orgId,
      })

      return c.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to view activity logs',
          },
        },
        403
      )
    }
    }

    const page = parseInt(c.req.query('page') || '1', 10)
    const pageSize = parseInt(c.req.query('pageSize') || '25', 10)
    const search = c.req.query('search')
    const actionCategory = c.req.query('actionCategory')
    const resourceType = c.req.query('resource')

    // Build filters based on action category
    let action: string | undefined
    if (actionCategory && actionCategory !== 'all') {
      // Map action category to specific actions
      const actionMap: Record<string, string[]> = {
        User: ['user:read', 'user:manage', 'user:create', 'user:update', 'user:delete'],
        Client: ['client:read', 'client:update', 'client:create', 'client:delete'],
        Status: ['status:read', 'status:update', 'status:history:read'],
        Config: ['config:read', 'config:manage', 'config:create', 'config:update', 'config:delete'],
        Export: ['export:read', 'export:create', 'export:download'],
        Sync: ['sync:read', 'sync:execute'],
      }
      // For simplicity, we'll just use the first action in the category
      // In a real implementation, you might want to filter by multiple actions
      const actions = actionMap[actionCategory]
      if (actions && actions.length > 0) {
        action = actions[0]
      }
    }

    // Map resource type to lowercase
    const resource = resourceType && resourceType !== 'all' ? resourceType.toLowerCase() : undefined

    const result = await listActivityLogs({
      page,
      pageSize,
      search,
      action,
      resource,
    })

    // Format response to match the expected structure
    const response = {
      data: result.data.map((log) => ({
        ...log,
        userName: log.userId, // In a real implementation, you'd fetch the user name
      })),
      meta: {
        page: result.pagination.page,
        pageSize: result.pagination.pageSize,
        total: result.pagination.total,
        totalPages: result.pagination.totalPages,
      },
    }

    logger.info('Retrieved activity logs', {
      action: 'list_activity_logs',
      userId,
      orgId,
      count: result.data.length,
      total: result.pagination.total,
      page,
      pageSize,
    })

    return c.json(response)
  } catch (error) {
    logger.error('Failed to retrieve activity logs', error as Error, {
      action: 'list_activity_logs',
      userId,
      orgId,
      params: { page, pageSize, search, actionCategory, resourceType } as const,
    })

    return c.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch activity logs',
        },
      },
      500
    )
  }
})
