/**
 * Sync job queries for Phase 3 Client Management
 */

import { db } from "../index";
import { syncJobs } from "../schema/jobs";
import { eq, desc, and } from "drizzle-orm";
import { logger } from "@/lib/logger";
import type { SyncJobOptions } from "@/lib/sync/types";

/**
 * Create a new sync job
 * @param db - Database instance
 * @param type - Sync job type ('snowflake' | 'nextbank')
 * @param options - Optional sync job options
 * @returns Created sync job
 */
export async function createSyncJob(
  db: any,
  type: "snowflake" | "nextbank",
  options?: SyncJobOptions,
) {
  try {
    const jobData: any = {
      type,
      status: "pending",
      parameters: options?.parameters || {},
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
    };

    if (options?.createdBy) {
      jobData.createdBy = options.createdBy;
    }

    const result = await db.insert(syncJobs).values(jobData).returning();

    logger.info("Created sync job", {
      action: "create_sync_job",
      jobId: result[0].id,
      type,
      createdBy: options?.createdBy,
    });

    return result[0];
  } catch (error) {
    logger.error("Failed to create sync job", error as Error, {
      action: "create_sync_job",
      type,
      options,
    });
    throw error;
  }
}

/**
 * Update sync job status, counts, or error
 * @param db - Database instance
 * @param jobId - Sync job ID
 * @param updates - Updates to apply (status, recordsProcessed, recordsCreated, recordsUpdated, error, startedAt, completedAt)
 * @returns Updated sync job
 */
export async function updateSyncJob(
  db: any,
  jobId: string,
  updates: Partial<{
    status: "pending" | "processing" | "completed" | "failed" | "dead";
    recordsProcessed: number;
    recordsCreated: number;
    recordsUpdated: number;
    startedAt: Date;
    completedAt: Date;
    error: string | null;
  }>,
) {
  try {
    const result = await db
      .update(syncJobs)
      .set(updates)
      .where(eq(syncJobs.id, jobId))
      .returning();

    if (!result[0]) {
      logger.warn("Sync job not found for update", {
        action: "update_sync_job",
        jobId,
      });
      return null;
    }

    logger.info("Updated sync job", {
      action: "update_sync_job",
      jobId,
      updates: Object.keys(updates),
    });

    return result[0];
  } catch (error) {
    logger.error("Failed to update sync job", error as Error, {
      action: "update_sync_job",
      jobId,
      updates,
    });
    throw error;
  }
}

/**
 * Get a single sync job by ID
 * @param db - Database instance
 * @param jobId - Sync job ID
 * @returns Sync job or null if not found
 */
export async function getSyncJob(db: any, jobId: string) {
  try {
    const result = await db
      .select()
      .from(syncJobs)
      .where(eq(syncJobs.id, jobId))
      .limit(1);
    return result[0] ?? null;
  } catch (error) {
    logger.error("Failed to get sync job", error as Error, {
      action: "get_sync_job",
      jobId,
    });
    throw error;
  }
}

/**
 * Get recent sync jobs ordered by createdAt descending
 * @param db - Database instance
 * @param limit - Maximum number of jobs to return (default: 10)
 * @returns Array of recent sync jobs
 */
export async function getRecentSyncJobs(db: any, limit: number = 10) {
  try {
    const result = await db
      .select()
      .from(syncJobs)
      .orderBy(desc(syncJobs.createdAt))
      .limit(limit);

    logger.info("Retrieved recent sync jobs", {
      action: "get_recent_sync_jobs",
      count: result.length,
      limit,
    });

    return result;
  } catch (error) {
    logger.error("Failed to get recent sync jobs", error as Error, {
      action: "get_recent_sync_jobs",
      limit,
    });
    throw error;
  }
}

/**
 * Get sync jobs by status
 * @param db - Database instance
 * @param status - Job status to filter by
 * @param limit - Maximum number of jobs to return (default: 10)
 * @returns Array of sync jobs with the specified status
 */
export async function getSyncJobsByStatus(
  db: any,
  status: "pending" | "processing" | "completed" | "failed" | "dead",
  limit: number = 10,
) {
  try {
    const result = await db
      .select()
      .from(syncJobs)
      .where(eq(syncJobs.status, status))
      .orderBy(desc(syncJobs.createdAt))
      .limit(limit);

    logger.info("Retrieved sync jobs by status", {
      action: "get_sync_jobs_by_status",
      status,
      count: result.length,
      limit,
    });

    return result;
  } catch (error) {
    logger.error("Failed to get sync jobs by status", error as Error, {
      action: "get_sync_jobs_by_status",
      status,
      limit,
    });
    throw error;
  }
}

/**
 * Get sync jobs by type and status
 * @param db - Database instance
 * @param type - Sync job type
 * @param status - Job status (optional)
 * @param limit - Maximum number of jobs to return (default: 10)
 * @returns Array of sync jobs
 */
export async function getSyncJobsByType(
  db: any,
  type: "snowflake" | "nextbank",
  status?: "pending" | "processing" | "completed" | "failed" | "dead",
  limit: number = 10,
) {
  try {
    let query = db.select().from(syncJobs).where(eq(syncJobs.type, type));

    if (status) {
      query = query.where(
        and(eq(syncJobs.type, type), eq(syncJobs.status, status)),
      );
    }

    const result = await query.orderBy(desc(syncJobs.createdAt)).limit(limit);

    logger.info("Retrieved sync jobs by type", {
      action: "get_sync_jobs_by_type",
      type,
      status,
      count: result.length,
      limit,
    });

    return result;
  } catch (error) {
    logger.error("Failed to get sync jobs by type", error as Error, {
      action: "get_sync_jobs_by_type",
      type,
      status,
      limit,
    });
    throw error;
  }
}

/**
 * Mark sync job as started
 * @param db - Database instance
 * @param jobId - Sync job ID
 * @returns Updated sync job
 */
export async function startSyncJob(db: any, jobId: string) {
  return updateSyncJob(db, jobId, {
    status: "processing",
    startedAt: new Date(),
  });
}

/**
 * Mark sync job as completed
 * @param db - Database instance
 * @param jobId - Sync job ID
 * @param recordsProcessed - Total records processed
 * @param recordsCreated - Number of records created
 * @param recordsUpdated - Number of records updated
 * @returns Updated sync job
 */
export async function completeSyncJob(
  db: any,
  jobId: string,
  recordsProcessed: number,
  recordsCreated: number,
  recordsUpdated: number,
) {
  return updateSyncJob(db, jobId, {
    status: "completed",
    recordsProcessed,
    recordsCreated,
    recordsUpdated,
    completedAt: new Date(),
  });
}

/**
 * Mark sync job as failed
 * @param db - Database instance
 * @param jobId - Sync job ID
 * @param error - Error message
 * @returns Updated sync job
 */
export async function failSyncJob(db: any, jobId: string, error: string) {
  return updateSyncJob(db, jobId, {
    status: "failed",
    completedAt: new Date(),
    error,
  });
}
