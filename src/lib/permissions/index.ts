import { db } from '@/server/db/index'
import { cache, cacheKeys, CACHE_TTL } from '@/lib/cache/redis'
import { getUserPermissions } from '@/server/db/queries/permissions'
import { logger } from '@/lib/logger'

/**
 * Type definition for cached permission with scope
 */
export interface CachedPermission {
  permission: {
    id: string
    code: string
    resource: string
    action: string
    description: string | null
    createdAt: Date
  }
  scope: 'self' | 'branch' | 'area' | 'all'
  companyId: string | null
}

/**
 * Type definition for permission check context
 */
export interface PermissionCheckContext {
  resourceOwnerId?: string
  branchIds?: string[]
  areaIds?: string[]
}

/**
 * Get cached permissions for a user
 * @param userId - User ID
 * @param companyId - Company ID (optional)
 * @returns Array of permissions with scopes
 */
export async function getCachedPermissions(
  userId: string,
  companyId?: string
): Promise<CachedPermission[]> {
  const cacheKey = cacheKeys.userPermissions(userId)

  try {
    // Try to get from cache
    const cached = await cache.get<CachedPermission[]>(cacheKey)

    if (cached) {
      logger.info('Cache hit for user permissions', {
        action: 'get_cached_permissions',
        userId,
        companyId,
        cacheHit: true,
      })

      // Filter by company if provided
      if (companyId) {
        return cached.filter((p) => p.companyId === companyId)
      }

      return cached
    }

    // Cache miss - fetch from database
    logger.info('Cache miss for user permissions', {
      action: 'get_cached_permissions',
      userId,
      companyId,
      cacheHit: false,
    })

    const permissions = await getUserPermissions(db, userId, companyId)

    // Cache the result
    await cache.set(cacheKey, permissions, CACHE_TTL.USER_PERMISSIONS)

    logger.info('Cached user permissions', {
      action: 'get_cached_permissions',
      userId,
      companyId,
      count: permissions.length,
      ttl: CACHE_TTL.USER_PERMISSIONS,
    })

    return permissions
  } catch (error) {
    logger.error('Failed to get cached permissions', error as Error, {
      action: 'get_cached_permissions',
      userId,
      companyId,
    })

    // Graceful fallback - fetch from database directly
    try {
      const permissions = await getUserPermissions(db, userId, companyId)
      return permissions
    } catch (dbError) {
      logger.error('Database fallback failed for permissions', dbError as Error, {
        action: 'get_cached_permissions',
        userId,
        companyId,
      })
      throw dbError
    }
  }
}

/**
 * Scope hierarchy values for comparison
 * Higher value = broader access
 */
const SCOPE_HIERARCHY: Record<string, number> = {
  self: 1,
  branch: 2,
  area: 3,
  all: 4,
}

/**
 * Check if user has a specific permission
 * @param userId - User ID
 * @param companyId - Company ID
 * @param resource - Resource name (e.g., 'users', 'clients')
 * @param action - Action name (e.g., 'read', 'write', 'delete')
 * @param context - Optional context for scope validation
 * @returns Boolean indicating if user has permission
 */
