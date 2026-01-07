/**
 * Sync service types for Phase 3 Client Management
 */

import type { NewClient } from "@/server/db/schema/clients";
import type { NewSyncJob } from "@/server/db/schema/jobs";

/**
 * Sync options for client synchronization
 */
export interface SyncOptions {
  /** Branch codes to filter (optional - syncs all if not provided) */
  branchCodes?: string[];
  /** Batch size for processing (default: 500) */
  batchSize?: number;
  /** Whether to record sync changes (default: true) */
  recordChanges?: boolean;
  /** Sync job ID for tracking (optional) */
  syncJobId?: string;
}

/**
 * Sync result statistics
 */
export interface SyncResult {
  /** Total records processed */
  totalProcessed: number;
  /** Number of new records created */
  created: number;
  /** Number of existing records updated */
  updated: number;
  /** Number of records skipped (no changes) */
  skipped: number;
  /** Number of records that failed */
  failed: number;
  /** Sync job ID */
  syncJobId?: string;
  /** Error message if sync failed */
  error?: string;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Sync job creation options
 */
export interface SyncJobOptions {
  /** Sync job type (snowflake, nextbank) */
  type: "snowflake" | "nextbank";
  /** Optional parameters for the job */
  parameters?: Record<string, unknown>;
  /** User ID who initiated the job */
  createdBy?: string;
}

/**
 * Lookup cache for code to ID mapping
 */
export interface LookupCache {
  /** Map of pension type codes to IDs */
  pensionTypes: Map<string, string>;
  /** Map of pensioner type codes to IDs */
  pensionerTypes: Map<string, string>;
  /** Map of product codes to IDs */
  products: Map<string, string>;
  /** Map of branch codes to IDs */
  branches: Map<string, string>;
  /** Map of PAR status codes to IDs */
  parStatuses: Map<string, string>;
  /** Map of account type codes to IDs */
  accountTypes: Map<string, string>;
}

/**
 * Snowflake client record structure
 * This matches the CLIENT_UPDATER.CLIENTS_VIEW structure
 */
export interface SnowflakeClientRecord {
  /** Client code (unique identifier) */
  CLIENT_CODE: string;
  /** Full name */
  FULL_NAME: string;
  /** Pension number */
  PENSION_NUMBER: string;
  /** Birth date */
  BIRTH_DATE: string | Date;
  /** Contact number */
  CONTACT_NUMBER: string;
  /** Alternate contact number */
  CONTACT_NUMBER_ALT: string;
  /** Pension type code */
  PENSION_TYPE_CODE: string;
  /** Pensioner type code */
  PENSIONER_TYPE_CODE: string;
  /** Product code */
  PRODUCT_CODE: string;
  /** Branch code */
  BRANCH_CODE: string;
  /** PAR status code */
  PAR_STATUS_CODE: string;
  /** Account type code */
  ACCOUNT_TYPE_CODE: string;
  /** Past due amount */
  PAST_DUE_AMOUNT: number;
  /** Loan status */
  LOAN_STATUS: string;
}

/**
 * Client filter options for queries
 */
export interface ClientFilters {
  /** Filter by branch IDs */
  branchIds?: string[];
  /** Filter by pension type ID */
  pensionTypeId?: string;
  /** Filter by pensioner type ID */
  pensionerTypeId?: string;
  /** Filter by product ID */
  productId?: string;
  /** Filter by PAR status ID */
  parStatusId?: string;
  /** Filter by account type ID */
  accountTypeId?: string;
  /** Filter by active status */
  isActive?: boolean;
  /** Search term (matches clientCode, fullName, pensionNumber) */
  search?: string;
}

/**
 * Client with joined lookup data
 */
export interface ClientWithDetails extends NewClient {
  /** Pension type details */
  pensionType?: {
    id: string;
    code: string;
    name: string;
  };
  /** Pensioner type details */
  pensionerType?: {
    id: string;
    code: string;
    name: string;
  };
  /** Product details */
  product?: {
    id: string;
    code: string;
    name: string;
  };
  /** Branch details */
  branch?: {
    id: string;
    code: string;
    name: string;
  };
  /** PAR status details */
  parStatus?: {
    id: string;
    code: string;
    name: string;
  };
  /** Account type details */
  accountType?: {
    id: string;
    code: string;
    name: string;
  };
  /** Current period status (latest) */
  currentStatus?: {
    id: string;
    statusTypeId: string;
    reasonId: string | null;
    remarks: string | null;
    hasPayment: boolean;
    updatedAt: Date;
  };
}

/**
 * Sync change record for audit trail
 */
export interface SyncChangeRecord {
  /** Client ID */
  clientId: string;
  /** Field that was changed */
  fieldName: string;
  /** Old value */
  oldValue: string | null;
  /** New value */
  newValue: string | null;
  /** Sync job ID */
  syncJobId?: string;
  /** When the change was recorded */
  changedAt: Date;
}

/**
 * Dashboard aggregation by status
 */
export interface StatusCount {
  /** Status type ID */
  statusTypeId: string;
  /** Status type name */
  statusTypeName: string;
  /** Count of clients */
  count: number;
}

/**
 * Branch access scope for territory filtering
 */
export type BranchScope = "all" | "territory" | "none";

/**
 * User branch filter result
 */
export interface UserBranchFilter {
  /** Access scope */
  scope: BranchScope;
  /** Branch IDs the user can access */
  branchIds: string[];
}
