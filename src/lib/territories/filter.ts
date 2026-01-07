/**
 * Territory filter service for Phase 3 Client Management
 */

import { db } from "@/server/db/index";
import { userBranches, userAreas } from "@/server/db/schema/users";
import { areaBranches } from "@/server/db/schema/organization";
import { eq, and } from "drizzle-orm";
import { cache, cacheKeys, CACHE_TTL } from "@/lib/cache/redis";
import { hasPermission } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import type { UserBranchFilter, BranchScope } from "@/lib/sync/types";

/**
 * Get cached branch IDs for a user
 * @param userId - User ID
 * @param companyId - Company ID
 * @returns Array of branch IDs
 */
export async function getUserBranchIds(
  userId: string,
  companyId: string,
): Promise<string[]> {
  const cacheKey = cacheKeys.userBranches(userId);

  try {
    // Try to get from cache
    const cached = await cache.get<string[]>(cacheKey);

    if (cached) {
      logger.info("Cache hit for user branches", {
        action: "get_user_branch_ids",
        userId,
        companyId,
        cacheHit: true,
        count: cached.length,
      });

      return cached;
    }

    // Cache miss - fetch from database
    logger.info("Cache miss for user branches", {
      action: "get_user_branch_ids",
      userId,
      companyId,
      cacheHit: false,
    });

    // Get direct branch assignments
    const directBranches = await db
      .select({
        branchId: userBranches.branchId,
      })
      .from(userBranches)
      .where(eq(userBranches.userId, userId));

    // Get branches through area assignments
    const areaBranchAssignments = await db
      .select({
        branchId: areaBranches.branchId,
      })
      .from(userAreas)
      .innerJoin(areaBranches, eq(userAreas.areaId, areaBranches.areaId))
      .where(eq(userAreas.userId, userId));

    // Combine and deduplicate
    const allBranchIds = [
      ...directBranches.map((b) => b.branchId),
      ...areaBranchAssignments.map((b) => b.branchId),
    ];
    const uniqueBranchIds = Array.from(new Set(allBranchIds));

    // Cache the result (TTL: 300 seconds = 5 minutes)
    await cache.set(cacheKey, uniqueBranchIds, CACHE_TTL.USER_PERMISSIONS);

    logger.info("Cached user branches", {
      action: "get_user_branch_ids",
      userId,
      companyId,
      count: uniqueBranchIds.length,
      ttl: CACHE_TTL.USER_PERMISSIONS,
    });

    return uniqueBranchIds;
  } catch (error) {
    logger.error("Failed to get user branch IDs", error as Error, {
      action: "get_user_branch_ids",
      userId,
      companyId,
    });

    // Graceful fallback - fetch from database directly
    try {
      // Get direct branch assignments
      const directBranches = await db
        .select({
          branchId: userBranches.branchId,
        })
        .from(userBranches)
        .where(eq(userBranches.userId, userId));

      // Get branches through area assignments
      const areaBranchAssignments = await db
        .select({
          branchId: areaBranches.branchId,
        })
        .from(userAreas)
        .innerJoin(areaBranches, eq(userAreas.areaId, areaBranches.areaId))
        .where(eq(userAreas.userId, userId));

      // Combine and deduplicate
      const allBranchIds = [
        ...directBranches.map((b) => b.branchId),
        ...areaBranchAssignments.map((b) => b.branchId),
      ];
      const uniqueBranchIds = Array.from(new Set(allBranchIds));

      return uniqueBranchIds;
    } catch (dbError) {
      logger.error(
        "Database fallback failed for user branches",
        dbError as Error,
        {
          action: "get_user_branch_ids",
          userId,
          companyId,
        },
      );
      throw dbError;
    }
  }
}

/**
 * Get user branch filter with scope and branch IDs
 * @param userId - User ID
 * @param companyId - Company ID
 * @returns User branch filter with scope and branch IDs
 */