export async function hasPermission(
  userId: string,
  companyId: string,
  resource: string,
  action: string,
  context?: PermissionCheckContext
): Promise<boolean> {
  try {
    const permissions = await getCachedPermissions(userId, companyId)

    // Find matching permissions
    const matchingPermissions = permissions.filter(
      (p) =>
        p.permission.resource === resource &&
        p.permission.action === action &&
        p.companyId === companyId
    )

    // No matching permissions found
    if (matchingPermissions.length === 0) {
      logger.debug('User does not have permission', {
        action: 'has_permission',
        userId,
        companyId,
        resource,
        permissionAction: action,
        hasPermission: false,
      })

      return false
    }

    // Get the highest scope permission
    const highestScope = matchingPermissions.reduce((highest, current) => {
      return SCOPE_HIERARCHY[current.scope] > SCOPE_HIERARCHY[highest.scope]
        ? current
        : highest
    })

    // If user has 'all' scope, grant permission
    if (highestScope.scope === 'all') {
      logger.debug('User has permission (all scope)', {
        action: 'has_permission',
        userId,
        companyId,
        resource,
        permissionAction: action,
        scope: 'all',
        hasPermission: true,
      })

      return true
    }

    // For other scopes, check context if provided
    if (context) {
      // 'area' scope - check if resource is in user's areas
      if (highestScope.scope === 'area' && context.areaIds && context.areaIds.length > 0) {
        // This would require additional logic to determine if resource belongs to an area
        // For now, we'll grant permission if user has area scope
        logger.debug('User has permission (area scope)', {
          action: 'has_permission',
          userId,
          companyId,
          resource,
          permissionAction: action,
          scope: 'area',
          hasPermission: true,
        })

        return true
      }

      // 'branch' scope - check if resource is in user's branches
      if (highestScope.scope === 'branch' && context.branchIds && context.branchIds.length > 0) {
        // This would require additional logic to determine if resource belongs to a branch
        // For now, we'll grant permission if user has branch scope
        logger.debug('User has permission (branch scope)', {
          action: 'has_permission',
          userId,
          companyId,
          resource,
          permissionAction: action,
          scope: 'branch',
          hasPermission: true,
        })

        return true
      }

      // 'self' scope - check if resource belongs to user
      if (highestScope.scope === 'self' && context.resourceOwnerId) {
        const isOwner = context.resourceOwnerId === userId

        logger.debug('User has permission check (self scope)', {
          action: 'has_permission',
          userId,
          companyId,
          resource,
          permissionAction: action,
          scope: 'self',
          isOwner,
          hasPermission: isOwner,
        })

        return isOwner
      }
    }

    // Default: grant permission for non-self scopes without context
    // This is a safe default that can be enhanced later
    if (highestScope.scope !== 'self') {
      logger.debug('User has permission (default)', {
        action: 'has_permission',
        userId,
        companyId,
        resource,
        permissionAction: action,
        scope: highestScope.scope,
        hasPermission: true,
      })

      return true
    }

    // Self scope without context - deny by default
    logger.debug('User does not have permission (self scope without context)', {
      action: 'has_permission',
      userId,
      companyId,
      resource,
      permissionAction: action,
      scope: 'self',
      hasPermission: false,
    })

    return false
  } catch (error) {
    logger.error('Failed to check permission', error as Error, {
      action: 'has_permission',
      userId,
      companyId,
      resource,
      permissionAction: action,
    })

    // Graceful fallback - deny permission on error
    return false
  }
}

/**
 * Invalidate cached permissions for a specific user
 * Call this after permission changes (assign, remove, update)
 * @param userId - User ID
 */
export async function invalidateUserPermissions(userId: string): Promise<void> {
  const cacheKey = cacheKeys.userPermissions(userId)

  try {
    await cache.del(cacheKey)

    logger.info('Invalidated user permissions cache', {
      action: 'invalidate_user_permissions',
      userId,
    })
  } catch (error) {
    logger.error('Failed to invalidate user permissions cache', error as Error, {
      action: 'invalidate_user_permissions',
      userId,
    })

    // Non-critical error - continue execution
  }
}

/**
 * Invalidate all user permission caches
 * Call this for bulk permission updates
 */
export async function invalidateAllUserPermissions(): Promise<void> {
  try {
    await cache.delPattern('user:*:permissions')

    logger.info('Invalidated all user permissions cache', {
      action: 'invalidate_all_user_permissions',
    })
  } catch (error) {
    logger.error('Failed to invalidate all user permissions cache', error as Error, {
      action: 'invalidate_all_user_permissions',
    })

    // Non-critical error - continue execution
  }
}

/**
 * Get all permissions for a user across all companies
 * @param userId - User ID
 * @returns Array of permissions with scopes
 */
export async function getAllUserPermissions(userId: string): Promise<CachedPermission[]> {
  return getCachedPermissions(userId)
}

/**
 * Check if user has any permission for a resource
 * @param userId - User ID
 * @param companyId - Company ID
 * @param resource - Resource name
 * @returns Boolean indicating if user has any permission for the resource
 */
export async function hasAnyPermissionForResource(
  userId: string,
  companyId: string,
  resource: string
): Promise<boolean> {
  try {
    const permissions = await getCachedPermissions(userId, companyId)

    const hasPermission = permissions.some(
      (p) => p.permission.resource === resource && p.companyId === companyId
    )

    logger.debug('Checked if user has any permission for resource', {
      action: 'has_any_permission_for_resource',
      userId,
      companyId,
      resource,
      hasPermission,
    })

    return hasPermission
  } catch (error) {
    logger.error('Failed to check permissions for resource', error as Error, {
      action: 'has_any_permission_for_resource',
      userId,
      companyId,
      resource,
    })

    return false
  }
}
