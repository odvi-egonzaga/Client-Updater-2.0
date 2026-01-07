import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/server/db";
import {
  getClientWithDetails,
  getClientSyncHistory,
} from "@/server/db/queries/clients";
import { canAccessBranch } from "@/lib/territories/filter";
import { hasPermission } from "@/lib/permissions";
import { rateLimitMiddleware } from "@/server/api/middleware/rate-limit";
import { logger } from "@/lib/logger";

export const clientDetailRoutes = new Hono();

// Validation schema for client ID parameter
const clientParamSchema = z.object({
  id: z.string().min(1),
});

/**
 * GET /api/clients/:id
 * Get client details with access check
 */
clientDetailRoutes.get(
  "/:id",
  rateLimitMiddleware("read"),
  zValidator("param", clientParamSchema),
  async (c) => {
    const start = performance.now();
    const userId = (c.get("userId") as any) ?? "anonymous";
    const orgId = (c.get("orgId") as any) ?? "default";
    const { id } = c.req.valid("param") as any;

    try {
      // Check permission
      const hasReadPermission = await hasPermission(
        userId,
        orgId,
        "clients",
        "read",
      );
      if (!hasReadPermission) {
        logger.warn("User does not have clients:read permission", {
          action: "get_client",
          userId,
          orgId,
          clientId: id,
        });

        return c.json(
          {
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "You do not have permission to view client details",
            },
          },
          403,
        );
      }

      // Get client with details
      const client = await getClientWithDetails(db, id);

      if (!client) {
        logger.warn("Client not found", {
          action: "get_client",
          userId,
          orgId,
          clientId: id,
        });

        return c.json(
          {
            success: false,
            error: {
              code: "NOT_FOUND",
              message: "Client not found",
            },
          },
          404,
        );
      }

      // Check branch access
      if (client.branchId) {
        const canAccess = await canAccessBranch(userId, orgId, client.branchId);
        if (!canAccess) {
          logger.warn("User does not have access to client branch", {
            action: "get_client",
            userId,
            orgId,
            clientId: id,
            branchId: client.branchId,
          });

          return c.json(
            {
              success: false,
              error: {
                code: "FORBIDDEN",
                message: "You do not have permission to view this client",
              },
            },
            403,
          );
        }
      }

      logger.info("Retrieved client details", {
        action: "get_client",
        userId,
        orgId,
        clientId: id,
      });

      return c.json({
        success: true,
        data: client,
      });
    } catch (error) {
      logger.error("Failed to retrieve client details", error as Error, {
        action: "get_client",
        userId,
        orgId,
        clientId: id,
      });

      return c.json(
        {
          success: false,
          error: {
            message:
              error instanceof Error
                ? error.message
                : "Failed to retrieve client details",
          },
        },
        500,
      );
    }
  },
);

/**
 * GET /api/clients/:id/sync-history
 * Get sync history for a client
 */
clientDetailRoutes.get(
  "/:id/sync-history",
  rateLimitMiddleware("read"),
  zValidator("param", clientParamSchema),
  async (c) => {
    const start = performance.now();
    const userId = (c.get("userId") as any) ?? "anonymous";
    const orgId = (c.get("orgId") as any) ?? "default";
    const { id } = c.req.valid("param");

    try {
      // Check permission
      const hasReadPermission = await hasPermission(
        userId,
        orgId,
        "clients",
        "read",
      );
      if (!hasReadPermission) {
        logger.warn("User does not have clients:read permission", {
          action: "get_client_sync_history",
          userId,
          orgId,
          clientId: id,
        });

        return c.json(
          {
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "You do not have permission to view client sync history",
            },
          },
          403,
        );
      }

      // Get client to check branch access
      const client = await getClientWithDetails(db, id);

      if (!client) {
        logger.warn("Client not found", {
          action: "get_client_sync_history",
          userId,
          orgId,
          clientId: id,
        });

        return c.json(
          {
            success: false,
            error: {
              code: "NOT_FOUND",
              message: "Client not found",
            },
          },
          404,
        );
      }

      // Check branch access
      if (client.branchId) {
        const canAccess = await canAccessBranch(userId, orgId, client.branchId);
        if (!canAccess) {
          logger.warn("User does not have access to client branch", {
            action: "get_client_sync_history",
            userId,
            orgId,
            clientId: id,
            branchId: client.branchId,
          });

          return c.json(
            {
              success: false,
              error: {
                code: "FORBIDDEN",
                message:
                  "You do not have permission to view this client sync history",
              },
            },
            403,
          );
        }
      }

      // Get sync history
      const syncHistory = await getClientSyncHistory(db, id);

      logger.info("Retrieved client sync history", {
        action: "get_client_sync_history",
        userId,
        orgId,
        clientId: id,
        count: syncHistory.length,
      });

      return c.json({
        success: true,
        data: syncHistory,
      });
    } catch (error) {
      logger.error("Failed to retrieve client sync history", error as Error, {
        action: "get_client_sync_history",
        userId,
        orgId,
        clientId: id,
      });

      return c.json(
        {
          success: false,
          error: {
            message:
              error instanceof Error
                ? error.message
                : "Failed to retrieve client sync history",
          },
        },
        500,
      );
    }
  },
);
