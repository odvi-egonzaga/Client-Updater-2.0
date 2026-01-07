import { db } from "../index";
import { permissions, userPermissions } from "../schema/users";
import { eq, and, inArray } from "drizzle-orm";
import { logger } from "@/lib/logger";

/**
 * Get all permissions
 */
export async function getAllPermissions(db: any) {
  try {
    const result = await db
      .select()
      .from(permissions)
      .orderBy(permissions.resource, permissions.action);

    logger.info("Retrieved all permissions", {
      action: "get_all_permissions",
      count: result.length,
    });

    return result;
  } catch (error) {
    logger.error("Failed to retrieve permissions", error as Error, {
      action: "get_all_permissions",
    });
    throw error;
  }
}

/**
 * Get permissions for a specific resource
 */
export async function getPermissionsByResource(db: any, resource: string) {
  try {
    const result = await db
      .select()
      .from(permissions)
      .where(eq(permissions.resource, resource))
      .orderBy(permissions.action);

    logger.info("Retrieved permissions by resource", {
      action: "get_permissions_by_resource",
      resource,
      count: result.length,
    });

    return result;
  } catch (error) {
    logger.error("Failed to retrieve permissions by resource", error as Error, {
      action: "get_permissions_by_resource",
      resource,
    });
    throw error;
  }
}

/**
 * Get user's permissions with scopes
 */
export async function getUserPermissions(
  db: any,
  userId: string,
  companyId?: string,
) {
  try {
    let query = db
      .select({
        permission: permissions,
        scope: userPermissions.scope,
        companyId: userPermissions.companyId,
      })
      .from(userPermissions)
      .innerJoin(permissions, eq(userPermissions.permissionId, permissions.id))
      .where(eq(userPermissions.userId, userId));

    // Filter by company if provided
    if (companyId) {
      query = query.where(
        and(
          eq(userPermissions.userId, userId),
          eq(userPermissions.companyId, companyId),
        ),
      );
    }

    const result = await query;

    logger.info("Retrieved user permissions", {
      action: "get_user_permissions",
      userId,
      companyId,
      count: result.length,
    });

    return result;
  } catch (error) {
    logger.error("Failed to retrieve user permissions", error as Error, {
      action: "get_user_permissions",
      userId,
      companyId,
    });
    throw error;
  }
}

/**
 * Assign permission to user
 */
export async function assignPermissionToUser(
  db: any,
  userId: string,
  permissionId: string,
  companyId: string,
  scope: string = "self",
) {
  try {
    const result = await db
      .insert(userPermissions)
      .values({
        userId,
        permissionId,
        companyId,
        scope: scope as any,
      })
      .returning();

    logger.info("Assigned permission to user", {
      action: "assign_permission_to_user",
      userId,
      permissionId,
      companyId,
      scope,
    });

    return result[0];
  } catch (error) {
    logger.error("Failed to assign permission to user", error as Error, {
      action: "assign_permission_to_user",
      userId,
      permissionId,
      companyId,
      scope,
    });
    throw error;
  }
}

/**
 * Remove permission from user
 */
export async function removePermissionFromUser(
  db: any,
  userId: string,
  permissionId: string,
  companyId?: string,
) {
  try {
    let query = db
      .delete(userPermissions)
      .where(
        and(
          eq(userPermissions.userId, userId),
          eq(userPermissions.permissionId, permissionId),
        ),
      );

    if (companyId) {
      query = query.where(
        and(
          eq(userPermissions.userId, userId),
          eq(userPermissions.permissionId, permissionId),
          eq(userPermissions.companyId, companyId),
        ),
      );
    }

    const result = await query.returning();

    logger.info("Removed permission from user", {
      action: "remove_permission_from_user",
      userId,
      permissionId,
      companyId,
    });

    return result[0] || null;
  } catch (error) {
    logger.error("Failed to remove permission from user", error as Error, {
      action: "remove_permission_from_user",
      userId,
      permissionId,
      companyId,
    });
    throw error;
  }
}

/**
 * Replace all user permissions
 */
export async function setUserPermissions(
  db: any,
  userId: string,
  permissionsData: Array<{
    permissionId: string;
    companyId: string;
    scope: string;
  }>,
) {
  try {
    // Delete all existing permissions for the user
    await db.delete(userPermissions).where(eq(userPermissions.userId, userId));

    // Insert new permissions
    if (permissionsData.length > 0) {
      const result = await db
        .insert(userPermissions)
        .values(
          permissionsData.map((p) => ({
            userId,
            permissionId: p.permissionId,
            companyId: p.companyId,
            scope: p.scope as any,
          })),
        )
        .returning();

      logger.info("Set user permissions", {
        action: "set_user_permissions",
        userId,
        count: result.length,
      });

      return result;
    }

    logger.info("Cleared all user permissions", {
      action: "set_user_permissions",
      userId,
      count: 0,
    });

    return [];
  } catch (error) {
    logger.error("Failed to set user permissions", error as Error, {
      action: "set_user_permissions",
      userId,
    });
    throw error;
  }
}

/**
 * Check if user has permission
 */
export async function userHasPermission(
  db: any,
  userId: string,
  resource: string,
  action: string,
  companyId?: string,
): Promise<boolean> {
  try {
    let query = db
      .select()
      .from(userPermissions)
      .innerJoin(permissions, eq(userPermissions.permissionId, permissions.id))
      .where(
        and(
          eq(userPermissions.userId, userId),
          eq(permissions.resource, resource),
          eq(permissions.action, action),
        ),
      );

    if (companyId) {
      query = query.where(
        and(
          eq(userPermissions.userId, userId),
          eq(permissions.resource, resource),
          eq(permissions.action, action),
          eq(userPermissions.companyId, companyId),
        ),
      );
    }

    const result = await query.limit(1);

    logger.debug("Checked user permission", {
      action: "user_has_permission",
      userId,
      resource,
      permissionAction: action,
      companyId,
      hasPermission: result.length > 0,
    });

    return result.length > 0;
  } catch (error) {
    logger.error("Failed to check user permission", error as Error, {
      action: "user_has_permission",
      userId,
      resource,
      permissionAction: action,
      companyId,
    });
    throw error;
  }
}
