import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/server/db";
import {
  getRecentSyncJobs,
  getSyncJob,
  createSyncJob,
} from "@/server/db/queries/sync";
import { snowflakeSyncService } from "@/lib/sync/snowflake-sync";
import { hasPermission } from "@/lib/permissions";
import { rateLimitMiddleware } from "@/server/api/middleware/rate-limit";
import { logger } from "@/lib/logger";

export const syncJobsRoutes = new Hono();

// Validation schema for sync job creation
const createSyncJobSchema = z.object({
  type: z.enum(["snowflake", "nextbank"]),
  options: z
    .object({
      branchCodes: z.array(z.string()).optional(),
      dryRun: z.boolean().optional().default(false),
      fullSync: z.boolean().optional().default(false),
    })
    .optional(),
});

// Validation schema for sync job ID parameter
const jobParamSchema = z.object({
  id: z.string().min(1),
});

/**
 * GET /api/sync/jobs
 * List recent sync jobs
 */
syncJobsRoutes.get("/jobs", rateLimitMiddleware("read"), async (c) => {
  const start = performance.now();
  const userId = c.get("userId") as string;
  const orgId = c.get("orgId") as string;

  try {
    // Check permission
    const hasReadPermission = await hasPermission(
      userId,
      orgId,
      "sync",
      "execute",
    );
    if (!hasReadPermission) {
      logger.warn("User does not have sync:execute permission", {
        action: "list_sync_jobs",
        userId,
        orgId,
      });

      return c.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to view sync jobs",
          },
        },
        403,
      );
    }

    // Get recent sync jobs (limit 20)
    const jobs = await getRecentSyncJobs(db, 20);

    logger.info("Retrieved sync jobs", {
      action: "list_sync_jobs",
      userId,
      orgId,
      count: jobs.length,
    });

    return c.json({
      success: true,
      data: jobs,
    });
  } catch (error) {
    logger.error("Failed to retrieve sync jobs", error as Error, {
      action: "list_sync_jobs",
      userId,
      orgId,
    });

    return c.json(
      {
        success: false,
        error: {
          message:
            error instanceof Error
              ? error.message
              : "Failed to retrieve sync jobs",
        },
      },
      500,
    );
  }
});

/**
 * GET /api/sync/jobs/:id
 * Get single sync job details
 */
syncJobsRoutes.get(
  "/jobs/:id",
  rateLimitMiddleware("read"),
  zValidator("param", jobParamSchema),
  async (c) => {
    const start = performance.now();
    const userId = c.get("userId") as string;
    const orgId = c.get("orgId") as string;
    const { id } = c.req.valid("param");

    try {
      // Check permission
      const hasReadPermission = await hasPermission(
        userId,
        orgId,
        "sync",
        "execute",
      );
      if (!hasReadPermission) {
        logger.warn("User does not have sync:execute permission", {
          action: "get_sync_job",
          userId,
          orgId,
          jobId: id,
        });

        return c.json(
          {
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "You do not have permission to view sync job details",
            },
          },
          403,
        );
      }

      // Get sync job
      const job = await getSyncJob(db, id);

      if (!job) {
        logger.warn("Sync job not found", {
          action: "get_sync_job",
          userId,
          orgId,
          jobId: id,
        });

        return c.json(
          {
            success: false,
            error: {
              code: "NOT_FOUND",
              message: "Sync job not found",
            },
          },
          404,
        );
      }

      logger.info("Retrieved sync job details", {
        action: "get_sync_job",
        userId,
        orgId,
        jobId: id,
      });

      return c.json({
        success: true,
        data: job,
      });
    } catch (error) {
      logger.error("Failed to retrieve sync job details", error as Error, {
        action: "get_sync_job",
        userId,
        orgId,
        jobId: id,
      });

      return c.json(
        {
          success: false,
          error: {
            message:
              error instanceof Error
                ? error.message
                : "Failed to retrieve sync job details",
          },
        },
        500,
      );
    }
  },
);

/**
 * POST /api/sync/jobs
 * Trigger sync
 */
