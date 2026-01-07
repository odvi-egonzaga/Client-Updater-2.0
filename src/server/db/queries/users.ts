import { db } from "../index";
import {
  users,
  permissions,
  userPermissions,
  userAreas,
  userBranches,
  userSessions,
} from "../schema/users";
import { eq, and, isNull, desc, sql, or, like } from "drizzle-orm";
import { logger } from "@/lib/logger";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";

export type UserFilters = {
  isActive?: boolean;
  search?: string;
};

export type UserWithPermissions = typeof users.$inferSelect & {
  permissions?: Array<{
    permission: typeof permissions.$inferSelect;
    scope: string;
  }>;
  areas?: Array<{
    area: any;
  }>;
  branches?: Array<{
    branch: any;
  }>;
};

/**
 * Get all users with pagination and filters
 */
export async function getAllUsers(
  db: any,
  page: number = 1,
  pageSize: number = 25,
  filters?: UserFilters,
) {
  const offset = (page - 1) * pageSize;
  const limit = Math.min(pageSize, 100); // Max 100 per page

  try {
    let query = db.select().from(users);

    // Apply filters
    if (filters) {
      const conditions = [];

      // Filter out deleted users
      conditions.push(isNull(users.deletedAt));

      // Filter by active status
      if (filters.isActive !== undefined) {
        conditions.push(eq(users.isActive, filters.isActive));
      }

      // Search by email, first name, or last name
      if (filters.search) {
        const searchTerm = `%${filters.search}%`;
        conditions.push(
          or(
            like(users.email, searchTerm),
            like(users.firstName, searchTerm),
            like(users.lastName, searchTerm),
          ),
        );
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    } else {
      // Always filter out deleted users
      query = query.where(isNull(users.deletedAt));
    }

    const result = await query
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    logger.info("Retrieved users", {
      action: "get_all_users",
      count: result.length,
      page,
      pageSize,
    });

    return result;
  } catch (error) {
    logger.error("Failed to retrieve users", error as Error, {
      action: "get_all_users",
      page,
      pageSize,
      filters,
    });
    throw error;
  }
}

/**
 * Get user by ID
 */
export async function getUserById(id: string) {
  try {
    const user = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user[0] ?? null;
  } catch (error) {
    logger.error("Failed to get user by ID", error as Error, {
      action: "get_user_by_id",
      userId: id,
    });
    throw error;
  }
}

/**
 * Get user by Clerk ID
 */
export async function getUserByClerkId(clerkId: string) {
  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1);
    return user[0] ?? null;
  } catch (error) {
    logger.error("Failed to get user by Clerk ID", error as Error, {
      action: "get_user_by_clerk_id",
      clerkId,
    });
    throw error;
  }
}

/**
 * Get user with all permissions, areas, and branches
 */
export async function getUserWithPermissions(db: any, userId: string) {
  try {
    const user = await db
      .select({
        user: users,
        permission: permissions,
        permissionScope: userPermissions.scope,
      })
      .from(users)
      .leftJoin(userPermissions, eq(users.id, userPermissions.userId))
      .leftJoin(permissions, eq(userPermissions.permissionId, permissions.id))
      .where(eq(users.id, userId))
      .limit(1);

    if (!user[0]) {
      return null;
    }

    // Get user areas
    const areas = await db
      .select()
      .from(userAreas)
      .where(eq(userAreas.userId, userId));

    // Get user branches
    const branches = await db
      .select()
      .from(userBranches)
      .where(eq(userBranches.userId, userId));

    logger.info("Retrieved user with permissions", {
      action: "get_user_with_permissions",
      userId,
    });

    return {
      ...user[0].user,
      permissions: user
        .filter((u: any) => u.permission)
        .map((u: any) => ({
          permission: u.permission,
          scope: u.permissionScope,
        })),
      areas,
      branches,
    };
  } catch (error) {
    logger.error("Failed to get user with permissions", error as Error, {
      action: "get_user_with_permissions",
      userId,
    });
    throw error;
  }
}

/**
 * Create a new user
 */
export async function createUser(db: any, data: typeof users.$inferInsert) {
  try {
    const result = await db.insert(users).values(data).returning();

    logger.info("Created new user", {
      action: "create_user",
      userId: result[0].id,
      email: data.email,
    });

    return result[0];
  } catch (error) {
    logger.error("Failed to create user", error as Error, {
      action: "create_user",
      email: data.email,
    });
    throw error;
  }
}

/**
 * Update user fields
 */
export async function updateUser(
  db: any,
  userId: string,
  data: Partial<typeof users.$inferInsert>,
) {
  try {
    const result = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!result[0]) {
      return null;
    }

    logger.info("Updated user", {
      action: "update_user",
      userId,
    });

    return result[0];
  } catch (error) {
    logger.error("Failed to update user", error as Error, {
      action: "update_user",
      userId,
    });
    throw error;
  }
}

/**
 * Soft delete user (set deletedAt)
 */
