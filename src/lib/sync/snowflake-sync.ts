/**
 * Snowflake sync service for Phase 3 Client Management
 */

import { db } from "@/server/db/index";
import {
  pensionTypes,
  pensionerTypes,
  products,
  branches,
  parStatuses,
  accountTypes,
} from "@/server/db/schema";
import { eq, isNull } from "drizzle-orm";
import { snowflakeClient } from "@/lib/snowflake/client";
import { CircuitBreaker } from "@/lib/resilience/circuit-breaker";
import { logger } from "@/lib/logger";
import type {
  LookupCache,
  SnowflakeClientRecord,
  SyncOptions,
  SyncResult,
} from "@/lib/sync/types";
import type { NewClient } from "@/server/db/schema/clients";
import {
  createSyncJob,
  updateSyncJob,
  startSyncJob,
  completeSyncJob,
  failSyncJob,
} from "@/server/db/queries/sync";
import {
  upsertClient,
  recordClientSyncChange,
} from "@/server/db/queries/clients";

// Circuit breaker for Snowflake calls
const snowflakeCircuitBreaker = new CircuitBreaker("snowflake-sync", {
  failureThreshold: 5,
  cooldownMs: 60000, // 1 minute
  successThreshold: 3,
});

/**
 * Build lookup cache for code to ID mapping
 * @returns Lookup cache with Maps for all lookup tables
 */
export async function buildLookupCache(): Promise<LookupCache> {
  try {
    const [
      pensionTypesData,
      pensionerTypesData,
      productsData,
      branchesData,
      parStatusesData,
      accountTypesData,
    ] = await Promise.all([
      db.select().from(pensionTypes).where(eq(pensionTypes.isActive, true)),
      db.select().from(pensionerTypes).where(eq(pensionerTypes.isActive, true)),
      db.select().from(products).where(eq(products.isActive, true)),
      db.select().from(branches).where(isNull(branches.deletedAt)),
      db.select().from(parStatuses).where(eq(parStatuses.isActive, true)),
      db.select().from(accountTypes).where(eq(accountTypes.isActive, true)),
    ]);

    const cache: LookupCache = {
      pensionTypes: new Map(pensionTypesData.map((pt) => [pt.code, pt.id])),
      pensionerTypes: new Map(pensionerTypesData.map((pt) => [pt.code, pt.id])),
      products: new Map(productsData.map((p) => [p.code, p.id])),
      branches: new Map(branchesData.map((b) => [b.code, b.id])),
      parStatuses: new Map(parStatusesData.map((ps) => [ps.code, ps.id])),
      accountTypes: new Map(accountTypesData.map((at) => [at.code, at.id])),
    };

    logger.info("Built lookup cache", {
      action: "build_lookup_cache",
      pensionTypes: cache.pensionTypes.size,
      pensionerTypes: cache.pensionerTypes.size,
      products: cache.products.size,
      branches: cache.branches.size,
      parStatuses: cache.parStatuses.size,
      accountTypes: cache.accountTypes.size,
    });

    return cache;
  } catch (error) {
    logger.error("Failed to build lookup cache", error as Error, {
      action: "build_lookup_cache",
    });
    throw error;
  }
}

/**
 * Fetch clients from Snowflake CLIENT_UPDATER.CLIENTS_VIEW
 * @param branchCodes - Optional branch codes to filter by
 * @returns Array of Snowflake client records
 */
export async function fetchClientsFromSnowflake(
  branchCodes?: string[],
): Promise<SnowflakeClientRecord[]> {
  try {
    let sql = `
      SELECT
        CLIENT_CODE,
        FULL_NAME,
        PENSION_NUMBER,
        BIRTH_DATE,
        CONTACT_NUMBER,
        CONTACT_NUMBER_ALT,
        PENSION_TYPE_CODE,
        PENSIONER_TYPE_CODE,
        PRODUCT_CODE,
        BRANCH_CODE,
        PAR_STATUS_CODE,
        ACCOUNT_TYPE_CODE,
        PAST_DUE_AMOUNT,
        LOAN_STATUS
      FROM CLIENT_UPDATER.CLIENTS_VIEW
    `;

    // Add branch filter if provided
    if (branchCodes && branchCodes.length > 0) {
      const branchCodesList = branchCodes.map((code) => `'${code}'`).join(", ");
      sql += ` WHERE BRANCH_CODE IN (${branchCodesList})`;
    }

    const result = await snowflakeCircuitBreaker.execute(async () => {
      return snowflakeClient.query<SnowflakeClientRecord>(sql);
    });

    logger.info("Fetched clients from Snowflake", {
      action: "fetch_clients_from_snowflake",
      count: result.length,
      branchCodes,
    });

    return result;
  } catch (error) {
    logger.error("Failed to fetch clients from Snowflake", error as Error, {
      action: "fetch_clients_from_snowflake",
      branchCodes,
    });
    throw error;
  }
}

