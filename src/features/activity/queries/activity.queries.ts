// Activity log queries
import { db } from '@/server/db/index'
import { activityLogs } from '@/server/db/schema/activity'
import { eq, and, gte, lte, or, like, desc, sql, count } from 'drizzle-orm'
import { logger } from '@/lib/logger'

// Type definitions
export interface ActivityLog {
  id: string
  userId: string
  action: string
  resource: string | null
  resourceId: string | null
  details: any | null
  ipAddress: string | null
  userAgent: string | null
  durationMs: number | null
  statusCode: number | null
  errorMessage: string | null
  createdAt: Date
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface UserActivitySummary {
  totalActions: number
  actionsByType: Record<string, number>
  actionsByResource: Record<string, number>
  successRate: number
  averageDuration: number
}

// Query parameters
export interface ListActivityLogsParams {
  userId?: string
  action?: string
  resource?: string
  resourceId?: string
  startDate?: Date
  endDate?: Date
  search?: string
  page?: number
  pageSize?: number
}

export interface GetActivityForResourceParams {
  resource: string
  resourceId: string
}

export interface GetUserActivitySummaryParams {
  userId: string
  startDate?: Date
  endDate?: Date
}

/**
 * List activity logs with pagination and filters
 */
export async function listActivityLogs(
  params: ListActivityLogsParams = {}
): Promise<PaginatedResult<ActivityLog>> {
  const {
    userId,
    action,
    resource,
    resourceId,
    startDate,
    endDate,
    search,
    page = 1,
    pageSize = 25,
  } = params

  const offset = (page - 1) * pageSize
  const limit = Math.min(pageSize, 100) // Max 100 per page

  try {
    // Build conditions
    const conditions = []

    if (userId) {
      conditions.push(eq(activityLogs.userId, userId))
    }

    if (action) {
      conditions.push(eq(activityLogs.action, action))
    }

    if (resource) {
      conditions.push(eq(activityLogs.resource, resource))
    }

    if (resourceId) {
      conditions.push(eq(activityLogs.resourceId, resourceId))
    }

    if (startDate) {
      conditions.push(gte(activityLogs.createdAt, startDate))
    }

    if (endDate) {
      conditions.push(lte(activityLogs.createdAt, endDate))
    }

    if (search) {
      const searchTerm = `%${search}%`
      conditions.push(
        or(
          like(activityLogs.action, searchTerm),
          like(activityLogs.resource, searchTerm),
          like(activityLogs.errorMessage, searchTerm)
        )
      )
    }

    // Build query
    let query = db.select().from(activityLogs)

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    // Get total count
    const countResult = await db
      .select({ count: count() })
      .from(activityLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)

    const total = countResult[0]?.count || 0

    // Get paginated results
    const data = await query
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit)
      .offset(offset)

    logger.info('Retrieved activity logs', {
      action: 'list_activity_logs',
      count: data.length,
      total,
      page,
      pageSize,
    })

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  } catch (error) {
    logger.error('Failed to retrieve activity logs', error as Error, {
      action: 'list_activity_logs',
      params,
    })
    throw error
  }
}

/**
 * Get activity history for specific resource
 */
export async function getActivityForResource(
  params: GetActivityForResourceParams
): Promise<ActivityLog[]> {
  const { resource, resourceId } = params

  try {
    const result = await db
      .select()
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.resource, resource),
          eq(activityLogs.resourceId, resourceId)
        )
      )
      .orderBy(desc(activityLogs.createdAt))

    logger.info('Retrieved activity for resource', {
      action: 'get_activity_for_resource',
      resource,
      resourceId,
      count: result.length,
    })

    return result
  } catch (error) {
    logger.error('Failed to retrieve activity for resource', error as Error, {
      action: 'get_activity_for_resource',
      params,
    })
    throw error
  }
}

/**
 * Get user action summary over time period
 */
export async function getUserActivitySummary(
  params: GetUserActivitySummaryParams
): Promise<UserActivitySummary> {
  const { userId, startDate, endDate } = params

  try {
    // Build conditions
    const conditions = [eq(activityLogs.userId, userId)]

    if (startDate) {
      conditions.push(gte(activityLogs.createdAt, startDate))
    }

    if (endDate) {
      conditions.push(lte(activityLogs.createdAt, endDate))
    }

    // Get all logs for the user in the time period
    const logs = await db
      .select()
      .from(activityLogs)
      .where(and(...conditions))
      .orderBy(desc(activityLogs.createdAt))

    // Calculate summary
    const totalActions = logs.length

    const actionsByType = logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const actionsByResource = logs.reduce((acc, log) => {
      if (log.resource) {
        acc[log.resource] = (acc[log.resource] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    const successfulActions = logs.filter((log) => !log.errorMessage).length
    const successRate = totalActions > 0 ? (successfulActions / totalActions) * 100 : 0

    const actionsWithDuration = logs.filter((log) => log.durationMs !== null)
    const averageDuration =
      actionsWithDuration.length > 0
        ? actionsWithDuration.reduce((sum, log) => sum + (log.durationMs || 0), 0) / actionsWithDuration.length
        : 0

    const summary: UserActivitySummary = {
      totalActions,
      actionsByType,
      actionsByResource,
      successRate,
      averageDuration,
    }

    logger.info('Retrieved user activity summary', {
      action: 'get_user_activity_summary',
      userId,
      totalActions,
      successRate,
    })

    return summary
  } catch (error) {
    logger.error('Failed to retrieve user activity summary', error as Error, {
      action: 'get_user_activity_summary',
      params,
    })
    throw error
  }
}

/**
 * Get recent activity for a user
 */
export async function getRecentActivityForUser(
  userId: string,
  limit: number = 10
): Promise<ActivityLog[]> {
  try {
    const result = await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.userId, userId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(Math.min(limit, 50))

    logger.info('Retrieved recent activity for user', {
      action: 'get_recent_activity_for_user',
      userId,
      count: result.length,
    })

    return result
  } catch (error) {
    logger.error('Failed to retrieve recent activity for user', error as Error, {
      action: 'get_recent_activity_for_user',
      userId,
    })
    throw error
  }
}

/**
 * Get activity statistics for a time period
 */
export async function getActivityStats(params: {
  startDate?: Date
  endDate?: Date
  action?: string
  resource?: string
}) {
  const { startDate, endDate, action, resource } = params

  try {
    const conditions = []

    if (startDate) {
      conditions.push(gte(activityLogs.createdAt, startDate))
    }

    if (endDate) {
      conditions.push(lte(activityLogs.createdAt, endDate))
    }

    if (action) {
      conditions.push(eq(activityLogs.action, action))
    }

    if (resource) {
      conditions.push(eq(activityLogs.resource, resource))
    }

    const result = await db
      .select({
        total: count(),
        successful: count(sql`CASE WHEN error_message IS NULL THEN 1 END`),
        failed: count(sql`CASE WHEN error_message IS NOT NULL THEN 1 END`),
        avgDuration: sql<number>`AVG(duration_ms)`,
      })
      .from(activityLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)

    const stats = result[0] || {
      total: 0,
      successful: 0,
      failed: 0,
      avgDuration: 0,
    }

    logger.info('Retrieved activity statistics', {
      action: 'get_activity_stats',
      stats,
    })

    return stats
  } catch (error) {
    logger.error('Failed to retrieve activity statistics', error as Error, {
      action: 'get_activity_stats',
      params,
    })
    throw error
  }
}
