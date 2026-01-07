import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/server/db";
import {
  getAllAreas,
  getAllBranches,
  assignAreasToUser,
  assignBranchesToUser,
  removeAreasFromUser,
  removeBranchesFromUser,
} from "@/server/db/queries/territories";
import { getUserAreas, getUserBranches } from "@/server/db/queries/users";
import { logger } from "@/lib/logger";

export const userTerritoriesRoutes = new Hono();

// Validation schema for setting user territories
const setTerritoriesSchema = z.object({
  areaIds: z.array(z.string()).optional(),
  branchIds: z.array(z.string()).optional(),
});

/**
 * GET /api/territories/areas
 * List all areas for a company
 */
userTerritoriesRoutes.get("/areas", async (c) => {
  const start = performance.now();
  const companyId = c.req.query("companyId");

  if (!companyId) {
    return c.json(
      {
        success: false,
        error: {
          message: "companyId query parameter is required",
        },
      },
      400,
    );
  }

  try {
    const areas = await getAllAreas(db, companyId);

    logger.info("Retrieved all areas", {
      action: "get_all_areas",
      companyId,
      count: areas.length,
    });

    return c.json({
      success: true,
      data: areas,
    });
  } catch (error) {
    logger.error("Failed to retrieve areas", error as Error, {
      action: "get_all_areas",
      companyId,
    });

    return c.json(
      {
        success: false,
        error: {
          message:
            error instanceof Error ? error.message : "Failed to retrieve areas",
        },
      },
      500,
    );
  }
});

/**
 * GET /api/territories/branches
 * List all branches for a company
 */
userTerritoriesRoutes.get("/branches", async (c) => {
  const start = performance.now();
  const companyId = c.req.query("companyId");

  if (!companyId) {
    return c.json(
      {
        success: false,
        error: {
          message: "companyId query parameter is required",
        },
      },
      400,
    );
  }

  try {
    const branches = await getAllBranches(db, companyId);

    logger.info("Retrieved all branches", {
      action: "get_all_branches",
      companyId,
      count: branches.length,
    });

    return c.json({
      success: true,
      data: branches,
    });
  } catch (error) {
    logger.error("Failed to retrieve branches", error as Error, {
      action: "get_all_branches",
      companyId,
    });

    return c.json(
      {
        success: false,
        error: {
          message:
            error instanceof Error
              ? error.message
              : "Failed to retrieve branches",
        },
      },
      500,
    );
  }
});

/**
 * GET /api/users/:id/territories
 * Get user's areas and branches
 */
userTerritoriesRoutes.get("/:id/territories", async (c) => {
  const start = performance.now();
  const userId = c.req.param("id");

  try {
    const [areas, branches] = await Promise.all([
      getUserAreas(db, userId),
      getUserBranches(db, userId),
    ]);

    logger.info("Retrieved user territories", {
      action: "get_user_territories",
      userId,
      areaCount: areas.length,
      branchCount: branches.length,
    });

    return c.json({
      success: true,
      data: {
        areas,
        branches,
      },
    });
  } catch (error) {
    logger.error("Failed to retrieve user territories", error as Error, {
      action: "get_user_territories",
      userId,
    });

    return c.json(
      {
        success: false,
        error: {
          message:
            error instanceof Error
              ? error.message
              : "Failed to retrieve user territories",
        },
      },
      500,
    );
  }
});

/**
 * PUT /api/users/:id/territories
 * Set user's territories (replaces all existing territories)
 */
userTerritoriesRoutes.put(
  "/:id/territories",
  zValidator("json", setTerritoriesSchema),
  async (c) => {
    const start = performance.now();
    const userId = c.req.param("id");
    const { areaIds = [], branchIds = [] } = c.req.valid("json");

    try {
      // Get current user territories to determine what to remove
      const [currentAreas, currentBranches] = await Promise.all([
        getUserAreas(db, userId),
        getUserBranches(db, userId),
      ]);

      // Remove all current territories
      const currentAreaIds = currentAreas.map((a) => a.area.id);
      const currentBranchIds = currentBranches.map((b) => b.branch.id);

      await Promise.all([
        currentAreaIds.length > 0
          ? removeAreasFromUser(db, userId, currentAreaIds)
          : Promise.resolve([]),
        currentBranchIds.length > 0
          ? removeBranchesFromUser(db, userId, currentBranchIds)
          : Promise.resolve([]),
      ]);

      // Add new territories
      const [newAreas, newBranches] = await Promise.all([
        areaIds.length > 0
          ? assignAreasToUser(db, userId, areaIds)
          : Promise.resolve([]),
        branchIds.length > 0
          ? assignBranchesToUser(db, userId, branchIds)
          : Promise.resolve([]),
      ]);

      logger.info("Set user territories", {
        action: "set_user_territories",
        userId,
        areaCount: newAreas.length,
        branchCount: newBranches.length,
      });

      return c.json({
        success: true,
        data: {
          areas: newAreas,
          branches: newBranches,
        },
      });
    } catch (error) {
      logger.error("Failed to set user territories", error as Error, {
        action: "set_user_territories",
        userId,
      });

      return c.json(
        {
          success: false,
          error: {
            message:
              error instanceof Error
                ? error.message
                : "Failed to set user territories",
          },
        },
        500,
      );
    }
  },
);