/**
 * Transform Snowflake record to NewClient with lookup mapping
 * @param snowflakeRecord - Raw Snowflake client record
 * @param lookupCache - Lookup cache for code to ID mapping
 * @returns Transformed client data ready for database insertion
 */
export function transformRecord(
  snowflakeRecord: SnowflakeClientRecord,
  lookupCache: LookupCache,
): NewClient {
  return {
    clientCode: snowflakeRecord.CLIENT_CODE,
    fullName: snowflakeRecord.FULL_NAME,
    pensionNumber: snowflakeRecord.PENSION_NUMBER,
    birthDate:
      snowflakeRecord.BIRTH_DATE instanceof Date
        ? snowflakeRecord.BIRTH_DATE
        : new Date(String(snowflakeRecord.BIRTH_DATE)),
    contactNumber: snowflakeRecord.CONTACT_NUMBER,
    contactNumberAlt: snowflakeRecord.CONTACT_NUMBER_ALT,
    pensionTypeId: lookupCache.pensionTypes.get(
      snowflakeRecord.PENSION_TYPE_CODE,
    ),
    pensionerTypeId: lookupCache.pensionerTypes.get(
      snowflakeRecord.PENSIONER_TYPE_CODE,
    ),
    productId: lookupCache.products.get(snowflakeRecord.PRODUCT_CODE),
    branchId: lookupCache.branches.get(snowflakeRecord.BRANCH_CODE),
    parStatusId: lookupCache.parStatuses.get(snowflakeRecord.PAR_STATUS_CODE),
    accountTypeId: lookupCache.accountTypes.get(
      snowflakeRecord.ACCOUNT_TYPE_CODE,
    ),
    pastDueAmount: snowflakeRecord.PAST_DUE_AMOUNT?.toString(),
    loanStatus: snowflakeRecord.LOAN_STATUS,
    isActive: true,
    syncSource: "snowflake",
    lastSyncedAt: new Date(),
  };
}

/**
 * Main sync function with job tracking and batch processing
 * @param options - Sync options
 * @returns Sync result with statistics
 */
export async function syncClientsFromSnowflake(
  options: SyncOptions = {},
): Promise<SyncResult> {
  const startTime = Date.now();
  const batchSize = options.batchSize || 500;
  const recordChanges = options.recordChanges !== false;

  let syncJobId: string | undefined;
  let totalProcessed = 0;
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  try {
    // Create sync job
    const job = await createSyncJob(db, "snowflake", {
      parameters: {
        branchCodes: options.branchCodes,
        batchSize,
        recordChanges,
      },
    });
    syncJobId = job.id;

    // Mark job as started
    if (syncJobId) {
      await startSyncJob(db, syncJobId);
    } else {
      throw new Error("Failed to create sync job");
    }

    // Build lookup cache
    const lookupCache = await buildLookupCache();

    // Fetch clients from Snowflake
    const snowflakeClients = await fetchClientsFromSnowflake(
      options.branchCodes,
    );

    // Process in batches
    for (let i = 0; i < snowflakeClients.length; i += batchSize) {
      const batch = snowflakeClients.slice(i, i + batchSize);

      for (const snowflakeRecord of batch) {
        try {
          totalProcessed++;

          // Transform record
          const clientData = transformRecord(snowflakeRecord, lookupCache);

          // Get existing client to detect changes
          const existing = await upsertClient(db, clientData);

          // Record sync changes if enabled and this is an update
          if (recordChanges && existing) {
            // Compare fields and record changes
            const fieldsToCheck = [
              "fullName",
              "pensionNumber",
              "birthDate",
              "contactNumber",
              "contactNumberAlt",
              "pastDueAmount",
              "loanStatus",
            ];

            for (const field of fieldsToCheck) {
              const oldValue = (existing as any)[field];
              const newValue = (clientData as any)[field];

              if (oldValue !== newValue) {
                await recordClientSyncChange(
                  db,
                  existing.id,
                  field,
                  oldValue?.toString() || null,
                  newValue?.toString() || null,
                  syncJobId,
                );
              }
            }
          }

          // Track statistics
          if (existing) {
            updated++;
          } else {
            created++;
          }
        } catch (error) {
          failed++;
          logger.error("Failed to process client record", error as Error, {
            action: "sync_clients_from_snowflake",
            clientCode: snowflakeRecord.CLIENT_CODE,
          });
        }
      }

      // Update job progress
      if (syncJobId) {
        await updateSyncJob(db, syncJobId, {
          recordsProcessed: totalProcessed,
          recordsCreated: created,
          recordsUpdated: updated,
        });
      }
    }

    skipped = snowflakeClients.length - created - updated - failed;

    // Mark job as completed
    if (syncJobId) {
      await completeSyncJob(db, syncJobId, totalProcessed, created, updated);
    }

    const processingTimeMs = Date.now() - startTime;

    const result: SyncResult = {
      totalProcessed,
      created,
      updated,
      skipped,
      failed,
      syncJobId,
      processingTimeMs,
    };

    logger.info("Sync completed successfully", {
      action: "sync_clients_from_snowflake",
      ...result,
    });

    return result;
  } catch (error) {
    // Mark job as failed
    if (syncJobId) {
      await failSyncJob(db, syncJobId, (error as Error).message);
    }

    const processingTimeMs = Date.now() - startTime;

    const result: SyncResult = {
      totalProcessed,
      created,
      updated,
      skipped,
      failed: totalProcessed - created - updated - skipped,
      syncJobId,
      error: (error as Error).message,
      processingTimeMs,
    };

    logger.error("Sync failed", error as Error, {
      action: "sync_clients_from_snowflake",
      ...result,
    });

    return result;
  }
}

