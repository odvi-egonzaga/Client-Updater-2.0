/**
 * Health status enumeration
 */
export type HealthStatus =
  | "healthy"
  | "unhealthy"
  | "error"
  | "warning"
  | "pending";

/**
 * Base health check result interface
 */
export interface HealthCheckResult {
  status: HealthStatus;
  responseTimeMs: number;
  timestamp: string;
  error?: string;
  details?: Record<string, unknown>;
}

/**
 * Edge Function health check result
 */
export interface EdgeFunctionHealthResult extends HealthCheckResult {
  type: "edge-function";
  functionName: string;
  endpoint: string;
  httpStatus?: number;
  authValidated?: boolean;
}

/**
 * Database health check result
 */
export interface DatabaseHealthResult extends HealthCheckResult {
  type: "database";
  operation: "write" | "read" | "delete";
  table: string;
  recordId?: string;
}

/**
 * Unified health check result
 */
export interface UnifiedHealthResult {
  overall: HealthStatus;
  edgeFunctions: EdgeFunctionHealthResult[];
  database: DatabaseHealthResult[];
  responseTimeMs: number;
  timestamp: string;
  errors: string[];
}

/**
 * Edge Function check configuration
 */
export interface EdgeFunctionCheckConfig {
  functionName: string;
  endpoint?: string;
  validateAuth?: boolean;
  authToken?: string;
  timeout?: number;
}

/**
 * Database check configuration
 */
export interface DatabaseCheckConfig {
  tableName?: string;
  testKey?: string;
  testValue?: string;
}

/**
 * Health check options
 */
export interface HealthCheckOptions {
  edgeFunctions?: EdgeFunctionCheckConfig[];
  database?: DatabaseCheckConfig;
  timeout?: number;
  verbose?: boolean;
}

/**
 * Health check error types
 */
export class HealthCheckError extends Error {
  constructor(
    message: string,
    public readonly component: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = "HealthCheckError";
  }
}

export class EdgeFunctionHealthError extends HealthCheckError {
  constructor(
    message: string,
    public readonly functionName: string,
    public readonly httpStatus?: number,
    originalError?: unknown,
  ) {
    super(message, "edge-function", originalError);
    this.name = "EdgeFunctionHealthError";
  }
}

export class DatabaseHealthError extends HealthCheckError {
  constructor(
    message: string,
    public readonly operation: "write" | "read" | "delete",
    public readonly tableName: string,
    originalError?: unknown,
  ) {
    super(message, "database", originalError);
    this.name = "DatabaseHealthError";
  }
}
