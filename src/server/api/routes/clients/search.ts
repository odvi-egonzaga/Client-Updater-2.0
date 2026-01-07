import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/server/db";
import { searchClients } from "@/server/db/queries/clients";
import { getUserBranchFilter } from "@/lib/territories/filter";
import { hasPermission } from "@/lib/permissions";
import { rateLimitMiddleware } from "@/server/api/middleware/rate-limit";
import { logger } from "@/lib/logger";

export const clientSearchRoutes = new Hono();

// Validation schema for search query parameters
const searchQuerySchema = z.object({
  q: z.string().min(2).max(100),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

/**
 * GET /api/clients/search
 * Autocomplete search for clients
 */
clientSearchRoutes.get(
  "/search",
  rateLimitMiddleware("read"),
  zValidator("query", searchQuerySchema),
  async (c) => {
    const start = performance.now();
    const userId = (c.get("userId") as any) ?? "anonymous";
    const orgId = (c.get("orgId") as any) ?? "default";
    const { q, limit } = c.req.valid("query");

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
          action: "search_clients",
          userId,
          orgId,
          query: q,
        });

        return c.json(
          {
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "You do not have permission to search clients",
            },
          },
          403,
        );
      }

      // Get user's branch filter for territory access
      const branchFilter = await getUserBranchFilter(userId, orgId);

      // If user has no access, return empty result
      if (branchFilter.scope === "none") {
        return c.json({
          success: true,
          data: [],
        });
      }

      // Search clients
      let searchResults = await searchClients(db, q, limit);

      // Filter by territory if user has territory access
      if (branchFilter.scope === "territory") {
        // We need to get the branch IDs from the search results and filter them
        // Since searchClients only returns id, clientCode, fullName, pensionNumber,
        // we need to get the full client records to check branch access
        // For performance, we'll filter the results by getting the branch IDs

        // Get full client records for the search results to check branch access
        const { getClientById } = await import("@/server/db/queries/clients");

        const filteredResults = [];
        for (const result of searchResults) {
          const client = await getClientById(db, result.id);
          if (
            client &&
            client.branchId &&
            branchFilter.branchIds.includes(client.branchId)
          ) {
            filteredResults.push(result);
          }
        }

        searchResults = filteredResults;
      }

      logger.info("Searched clients", {
        action: "search_clients",
        userId,
        orgId,
        query: q,
        limit,
        resultCount: searchResults.length,
      });

      return c.json({
        success: true,
        data: searchResults,
      });
    } catch (error) {
      logger.error("Failed to search clients", error as Error, {
        action: "search_clients",
        userId,
        orgId,
        query: q,
        limit,
      });

      return c.json(
        {
          success: false,
          error: {
            message:
              error instanceof Error
                ? error.message
                : "Failed to search clients",
          },
        },
        500,
      );
    }
  },
);