/**
 * Snowflake sync service class with convenient methods
 */
export class SnowflakeSyncService {
  /**
   * Perform a full sync from Snowflake
   * @param options - Sync options
   * @returns Sync result with statistics
   */
  async sync(options: SyncOptions = {}): Promise<SyncResult> {
    return syncClientsFromSnowflake(options);
  }

  /**
   * Fetch a preview of clients from Snowflake without syncing
   * @param branchCodes - Optional branch codes to filter by
   * @param limit - Maximum number of records to return (default: 100)
   * @returns Array of Snowflake client records
   */
  async fetchPreview(
    branchCodes?: string[],
    limit: number = 100,
  ): Promise<SnowflakeClientRecord[]> {
    try {
      let sql = `
        SELECT
          CLIENT_CODE,
          FULL_NAME,
          PENSION_NUMBER,
          BIRTH_DATE,
          CONTACT_NUMBER,
          CONTACT_NUMBER_ALT,
          PENSION_TYPE_CODE,
          PENSIONER_TYPE_CODE,
          PRODUCT_CODE,
          BRANCH_CODE,
          PAR_STATUS_CODE,
          ACCOUNT_TYPE_CODE,
          PAST_DUE_AMOUNT,
          LOAN_STATUS
        FROM CLIENT_UPDATER.CLIENTS_VIEW
      `;

      // Add branch filter if provided
      if (branchCodes && branchCodes.length > 0) {
        const branchCodesList = branchCodes
          .map((code) => `'${code}'`)
          .join(", ");
        sql += ` WHERE BRANCH_CODE IN (${branchCodesList})`;
      }

      // Add limit
      sql += ` LIMIT ${limit}`;

      const result = await snowflakeCircuitBreaker.execute(async () => {
        return snowflakeClient.query<SnowflakeClientRecord>(sql);
      });

      logger.info("Fetched preview from Snowflake", {
        action: "fetch_preview",
        count: result.length,
        branchCodes,
        limit,
      });

      return result;
    } catch (error) {
      logger.error("Failed to fetch preview from Snowflake", error as Error, {
        action: "fetch_preview",
        branchCodes,
        limit,
      });
      throw error;
    }
  }

  /**
   * Get circuit breaker state
   * @returns Circuit breaker state
   */
  getCircuitBreakerState(): "closed" | "open" | "half-open" {
    return snowflakeCircuitBreaker.getState();
  }

  /**
   * Get circuit breaker failure count
   * @returns Number of failures
   */
  getCircuitBreakerFailures(): number {
    return snowflakeCircuitBreaker.getFailures();
  }
}

// Export singleton instance
export const snowflakeSyncService = new SnowflakeSyncService();
