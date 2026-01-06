// Activity logging service
import { db } from '@/server/db/index'
import { activityLogs } from '@/server/db/schema/activity'
import { logger } from '@/lib/logger'
import type { Context, Next } from 'hono'
import type { Middleware } from 'hono'

// Predefined action types for consistency
export const ACTION_TYPES = {
  // Auth actions
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  REGISTER: 'REGISTER',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',

  // Client actions
  CLIENT_VIEW: 'CLIENT_VIEW',
  CLIENT_CREATE: 'CLIENT_CREATE',
  CLIENT_UPDATE: 'CLIENT_UPDATE',
  CLIENT_DELETE: 'CLIENT_DELETE',
  CLIENT_SEARCH: 'CLIENT_SEARCH',

  // Status actions
  STATUS_VIEW: 'STATUS_VIEW',
  STATUS_UPDATE: 'STATUS_UPDATE',
  STATUS_BULK_UPDATE: 'STATUS_BULK_UPDATE',
  STATUS_HISTORY_VIEW: 'STATUS_HISTORY_VIEW',

  // Sync actions
  SYNC_START: 'SYNC_START',
  SYNC_COMPLETE: 'SYNC_COMPLETE',
  SYNC_FAIL: 'SYNC_FAIL',

  // Export actions
  EXPORT_CREATE: 'EXPORT_CREATE',
  EXPORT_DOWNLOAD: 'EXPORT_DOWNLOAD',
  EXPORT_DELETE: 'EXPORT_DELETE',

  // Admin actions
  CONFIG_UPDATE: 'CONFIG_UPDATE',
  PERMISSION_UPDATE: 'PERMISSION_UPDATE',
  USER_UPDATE: 'USER_UPDATE',
  BRANCH_UPDATE: 'BRANCH_UPDATE',
  AREA_UPDATE: 'AREA_UPDATE',

  // Organization actions
  BRANCH_CREATE: 'BRANCH_CREATE',
  BRANCH_DELETE: 'BRANCH_DELETE',
  AREA_CREATE: 'AREA_CREATE',
  AREA_DELETE: 'AREA_DELETE',
} as const

export type ActionType = (typeof ACTION_TYPES)[keyof typeof ACTION_TYPES]

// Resource types
export const RESOURCE_TYPES = {
  USER: 'user',
  CLIENT: 'client',
  STATUS: 'status',
  BRANCH: 'branch',
  AREA: 'area',
  CONFIG: 'config',
  PERMISSION: 'permission',
  EXPORT: 'export',
  SYNC: 'sync',
} as const

export type ResourceType = (typeof RESOURCE_TYPES)[keyof typeof RESOURCE_TYPES]

// Activity log parameters
export interface LogActivityParams {
  userId: string
  action: string
  resource?: string
  resourceId?: string
  details?: any
  ipAddress?: string
  userAgent?: string
  durationMs?: number
  statusCode?: number
  errorMessage?: string
}

// Request metadata
export interface RequestMeta {
  ipAddress?: string
  userAgent?: string
}

// Route mapping configuration
interface RouteMapping {
  method: string
  path: string
  action: string
  resource?: string
}

const ROUTE_MAPPINGS: RouteMapping[] = [
  // Client routes
  { method: 'GET', path: '/api/clients', action: ACTION_TYPES.CLIENT_VIEW, resource: RESOURCE_TYPES.CLIENT },
  { method: 'POST', path: '/api/clients', action: ACTION_TYPES.CLIENT_CREATE, resource: RESOURCE_TYPES.CLIENT },
  { method: 'GET', path: '/api/clients/:id', action: ACTION_TYPES.CLIENT_VIEW, resource: RESOURCE_TYPES.CLIENT },
  { method: 'PATCH', path: '/api/clients/:id', action: ACTION_TYPES.CLIENT_UPDATE, resource: RESOURCE_TYPES.CLIENT },
  { method: 'DELETE', path: '/api/clients/:id', action: ACTION_TYPES.CLIENT_DELETE, resource: RESOURCE_TYPES.CLIENT },
  { method: 'GET', path: '/api/clients/search', action: ACTION_TYPES.CLIENT_SEARCH, resource: RESOURCE_TYPES.CLIENT },

  // Status routes
  { method: 'GET', path: '/api/status', action: ACTION_TYPES.STATUS_VIEW, resource: RESOURCE_TYPES.STATUS },
  { method: 'POST', path: '/api/status/update', action: ACTION_TYPES.STATUS_UPDATE, resource: RESOURCE_TYPES.STATUS },
  { method: 'POST', path: '/api/status/bulk-update', action: ACTION_TYPES.STATUS_BULK_UPDATE, resource: RESOURCE_TYPES.STATUS },
  { method: 'GET', path: '/api/status/history', action: ACTION_TYPES.STATUS_HISTORY_VIEW, resource: RESOURCE_TYPES.STATUS },

  // Export routes
  { method: 'POST', path: '/api/reports/exports', action: ACTION_TYPES.EXPORT_CREATE, resource: RESOURCE_TYPES.EXPORT },
  { method: 'GET', path: '/api/reports/exports/:id', action: ACTION_TYPES.EXPORT_DOWNLOAD, resource: RESOURCE_TYPES.EXPORT },
  { method: 'DELETE', path: '/api/reports/exports/:id', action: ACTION_TYPES.EXPORT_DELETE, resource: RESOURCE_TYPES.EXPORT },

  // Sync routes
  { method: 'POST', path: '/api/sync/start', action: ACTION_TYPES.SYNC_START, resource: RESOURCE_TYPES.SYNC },
  { method: 'GET', path: '/api/sync/jobs', action: ACTION_TYPES.SYNC_VIEW, resource: RESOURCE_TYPES.SYNC },

  // Admin routes
  { method: 'PATCH', path: '/api/admin/config', action: ACTION_TYPES.CONFIG_UPDATE, resource: RESOURCE_TYPES.CONFIG },
  { method: 'PATCH', path: '/api/users/:id/permissions', action: ACTION_TYPES.PERMISSION_UPDATE, resource: RESOURCE_TYPES.PERMISSION },
  { method: 'PATCH', path: '/api/users/:id', action: ACTION_TYPES.USER_UPDATE, resource: RESOURCE_TYPES.USER },
  { method: 'PATCH', path: '/api/admin/branches/:id', action: ACTION_TYPES.BRANCH_UPDATE, resource: RESOURCE_TYPES.BRANCH },
  { method: 'PATCH', path: '/api/admin/areas/:id', action: ACTION_TYPES.AREA_UPDATE, resource: RESOURCE_TYPES.AREA },

  // Organization routes
  { method: 'POST', path: '/api/organization/branches', action: ACTION_TYPES.BRANCH_CREATE, resource: RESOURCE_TYPES.BRANCH },
  { method: 'DELETE', path: '/api/organization/branches/:id', action: ACTION_TYPES.BRANCH_DELETE, resource: RESOURCE_TYPES.BRANCH },
  { method: 'POST', path: '/api/organization/areas', action: ACTION_TYPES.AREA_CREATE, resource: RESOURCE_TYPES.AREA },
  { method: 'DELETE', path: '/api/organization/areas/:id', action: ACTION_TYPES.AREA_DELETE, resource: RESOURCE_TYPES.AREA },
]