export async function deactivateUser(db: any, userId: string) {
  try {
    const result = await db
      .update(users)
      .set({
        deletedAt: new Date(),
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!result[0]) {
      return null;
    }

    logger.info("Deactivated user", {
      action: "deactivate_user",
      userId,
    });

    return result[0];
  } catch (error) {
    logger.error("Failed to deactivate user", error as Error, {
      action: "deactivate_user",
      userId,
    });
    throw error;
  }
}

/**
 * Restore user (clear deletedAt)
 */
export async function activateUser(db: any, userId: string) {
  try {
    const result = await db
      .update(users)
      .set({
        deletedAt: null,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!result[0]) {
      return null;
    }

    logger.info("Activated user", {
      action: "activate_user",
      userId,
    });

    return result[0];
  } catch (error) {
    logger.error("Failed to activate user", error as Error, {
      action: "activate_user",
      userId,
    });
    throw error;
  }
}

/**
 * Toggle user active status
 */
export async function toggleUserStatus(
  db: any,
  userId: string,
  isActive: boolean,
) {
  try {
    const result = await db
      .update(users)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!result[0]) {
      return null;
    }

    logger.info("Toggled user status", {
      action: "toggle_user_status",
      userId,
      isActive,
    });

    return result[0];
  } catch (error) {
    logger.error("Failed to toggle user status", error as Error, {
      action: "toggle_user_status",
      userId,
      isActive,
    });
    throw error;
  }
}

/**
 * Get user's assigned branches
 */
export async function getUserBranches(db: any, userId: string) {
  try {
    const result = await db
      .select({
        branch: {
          id: userBranches.branchId,
        },
      })
      .from(userBranches)
      .where(eq(userBranches.userId, userId));

    logger.info("Retrieved user branches", {
      action: "get_user_branches",
      userId,
      count: result.length,
    });

    return result;
  } catch (error) {
    logger.error("Failed to get user branches", error as Error, {
      action: "get_user_branches",
      userId,
    });
    throw error;
  }
}

/**
 * Get user's assigned areas
 */
export async function getUserAreas(db: any, userId: string) {
  try {
    const result = await db
      .select({
        area: {
          id: userAreas.areaId,
        },
      })
      .from(userAreas)
      .where(eq(userAreas.userId, userId));

    logger.info("Retrieved user areas", {
      action: "get_user_areas",
      userId,
      count: result.length,
    });

    return result;
  } catch (error) {
    logger.error("Failed to get user areas", error as Error, {
      action: "get_user_areas",
      userId,
    });
    throw error;
  }
}

/**
 * Record successful login
 */
export async function recordUserLogin(
  db: any,
  userId: string,
  ipAddress: string,
  userAgent: string,
) {
  try {
    const result = await db
      .update(users)
      .set({
        lastLoginAt: new Date(),
        loginCount: sql`${users.loginCount} + 1`,
        failedLoginCount: 0,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!result[0]) {
      return null;
    }

    logger.info("Recorded user login", {
      action: "record_user_login",
      userId,
      ipAddress,
    });

    return result[0];
  } catch (error) {
    logger.error("Failed to record user login", error as Error, {
      action: "record_user_login",
      userId,
      ipAddress,
    });
    throw error;
  }
}

/**
 * Record failed login
 */
export async function recordFailedLogin(
  db: any,
  userId: string,
  ipAddress: string,
) {
  try {
    const result = await db
      .update(users)
      .set({
        failedLoginCount: sql`${users.failedLoginCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!result[0]) {
      return null;
    }

    logger.warn("Recorded failed login", {
      action: "record_failed_login",
      userId,
      ipAddress,
      failedCount: result[0].failedLoginCount,
    });

    return result[0];
  } catch (error) {
    logger.error("Failed to record failed login", error as Error, {
      action: "record_failed_login",
      userId,
      ipAddress,
    });
    throw error;
  }
}

/**
 * Lock user account for specified duration (in minutes)
 */
export async function lockUser(db: any, userId: string, duration: number) {
  try {
    const lockedUntil = new Date();
    lockedUntil.setMinutes(lockedUntil.getMinutes() + duration);

    const result = await db
      .update(users)
      .set({
        lockedUntil,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!result[0]) {
      return null;
    }

    logger.warn("Locked user account", {
      action: "lock_user",
      userId,
      duration,
      lockedUntil,
    });

    return result[0];
  } catch (error) {
    logger.error("Failed to lock user account", error as Error, {
      action: "lock_user",
      userId,
      duration,
    });
    throw error;
  }
}

/**
 * Unlock user account
 */
export async function unlockUser(db: any, userId: string) {
  try {
    const result = await db
      .update(users)
      .set({
        lockedUntil: null,
        failedLoginCount: 0,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!result[0]) {
      return null;
    }

    logger.info("Unlocked user account", {
      action: "unlock_user",
      userId,
    });

    return result[0];
  } catch (error) {
    logger.error("Failed to unlock user account", error as Error, {
      action: "unlock_user",
      userId,
    });
    throw error;
  }
}
