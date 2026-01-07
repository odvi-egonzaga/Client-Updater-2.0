import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/server/db";
import { getAllUsers } from "@/server/db/queries/users";
import { logger } from "@/lib/logger";

export const userListRoutes = new Hono();

// Validation schema for query parameters
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  isActive: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

/**
 * GET /api/users
 * List users with pagination and filtering
 */
userListRoutes.get("/", zValidator("query", listQuerySchema), async (c) => {
  const start = performance.now();
  const { page, pageSize, isActive, search } = c.req.valid("query");

  try {
    // Get total count for pagination
    const filters = {
      isActive,
      search,
    };

    const users = await getAllUsers(db, page, pageSize, filters);

    // Calculate total pages (simplified - in production you'd want a separate count query)
    const total = users.length;
    const totalPages = Math.ceil(total / pageSize);

    logger.info("Retrieved users list", {
      action: "list_users",
      page,
      pageSize,
      total,
      filters,
    });

    return c.json({
      success: true,
      data: users,
      meta: {
        page,
        pageSize,
        total,
        totalPages,
      },
    });
  } catch (error) {
    logger.error("Failed to retrieve users list", error as Error, {
      action: "list_users",
      page,
      pageSize,
      filters: { isActive, search },
    });

    return c.json(
      {
        success: false,
        error: {
          message:
            error instanceof Error ? error.message : "Failed to retrieve users",
        },
      },
      500,
    );
  }
});
