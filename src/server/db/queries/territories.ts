import { db } from "../index";
import { areas, branches, areaBranches } from "../schema/organization";
import { userAreas, userBranches } from "../schema/users";
import { eq, and, inArray, isNull } from "drizzle-orm";
import { logger } from "@/lib/logger";

/**
 * Get all areas for a company
 */
export async function getAllAreas(db: any, companyId: string) {
  try {
    const result = await db
      .select()
      .from(areas)
      .where(and(eq(areas.companyId, companyId), isNull(areas.deletedAt)))
      .orderBy(areas.name);

    logger.info("Retrieved all areas", {
      action: "get_all_areas",
      companyId,
      count: result.length,
    });

    return result;
  } catch (error) {
    logger.error("Failed to retrieve areas", error as Error, {
      action: "get_all_areas",
      companyId,
    });
    throw error;
  }
}

/**
 * Get all branches for a company
 */
export async function getAllBranches(db: any, companyId: string) {
  try {
    const result = await db
      .select()
      .from(branches)
      .where(isNull(branches.deletedAt))
      .orderBy(branches.name);

    logger.info("Retrieved all branches", {
      action: "get_all_branches",
      companyId,
      count: result.length,
    });

    return result;
  } catch (error) {
    logger.error("Failed to retrieve branches", error as Error, {
      action: "get_all_branches",
      companyId,
    });
    throw error;
  }
}

/**
 * Assign branches to user
 */
export async function assignBranchesToUser(
  db: any,
  userId: string,
  branchIds: string[],
) {
  try {
    if (branchIds.length === 0) {
      return [];
    }

    const result = await db
      .insert(userBranches)
      .values(
        branchIds.map((branchId) => ({
          userId,
          branchId,
        })),
      )
      .returning();

    logger.info("Assigned branches to user", {
      action: "assign_branches_to_user",
      userId,
      count: result.length,
    });

    return result;
  } catch (error) {
    logger.error("Failed to assign branches to user", error as Error, {
      action: "assign_branches_to_user",
      userId,
      branchIds,
    });
    throw error;
  }
}

/**
 * Assign areas to user
 */
export async function assignAreasToUser(
  db: any,
  userId: string,
  areaIds: string[],
) {
  try {
    if (areaIds.length === 0) {
      return [];
    }

    const result = await db
      .insert(userAreas)
      .values(
        areaIds.map((areaId) => ({
          userId,
          areaId,
        })),
      )
      .returning();

    logger.info("Assigned areas to user", {
      action: "assign_areas_to_user",
      userId,
      count: result.length,
    });

    return result;
  } catch (error) {
    logger.error("Failed to assign areas to user", error as Error, {
      action: "assign_areas_to_user",
      userId,
      areaIds,
    });
    throw error;
  }
}

/**
 * Remove branches from user
 */
export async function removeBranchesFromUser(
  db: any,
  userId: string,
  branchIds: string[],
) {
  try {
    if (branchIds.length === 0) {
      return [];
    }

    const result = await db
      .delete(userBranches)
      .where(
        and(
          eq(userBranches.userId, userId),
          inArray(userBranches.branchId, branchIds),
        ),
      )
      .returning();

    logger.info("Removed branches from user", {
      action: "remove_branches_from_user",
      userId,
      count: result.length,
    });

    return result;
  } catch (error) {
    logger.error("Failed to remove branches from user", error as Error, {
      action: "remove_branches_from_user",
      userId,
      branchIds,
    });
    throw error;
  }
}

/**
 * Remove areas from user
 */
export async function removeAreasFromUser(
  db: any,
  userId: string,
  areaIds: string[],
) {
  try {
    if (areaIds.length === 0) {
      return [];
    }

    const result = await db
      .delete(userAreas)
      .where(
        and(eq(userAreas.userId, userId), inArray(userAreas.areaId, areaIds)),
      )
      .returning();

    logger.info("Removed areas from user", {
      action: "remove_areas_from_user",
      userId,
      count: result.length,
    });

    return result;
  } catch (error) {
    logger.error("Failed to remove areas from user", error as Error, {
      action: "remove_areas_from_user",
      userId,
      areaIds,
    });
    throw error;
  }
}

/**
 * Get branches user can access (direct + via areas)
 */
export async function getUserAccessibleBranches(db: any, userId: string) {
  try {
    // Get branches directly assigned to user
    const directBranches = await db
      .select({
        id: branches.id,
        code: branches.code,
        name: branches.name,
        location: branches.location,
        category: branches.category,
      })
      .from(userBranches)
      .innerJoin(branches, eq(userBranches.branchId, branches.id))
      .where(and(eq(userBranches.userId, userId), isNull(branches.deletedAt)));

    // Get branches assigned via areas
    const areaBranchesResult = await db
      .select({
        id: branches.id,
        code: branches.code,
        name: branches.name,
        location: branches.location,
        category: branches.category,
      })
      .from(userAreas)
      .innerJoin(areaBranches, eq(userAreas.areaId, areaBranches.areaId))
      .innerJoin(branches, eq(areaBranches.branchId, branches.id))
      .where(and(eq(userAreas.userId, userId), isNull(branches.deletedAt)));

    // Combine and deduplicate branches
    const allBranches = [...directBranches, ...areaBranchesResult];
    const uniqueBranches = Array.from(
      new Map(allBranches.map((branch) => [branch.id, branch])).values(),
    );

    logger.info("Retrieved user accessible branches", {
      action: "get_user_accessible_branches",
      userId,
      count: uniqueBranches.length,
    });

    return uniqueBranches;
  } catch (error) {
    logger.error("Failed to get user accessible branches", error as Error, {
      action: "get_user_accessible_branches",
      userId,
    });
    throw error;
  }
}