/**
 * Main logging function (non-blocking, never throws)
 * Logs activity to the database without blocking request processing
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await db.insert(activityLogs).values({
      userId: params.userId,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      details: params.details,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      durationMs: params.durationMs,
      statusCode: params.statusCode,
      errorMessage: params.errorMessage,
    })
  } catch (error) {
    // Never throw - log to console only
    console.error('[ActivityLogger] Failed to log activity:', error)
  }
}

/**
 * Extract IP address and user agent from requests
 */
export function extractRequestMeta(request: Request): RequestMeta {
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                    request.headers.get('x-real-ip') ||
                    'unknown'
  
  const userAgent = request.headers.get('user-agent') || 'unknown'

  return {
    ipAddress,
    userAgent,
  }
}

/**
 * Map HTTP method + path to predefined action types
 */
export function mapRouteToAction(method: string, path: string): { action: string; resource?: string } {
  // Normalize path for matching
  const normalizedPath = path.split('/').map((segment, index) => {
    // Convert path parameters like :id to placeholder
    if (segment.startsWith(':') || index > 0 && segment.match(/^[0-9a-f-]{36}$/i)) {
      return ':id'
    }
    return segment
  }).join('/')

  // Find matching route
  const mapping = ROUTE_MAPPINGS.find(
    (m) => m.method === method && m.path === normalizedPath
  )

  if (mapping) {
    return {
      action: mapping.action,
      resource: mapping.resource,
    }
  }

  // Default to generic action
  const actionName = `${method.toUpperCase()}_${normalizedPath.replace(/\//g, '_')}`
  return {
    action: actionName,
  }
}

/**
 * Hono middleware for automatic activity logging
 * Logs all requests with timing and metadata
 */
export function createActivityLogger(): Middleware {
  return async (c: Context, next: Next) => {
    const startTime = Date.now()
    const userId = c.get('userId') || 'anonymous'
    const request = c.req.raw
    const method = c.req.method
    const path = c.req.path

    // Extract request metadata
    const meta = extractRequestMeta(request)

    // Map route to action
    const { action, resource } = mapRouteToAction(method, path)

    // Extract resource ID from path if present
    const pathParts = path.split('/')
    const resourceId = pathParts.find((part) => part.match(/^[0-9a-f-]{36}$/i))

    try {
      await next()

      const durationMs = Date.now() - startTime
      const statusCode = c.res.status

      // Log successful request
      await logActivity({
        userId,
        action,
        resource,
        resourceId,
        details: {
          method,
          path,
          query: c.req.query(),
        },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        durationMs,
        statusCode,
      })
    } catch (error) {
      const durationMs = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Log failed request
      await logActivity({
        userId,
        action,
        resource,
        resourceId,
        details: {
          method,
          path,
          query: c.req.query(),
        },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        durationMs,
        statusCode: 500,
        errorMessage,
      })

      throw error
    }
  }
}

/**
 * Log authentication events
 */
export async function logAuthEvent(params: {
  userId: string
  action: 'LOGIN' | 'LOGOUT' | 'REGISTER' | 'PASSWORD_CHANGE'
  ipAddress?: string
  userAgent?: string
  details?: any
}): Promise<void> {
  await logActivity({
    userId: params.userId,
    action: params.action,
    resource: RESOURCE_TYPES.USER,
    resourceId: params.userId,
    details: params.details,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  })
}

/**
 * Log sync events
 */
export async function logSyncEvent(params: {
  userId: string
  action: 'SYNC_START' | 'SYNC_COMPLETE' | 'SYNC_FAIL'
  syncId?: string
  details?: any
  ipAddress?: string
  userAgent?: string
  durationMs?: number
  errorMessage?: string
}): Promise<void> {
  await logActivity({
    userId: params.userId,
    action: params.action,
    resource: RESOURCE_TYPES.SYNC,
    resourceId: params.syncId,
    details: params.details,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    durationMs: params.durationMs,
    errorMessage: params.errorMessage,
  })
}
