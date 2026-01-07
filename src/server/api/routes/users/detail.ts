import { Hono } from "hono";
import { db } from "@/server/db";
import { getUserWithPermissions } from "@/server/db/queries/users";
import { logger } from "@/lib/logger";

export const userDetailRoutes = new Hono();

/**
 * GET /api/users/:id
 * Get user details with permissions, areas, and branches
 */
userDetailRoutes.get("/:id", async (c) => {
  const start = performance.now();
  const userId = c.req.param("id");

  try {
    const user = await getUserWithPermissions(db, userId);

    if (!user) {
      logger.warn("User not found", {
        action: "get_user_detail",
        userId,
      });

      return c.json(
        {
          success: false,
          error: {
            message: "User not found",
          },
        },
        404,
      );
    }

    logger.info("Retrieved user details", {
      action: "get_user_detail",
      userId,
    });

    return c.json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error("Failed to retrieve user details", error as Error, {
      action: "get_user_detail",
      userId,
    });

    return c.json(
      {
        success: false,
        error: {
          message:
            error instanceof Error ? error.message : "Failed to retrieve user",
        },
      },
      500,
    );
  }
});
