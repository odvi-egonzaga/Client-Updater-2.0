import { describe, it, expect } from "vitest";
import { checkHealth } from "../index";
import {
  pingEdgeFunction,
  validateEdgeFunctionAuth,
  runEdgeFunctionHealthChecks,
} from "../edge-functions";
import {
  writeTestRow,
  readTestRow,
  deleteTestRow,
  runDatabaseHealthChecks,
} from "../database";
import { logger } from "../logger";
import {
  HealthCheckError,
  EdgeFunctionHealthError,
  DatabaseHealthError,
} from "../types";

describe("Health Check Implementation", () => {
  describe("Module Exports", () => {
    it("should export checkHealth function", () => {
      expect(typeof checkHealth).toBe("function");
    });

    it("should export pingEdgeFunction function", () => {
      expect(typeof pingEdgeFunction).toBe("function");
    });

    it("should export validateEdgeFunctionAuth function", () => {
      expect(typeof validateEdgeFunctionAuth).toBe("function");
    });

    it("should export runEdgeFunctionHealthChecks function", () => {
      expect(typeof runEdgeFunctionHealthChecks).toBe("function");
    });

    it("should export writeTestRow function", () => {
      expect(typeof writeTestRow).toBe("function");
    });

    it("should export readTestRow function", () => {
      expect(typeof readTestRow).toBe("function");
    });

    it("should export deleteTestRow function", () => {
      expect(typeof deleteTestRow).toBe("function");
    });

    it("should export runDatabaseHealthChecks function", () => {
      expect(typeof runDatabaseHealthChecks).toBe("function");
    });

    it("should export logger", () => {
      expect(typeof logger).toBe("object");
      expect(logger.info).toBeDefined();
      expect(logger.success).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.debug).toBeDefined();
    });
  });

  describe("Error Classes", () => {
    it("should export HealthCheckError class", () => {
      expect(typeof HealthCheckError).toBe("function");
      expect(HealthCheckError.name).toBe("HealthCheckError");

      const error = new HealthCheckError("Test error", "test-component");
      expect(error.message).toBe("Test error");
      expect(error.name).toBe("HealthCheckError");
      expect(error.component).toBe("test-component");
    });

    it("should export EdgeFunctionHealthError class", () => {
      expect(typeof EdgeFunctionHealthError).toBe("function");
      expect(EdgeFunctionHealthError.name).toBe("EdgeFunctionHealthError");

      const error = new EdgeFunctionHealthError(
        "Test edge function error",
        "test-function",
      );
      expect(error.message).toBe("Test edge function error");
      expect(error.name).toBe("EdgeFunctionHealthError");
      expect(error.functionName).toBe("test-function");
    });

    it("should export DatabaseHealthError class", () => {
      expect(typeof DatabaseHealthError).toBe("function");
      expect(DatabaseHealthError.name).toBe("DatabaseHealthError");

      const error = new DatabaseHealthError(
        "Test database error",
        "read",
        "test-table",
      );
      expect(error.message).toBe("Test database error");
      expect(error.name).toBe("DatabaseHealthError");
      expect(error.operation).toBe("read");
      expect(error.tableName).toBe("test-table");
    });
  });
});