export async function getUserBranchFilter(
  userId: string,
  companyId: string,
): Promise<UserBranchFilter> {
  try {
    // Check if user has 'clients.read' permission with 'all' scope
    const hasAllAccess = await hasPermission(
      userId,
      companyId,
      "clients",
      "read",
    );

    if (hasAllAccess) {
      logger.info("User has all access to clients", {
        action: "get_user_branch_filter",
        userId,
        companyId,
        scope: "all",
      });

      return {
        scope: "all",
        branchIds: [],
      };
    }

    // Get user's branch IDs
    const branchIds = await getUserBranchIds(userId, companyId);

    if (branchIds.length === 0) {
      logger.info("User has no branch access", {
        action: "get_user_branch_filter",
        userId,
        companyId,
        scope: "none",
      });

      return {
        scope: "none",
        branchIds: [],
      };
    }

    logger.info("User has territory access to clients", {
      action: "get_user_branch_filter",
      userId,
      companyId,
      scope: "territory",
      branchCount: branchIds.length,
    });

    return {
      scope: "territory",
      branchIds,
    };
  } catch (error) {
    logger.error("Failed to get user branch filter", error as Error, {
      action: "get_user_branch_filter",
      userId,
      companyId,
    });

    // Graceful fallback - deny access on error
    return {
      scope: "none",
      branchIds: [],
    };
  }
}

/**
 * Check if user can access a specific branch
 * @param userId - User ID
 * @param companyId - Company ID
 * @param branchId - Branch ID to check
 * @returns Boolean indicating if user can access the branch
 */
export async function canAccessBranch(
  userId: string,
  companyId: string,
  branchId: string,
): Promise<boolean> {
  try {
    const filter = await getUserBranchFilter(userId, companyId);

    // If user has 'all' scope, they can access any branch
    if (filter.scope === "all") {
      logger.debug("User can access branch (all scope)", {
        action: "can_access_branch",
        userId,
        companyId,
        branchId,
        canAccess: true,
      });

      return true;
    }

    // If user has 'none' scope, they can't access any branch
    if (filter.scope === "none") {
      logger.debug("User cannot access branch (none scope)", {
        action: "can_access_branch",
        userId,
        companyId,
        branchId,
        canAccess: false,
      });

      return false;
    }

    // Check if branch is in user's territory
    const canAccess = filter.branchIds.includes(branchId);

    logger.debug("User branch access check", {
      action: "can_access_branch",
      userId,
      companyId,
      branchId,
      canAccess,
    });

    return canAccess;
  } catch (error) {
    logger.error("Failed to check branch access", error as Error, {
      action: "can_access_branch",
      userId,
      companyId,
      branchId,
    });

    // Graceful fallback - deny access on error
    return false;
  }
}

/**
 * Invalidate cached branch IDs for a user
 * Call this after permission or territory changes
 * @param userId - User ID
 */
export async function invalidateUserBranchCache(userId: string): Promise<void> {
  const cacheKey = cacheKeys.userBranches(userId);

  try {
    await cache.del(cacheKey);

    logger.info("Invalidated user branch cache", {
      action: "invalidate_user_branch_cache",
      userId,
    });
  } catch (error) {
    logger.error("Failed to invalidate user branch cache", error as Error, {
      action: "invalidate_user_branch_cache",
      userId,
    });

    // Non-critical error - continue execution
  }
}

/**
 * Invalidate all user branch caches
 * Call this for bulk permission or territory updates
 */
export async function invalidateAllUserBranchCache(): Promise<void> {
  try {
    await cache.delPattern("user:*:branches");

    logger.info("Invalidated all user branch caches", {
      action: "invalidate_all_user_branch_cache",
    });
  } catch (error) {
    logger.error(
      "Failed to invalidate all user branch caches",
      error as Error,
      {
        action: "invalidate_all_user_branch_cache",
      },
    );

    // Non-critical error - continue execution
  }
}

/**
 * Filter clients by user's territory
 * @param userId - User ID
 * @param companyId - Company ID
 * @param clientBranchIds - Branch IDs of clients to filter
 * @returns Filtered branch IDs based on user's territory
 */
export async function filterClientsByTerritory(
  userId: string,
  companyId: string,
  clientBranchIds: string[],
): Promise<string[]> {
  try {
    const filter = await getUserBranchFilter(userId, companyId);

    // If user has 'all' scope, return all branch IDs
    if (filter.scope === "all") {
      return clientBranchIds;
    }

    // If user has 'none' scope, return empty array
    if (filter.scope === "none") {
      return [];
    }

    // Filter by user's territory
    const filteredBranchIds = clientBranchIds.filter((branchId) =>
      filter.branchIds.includes(branchId),
    );

    logger.info("Filtered clients by territory", {
      action: "filter_clients_by_territory",
      userId,
      companyId,
      originalCount: clientBranchIds.length,
      filteredCount: filteredBranchIds.length,
    });

    return filteredBranchIds;
  } catch (error) {
    logger.error("Failed to filter clients by territory", error as Error, {
      action: "filter_clients_by_territory",
      userId,
      companyId,
      clientBranchIds,
    });

    // Graceful fallback - return empty array on error
    return [];
  }
}
