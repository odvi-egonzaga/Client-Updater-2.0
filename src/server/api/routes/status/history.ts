import { ApiHono } from "@/server/api/types";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/server/db";
import { statusEvents, statusTypes, statusReasons } from "@/server/db/schema";
import { hasPermission } from "@/lib/permissions";
import { rateLimitMiddleware } from "@/server/api/middleware/rate-limit";
import { logger } from "@/lib/logger";
import { users } from "@/server/db/schema/users";
import { eq, sql } from "drizzle-orm";

export const statusHistoryRoutes = new ApiHono();

/**
 * GET /api/status/history/:id
 * Get single history record by ID
 */
statusHistoryRoutes.get(
  "/history/:id",
  rateLimitMiddleware("read"),
  zValidator("param", z.object({ id: z.string() })),
  async (c) => {
    const start = performance.now();
    const userId = c.get("userId");
    const orgId = c.get("orgId");
    const companyId = orgId ?? "default";
    const { id } = c.req.valid("param");

    try {
      // Check permission
      const hasReadPermission = await hasPermission(
        userId,
        companyId,
        "status",
        "read",
      );
      if (!hasReadPermission) {
        logger.warn("User does not have status:read permission", {
          action: "get_status_history",
          userId,
          orgId,
          historyId: id,
        });

        return c.json(
          {
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "You do not have permission to view status history",
            },
          },
          403,
        );
      }

      // Get status event
      const event = await db
        .select({
          id: statusEvents.id,
          eventSequence: statusEvents.eventSequence,
          statusTypeId: statusEvents.statusTypeId,
          statusTypeName: statusTypes.name,
          reasonId: statusEvents.reasonId,
          reasonName: statusReasons.name,
          remarks: statusEvents.remarks,
          hasPayment: statusEvents.hasPayment,
          createdBy: statusEvents.createdBy,
          createdAt: statusEvents.createdAt,
        })
        .from(statusEvents)
        .leftJoin(statusTypes, eq(statusEvents.statusTypeId, statusTypes.id))
        .leftJoin(statusReasons, eq(statusEvents.reasonId, statusReasons.id))
        .where(eq(statusEvents.id, id))
        .limit(1);

      if (!event[0]) {
        return c.json(
          {
            success: false,
            error: {
              code: "NOT_FOUND",
              message: "Status history record not found",
            },
          },
          404,
        );
      }

      // Get user info for createdBy
      let createdBy = null;
      if (event[0].createdBy) {
        const user = await db
          .select({
            id: users.id,
            name: sql`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.email})`.as("name"),
          })
          .from(users)
          .where(eq(users.id, event[0].createdBy))
          .limit(1);

        if (user[0]) {
          createdBy = {
            id: user[0].id,
            name: user[0].name as string,
          };
        }
      }

      // Build response
      const response = {
        id: event[0].id,
        eventSequence: event[0].eventSequence,
        status: {
          id: event[0].statusTypeId,
          name: event[0].statusTypeName,
          code: event[0].statusTypeName, // Using name as code for now
        },
        reason: event[0].reasonId
          ? {
              id: event[0].reasonId,
              name: event[0].reasonName,
              code: event[0].reasonName, // Using name as code for now
            }
          : null,
        remarks: event[0].remarks,
        hasPayment: event[0].hasPayment,
        createdBy: createdBy || {
          id: event[0].createdBy,
          name: "Unknown",
        },
        createdAt: event[0].createdAt,
      };

      logger.info("Retrieved status history", {
        action: "get_status_history",
        userId,
        orgId,
        historyId: id,
        duration: performance.now() - start,
      });

      return c.json({
        success: true,
        data: response,
      });
    } catch (error) {
      logger.error("Failed to retrieve status history", error as Error, {
        action: "get_status_history",
        userId,
        orgId,
        historyId: id,
      });

      return c.json(
        {
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to retrieve status history",
            details: error instanceof Error ? error.message : undefined,
          },
        },
        500,
      );
    }
  },
);
