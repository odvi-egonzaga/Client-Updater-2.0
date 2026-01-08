import type {
  UnifiedHealthResult,
  HealthCheckOptions,
  EdgeFunctionCheckConfig,
  DatabaseCheckConfig,
  EdgeFunctionHealthResult,
  DatabaseHealthResult,
} from "./types";
import {
  pingEdgeFunction,
  validateEdgeFunctionAuth,
  runEdgeFunctionHealthChecks,
} from "./edge-functions";
import {
  writeTestRow,
  readTestRow,
  deleteTestRow,
  runDatabaseHealthChecks,
} from "./database";
import { logger } from "./logger";

/**
 * Unified health check function that aggregates results from all components
 *
 * @param options - Health check options
 * @returns Promise<UnifiedHealthResult>
 *
 * @example
 * ```typescript
 * const result = await checkHealth({
 *   edgeFunctions: [
 *     { functionName: 'health-check', validateAuth: true }
 *   ],
 *   database: { testKey: 'my-test-key' }
 * })
 * ```
 */
export async function checkHealth(
  options: HealthCheckOptions = {},
): Promise<UnifiedHealthResult> {
  const start = performance.now();
  const timestamp = new Date().toISOString();

  logger.info("Starting unified health check", { options });

  const errors: string[] = [];

  // Run Edge Function health checks
  let edgeFunctionResults: EdgeFunctionHealthResult[] = [];
  if (options.edgeFunctions !== undefined) {
    edgeFunctionResults = await runEdgeFunctionHealthChecks(
      options.edgeFunctions,
    );

    // Collect errors from edge function checks
    edgeFunctionResults.forEach((result) => {
      if (result.status === "error" && result.error) {
        errors.push(`Edge Function [${result.functionName}]: ${result.error}`);
      }
    });
  }

  // Run Database health checks
  let databaseResults: DatabaseHealthResult[] = [];
  if (options.database !== undefined) {
    databaseResults = await runDatabaseHealthChecks(options.database);

    // Collect errors from database checks
    databaseResults.forEach((result) => {
      if (result.status === "error" && result.error) {
        errors.push(`Database [${result.operation}]: ${result.error}`);
      }
    });
  }

  const responseTimeMs = Math.round(performance.now() - start);

  // Determine overall health status
  const allResults = [...edgeFunctionResults, ...databaseResults];
  const hasErrors = allResults.some((r) => r.status === "error");
  const hasWarnings = allResults.some((r) => r.status === "warning");
  const allHealthy =
    allResults.length > 0 && allResults.every((r) => r.status === "healthy");

  let overall: "healthy" | "unhealthy" | "error" | "warning" | "pending";
  if (hasErrors) {
    overall = "unhealthy";
  } else if (hasWarnings) {
    overall = "warning";
  } else if (allHealthy) {
    overall = "healthy";
  } else {
    overall = "pending";
  }

  const result: UnifiedHealthResult = {
    overall,
    edgeFunctions: edgeFunctionResults,
    database: databaseResults,
    responseTimeMs,
    timestamp,
    errors,
  };

  logger.info(`Health check completed: ${overall} (${responseTimeMs}ms)`, {
    edgeFunctionChecks: edgeFunctionResults.length,
    databaseChecks: databaseResults.length,
    errors: errors.length,
  });

  return result;
}

// Re-export types and functions
export * from "./types";
export {
  pingEdgeFunction,
  validateEdgeFunctionAuth,
  runEdgeFunctionHealthChecks,
};
export { writeTestRow, readTestRow, deleteTestRow, runDatabaseHealthChecks };
export { logger };
