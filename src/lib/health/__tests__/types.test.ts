import { describe, it, expect } from "vitest";
import {
  HealthCheckError,
  EdgeFunctionHealthError,
  DatabaseHealthError,
  type HealthStatus,
  type HealthCheckResult,
  type EdgeFunctionHealthResult,
  type DatabaseHealthResult,
  type UnifiedHealthResult,
  type EdgeFunctionCheckConfig,
  type DatabaseCheckConfig,
  type HealthCheckOptions,
} from "../types";

describe("Health Check Types", () => {
  describe("HealthStatus", () => {
    it("should accept valid health status values", () => {
      const statuses: HealthStatus[] = [
        "healthy",
        "unhealthy",
        "error",
        "warning",
        "pending",
      ];
      statuses.forEach((status) => {
        expect(status).toBeDefined();
      });
    });
  });

  describe("HealthCheckResult", () => {
    it("should create a valid health check result", () => {
      const result: HealthCheckResult = {
        status: "healthy",
        responseTimeMs: 100,
        timestamp: new Date().toISOString(),
      };
      expect(result.status).toBe("healthy");
      expect(result.responseTimeMs).toBe(100);
      expect(result.timestamp).toBeDefined();
    });

    it("should include optional error and details fields", () => {
      const result: HealthCheckResult = {
        status: "error",
        responseTimeMs: 100,
        timestamp: new Date().toISOString(),
        error: "Test error",
        details: { key: "value" },
      };
      expect(result.error).toBe("Test error");
      expect(result.details).toEqual({ key: "value" });
    });
  });

  describe("EdgeFunctionHealthResult", () => {
    it("should create a valid edge function health result", () => {
      const result: EdgeFunctionHealthResult = {
        type: "edge-function",
        status: "healthy",
        responseTimeMs: 100,
        timestamp: new Date().toISOString(),
        functionName: "test-function",
        endpoint: "https://example.com/functions/v1/test-function",
      };
      expect(result.type).toBe("edge-function");
      expect(result.functionName).toBe("test-function");
      expect(result.endpoint).toBe(
        "https://example.com/functions/v1/test-function",
      );
    });

    it("should include optional httpStatus and authValidated fields", () => {
      const result: EdgeFunctionHealthResult = {
        type: "edge-function",
        status: "healthy",
        responseTimeMs: 100,
        timestamp: new Date().toISOString(),
        functionName: "test-function",
        endpoint: "https://example.com/functions/v1/test-function",
        httpStatus: 200,
        authValidated: true,
      };
      expect(result.httpStatus).toBe(200);
      expect(result.authValidated).toBe(true);
    });
  });

  describe("DatabaseHealthResult", () => {
    it("should create a valid database health result", () => {
      const result: DatabaseHealthResult = {
        type: "database",
        status: "healthy",
        responseTimeMs: 100,
        timestamp: new Date().toISOString(),
        operation: "write",
        table: "health_check_tests",
      };
      expect(result.type).toBe("database");
      expect(result.operation).toBe("write");
      expect(result.table).toBe("health_check_tests");
    });

    it("should include optional recordId field", () => {
      const result: DatabaseHealthResult = {
        type: "database",
        status: "healthy",
        responseTimeMs: 100,
        timestamp: new Date().toISOString(),
        operation: "write",
        table: "health_check_tests",
        recordId: "test-id",
      };
      expect(result.recordId).toBe("test-id");
    });
  });

  describe("UnifiedHealthResult", () => {
    it("should create a valid unified health result", () => {
      const result: UnifiedHealthResult = {
        overall: "healthy",
        edgeFunctions: [],
        database: [],
        responseTimeMs: 200,
        timestamp: new Date().toISOString(),
        errors: [],
      };
      expect(result.overall).toBe("healthy");
      expect(result.edgeFunctions).toEqual([]);
      expect(result.database).toEqual([]);
      expect(result.errors).toEqual([]);
    });
  });

  describe("EdgeFunctionCheckConfig", () => {
    it("should create a valid edge function check config", () => {
      const config: EdgeFunctionCheckConfig = {
        functionName: "test-function",
      };
      expect(config.functionName).toBe("test-function");
    });

    it("should include optional fields", () => {
      const config: EdgeFunctionCheckConfig = {
        functionName: "test-function",
        endpoint: "https://example.com/functions/v1/test-function",
        validateAuth: true,
        authToken: "Bearer token",
        timeout: 5000,
      };
      expect(config.endpoint).toBe(
        "https://example.com/functions/v1/test-function",
      );
      expect(config.validateAuth).toBe(true);
      expect(config.authToken).toBe("Bearer token");
      expect(config.timeout).toBe(5000);
    });
  });

  describe("DatabaseCheckConfig", () => {
    it("should create a valid database check config", () => {
      const config: DatabaseCheckConfig = {};
      expect(config).toBeDefined();
    });

    it("should include optional fields", () => {
      const config: DatabaseCheckConfig = {
        tableName: "health_check_tests",
        testKey: "test-key",
        testValue: "test-value",
      };
      expect(config.tableName).toBe("health_check_tests");
      expect(config.testKey).toBe("test-key");
      expect(config.testValue).toBe("test-value");
    });
  });

  describe("HealthCheckOptions", () => {
    it("should create a valid health check options", () => {
      const options: HealthCheckOptions = {};
      expect(options).toBeDefined();
    });

    it("should include optional fields", () => {
      const options: HealthCheckOptions = {
        edgeFunctions: [{ functionName: "test-function" }],
        database: { testKey: "test-key" },
        timeout: 5000,
        verbose: true,
      };
      expect(options.edgeFunctions).toBeDefined();
      expect(options.database).toBeDefined();
      expect(options.timeout).toBe(5000);
      expect(options.verbose).toBe(true);
    });
  });

  describe("HealthCheckError", () => {
    it("should create a valid health check error", () => {
      const error = new HealthCheckError("Test error", "test-component");
      expect(error.message).toBe("Test error");
      expect(error.component).toBe("test-component");
      expect(error.name).toBe("HealthCheckError");
    });

    it("should include optional original error", () => {
      const originalError = new Error("Original error");
      const error = new HealthCheckError(
        "Test error",
        "test-component",
        originalError,
      );
      expect(error.originalError).toBe(originalError);
    });
  });

  describe("EdgeFunctionHealthError", () => {
    it("should create a valid edge function health error", () => {
      const error = new EdgeFunctionHealthError("Test error", "test-function");
      expect(error.message).toBe("Test error");
      expect(error.functionName).toBe("test-function");
      expect(error.name).toBe("EdgeFunctionHealthError");
      expect(error.component).toBe("edge-function");
    });

    it("should include optional http status", () => {
      const error = new EdgeFunctionHealthError(
        "Test error",
        "test-function",
        404,
      );
      expect(error.httpStatus).toBe(404);
    });

    it("should include optional original error", () => {
      const originalError = new Error("Original error");
      const error = new EdgeFunctionHealthError(
        "Test error",
        "test-function",
        404,
        originalError,
      );
      expect(error.originalError).toBe(originalError);
    });
  });

  describe("DatabaseHealthError", () => {
    it("should create a valid database health error", () => {
      const error = new DatabaseHealthError(
        "Test error",
        "write",
        "test-table",
      );
      expect(error.message).toBe("Test error");
      expect(error.operation).toBe("write");
      expect(error.tableName).toBe("test-table");
      expect(error.name).toBe("DatabaseHealthError");
      expect(error.component).toBe("database");
    });

    it("should include optional original error", () => {
      const originalError = new Error("Original error");
      const error = new DatabaseHealthError(
        "Test error",
        "write",
        "test-table",
        originalError,
      );
      expect(error.originalError).toBe(originalError);
    });
  });
});
