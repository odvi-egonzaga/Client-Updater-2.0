// Client management feature types

/**
 * Client object with all fields
 */
export interface Client {
  id: string;
  clientCode: string;
  fullName: string;
  pensionNumber: string | null;
  birthDate: Date | null;
  contactNumber: string | null;
  contactNumberAlt: string | null;
  pensionTypeId: string | null;
  pensionerTypeId: string | null;
  productId: string | null;
  branchId: string | null;
  parStatusId: string | null;
  accountTypeId: string | null;
  pastDueAmount: string | null;
  loanStatus: string | null;
  isActive: boolean;
  lastSyncedAt: Date | null;
  syncSource: "snowflake" | "nextbank" | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * Client with joined lookup data
 */
export interface ClientWithDetails {
  id: string;
  clientCode: string;
  fullName: string;
  pensionNumber: string | null;
  birthDate: Date | null;
  contactNumber: string | null;
  contactNumberAlt: string | null;
  pensionTypeId: string | null;
  pensionerTypeId: string | null;
  productId: string | null;
  branchId: string | null;
  parStatusId: string | null;
  accountTypeId: string | null;
  pastDueAmount: string | null;
  loanStatus: string | null;
  isActive: boolean;
  lastSyncedAt: Date | null;
  syncSource: "snowflake" | "nextbank" | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  pensionType: LookupItem | null;
  pensionerType: LookupItem | null;
  product: LookupItem | null;
  branch: Branch | null;
  parStatus: LookupItem | null;
  accountType: LookupItem | null;
  currentStatus: ClientStatus | null;
}

/**
 * Generic lookup item
 */
export interface LookupItem {
  id: string;
  code: string;
  name: string;
}

/**
 * Branch object
 */
export interface Branch {
  id: string;
  code: string;
  name: string;
  location: string | null;
  category: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Client status object (latest period status)
 */
export interface ClientStatus {
  id: string;
  statusTypeId: string | null;
  reasonId: string | null;
  remarks: string | null;
  hasPayment: boolean;
  updatedAt: Date;
}

/**
 * Search result for autocomplete
 */
export interface ClientSearchResult {
  id: string;
  clientCode: string;
  fullName: string;
  pensionNumber: string | null;
}

/**
 * Sync job object
 */
export interface SyncJob {
  id: string;
  type: "snowflake" | "nextbank";
  status: "pending" | "processing" | "completed" | "failed" | "dead";
  parameters: Record<string, any> | null;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  startedAt: Date | null;
  completedAt: Date | null;
  error: string | null;
  createdBy: string | null;
  createdAt: Date;
}

/**
 * Client sync history record
 */
export interface ClientSyncHistory {
  id: string;
  clientId: string;
  fieldChanged: string;
  oldValue: string | null;
  newValue: string | null;
  syncJobId: string | null;
  changedAt: Date;
}

/**
 * Filter options for client list
 */
export interface ClientFilters {
  pensionTypeId?: string;
  pensionerTypeId?: string;
  productId?: string;
  parStatusId?: string;
  accountTypeId?: string;
  isActive?: boolean;
  search?: string;
}

/**
 * Paginated client list response
 */
export interface ClientListResponse {
  success: boolean;
  data: Client[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Generic paginated response
 */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Generic API response
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
  };
}

/**
 * Input for triggering sync
 */
export interface TriggerSyncInput {
  type: "snowflake" | "nextbank";
  options?: {
    branchCodes?: string[];
    dryRun?: boolean;
    fullSync?: boolean;
  };
}