syncJobsRoutes.post(
  "/jobs",
  rateLimitMiddleware("write"),
  zValidator("json", createSyncJobSchema),
  async (c) => {
    const start = performance.now();
    const userId = c.get("userId") as string;
    const orgId = c.get("orgId") as string;
    const { type, options } = c.req.valid("json");

    try {
      // Check permission
      const hasExecutePermission = await hasPermission(
        userId,
        orgId,
        "sync",
        "execute",
      );
      if (!hasExecutePermission) {
        logger.warn("User does not have sync:execute permission", {
          action: "create_sync_job",
          userId,
          orgId,
          type,
        });

        return c.json(
          {
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "You do not have permission to execute sync jobs",
            },
          },
          403,
        );
      }

      let syncResult;

      // Handle different sync types
      if (type === "snowflake") {
        // Execute Snowflake sync
        syncResult = await snowflakeSyncService.sync({
          branchCodes: options?.branchCodes,
          recordChanges: !options?.dryRun,
        });
      } else if (type === "nextbank") {
        // NextBank sync not implemented yet
        return c.json(
          {
            success: false,
            error: {
              code: "NOT_IMPLEMENTED",
              message: "NextBank sync is not yet implemented",
            },
          },
          501,
        );
      } else {
        return c.json(
          {
            success: false,
            error: {
              code: "INVALID_TYPE",
              message: "Invalid sync type",
            },
          },
          400,
        );
      }

      logger.info("Sync job completed", {
        action: "create_sync_job",
        userId,
        orgId,
        type,
        syncResult,
      });

      return c.json({
        success: true,
        data: syncResult,
      });
    } catch (error) {
      logger.error("Failed to execute sync job", error as Error, {
        action: "create_sync_job",
        userId,
        orgId,
        type,
        options,
      });

      return c.json(
        {
          success: false,
          error: {
            message:
              error instanceof Error
                ? error.message
                : "Failed to execute sync job",
          },
        },
        500,
      );
    }
  },
);

/**
 * POST /api/sync/jobs/preview
 * Preview sync (dry run)
 */
syncJobsRoutes.post(
  "/jobs/preview",
  rateLimitMiddleware("write"),
  zValidator("json", createSyncJobSchema),
  async (c) => {
    const start = performance.now();
    const userId = c.get("userId") as string;
    const orgId = c.get("orgId") as string;
    const { type, options } = c.req.valid("json");

    try {
      // Check permission
      const hasExecutePermission = await hasPermission(
        userId,
        orgId,
        "sync",
        "execute",
      );
      if (!hasExecutePermission) {
        logger.warn("User does not have sync:execute permission", {
          action: "preview_sync_job",
          userId,
          orgId,
          type,
        });

        return c.json(
          {
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "You do not have permission to preview sync jobs",
            },
          },
          403,
        );
      }

      let previewResult;

      // Handle different sync types
      if (type === "snowflake") {
        // Fetch preview from Snowflake
        previewResult = await snowflakeSyncService.fetchPreview(
          options?.branchCodes,
          100,
        );
      } else if (type === "nextbank") {
        // NextBank sync not implemented yet
        return c.json(
          {
            success: false,
            error: {
              code: "NOT_IMPLEMENTED",
              message: "NextBank sync is not yet implemented",
            },
          },
          501,
        );
      } else {
        return c.json(
          {
            success: false,
            error: {
              code: "INVALID_TYPE",
              message: "Invalid sync type",
            },
          },
          400,
        );
      }

      logger.info("Sync preview completed", {
        action: "preview_sync_job",
        userId,
        orgId,
        type,
        previewCount: previewResult.length,
      });

      return c.json({
        success: true,
        data: previewResult,
      });
    } catch (error) {
      logger.error("Failed to preview sync job", error as Error, {
        action: "preview_sync_job",
        userId,
        orgId,
        type,
        options,
      });

      return c.json(
        {
          success: false,
          error: {
            message:
              error instanceof Error
                ? error.message
                : "Failed to preview sync job",
          },
        },
        500,
      );
    }
  },
);
