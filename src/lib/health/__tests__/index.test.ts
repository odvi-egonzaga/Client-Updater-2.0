import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkHealth } from "../index";
import { runEdgeFunctionHealthChecks } from "../edge-functions";
import { runDatabaseHealthChecks } from "../database";

// Mock dependencies
vi.mock("../edge-functions", () => ({
  runEdgeFunctionHealthChecks: vi.fn(),
}));

vi.mock("../database", () => ({
  runDatabaseHealthChecks: vi.fn(),
}));

describe("Unified Health Check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checkHealth", () => {
    it("should return healthy when all checks pass", async () => {
      vi.mocked(runEdgeFunctionHealthChecks).mockResolvedValue([
        {
          type: "edge-function",
          status: "healthy",
          responseTimeMs: 100,
          timestamp: new Date().toISOString(),
          functionName: "test-function",
          endpoint: "https://test.supabase.co/functions/v1/test-function",
        },
      ]);

      vi.mocked(runDatabaseHealthChecks).mockResolvedValue([
        {
          type: "database",
          status: "healthy",
          responseTimeMs: 50,
          timestamp: new Date().toISOString(),
          operation: "write",
          table: "health_check_tests",
        },
      ]);

      const result = await checkHealth({
        edgeFunctions: [{ functionName: "test-function" }],
        database: { testKey: "test-key" },
      });

      expect(result.overall).toBe("healthy");
      expect(result.edgeFunctions).toHaveLength(1);
      expect(result.database).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      expect(result.responseTimeMs).toBeGreaterThan(0);
    });

    it("should return unhealthy when edge function checks fail", async () => {
      vi.mocked(runEdgeFunctionHealthChecks).mockResolvedValue([
        {
          type: "edge-function",
          status: "error",
          responseTimeMs: 100,
          timestamp: new Date().toISOString(),
          functionName: "test-function",
          endpoint: "https://test.supabase.co/functions/v1/test-function",
          error: "Function not found",
        },
      ]);

      vi.mocked(runDatabaseHealthChecks).mockResolvedValue([
        {
          type: "database",
          status: "healthy",
          responseTimeMs: 50,
          timestamp: new Date().toISOString(),
          operation: "write",
          table: "health_check_tests",
        },
      ]);

      const result = await checkHealth({
        edgeFunctions: [{ functionName: "test-function" }],
        database: { testKey: "test-key" },
      });

      expect(result.overall).toBe("unhealthy");
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Function not found");
    });

    it("should return unhealthy when database checks fail", async () => {
      vi.mocked(runEdgeFunctionHealthChecks).mockResolvedValue([
        {
          type: "edge-function",
          status: "healthy",
          responseTimeMs: 100,
          timestamp: new Date().toISOString(),
          functionName: "test-function",
          endpoint: "https://test.supabase.co/functions/v1/test-function",
        },
      ]);

      vi.mocked(runDatabaseHealthChecks).mockResolvedValue([
        {
          type: "database",
          status: "error",
          responseTimeMs: 50,
          timestamp: new Date().toISOString(),
          operation: "write",
          table: "health_check_tests",
          error: "Connection error",
        },
      ]);

      const result = await checkHealth({
        edgeFunctions: [{ functionName: "test-function" }],
        database: { testKey: "test-key" },
      });

      expect(result.overall).toBe("unhealthy");
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Connection error");
    });

    it("should return warning when there are warnings but no errors", async () => {
      vi.mocked(runEdgeFunctionHealthChecks).mockResolvedValue([
        {
          type: "edge-function",
          status: "warning",
          responseTimeMs: 100,
          timestamp: new Date().toISOString(),
          functionName: "test-function",
          endpoint: "https://test.supabase.co/functions/v1/test-function",
          error: "No auth token provided",
        },
      ]);

      vi.mocked(runDatabaseHealthChecks).mockResolvedValue([
        {
          type: "database",
          status: "healthy",
          responseTimeMs: 50,
          timestamp: new Date().toISOString(),
          operation: "write",
          table: "health_check_tests",
        },
      ]);

      const result = await checkHealth({
        edgeFunctions: [{ functionName: "test-function" }],
        database: { testKey: "test-key" },
      });

      expect(result.overall).toBe("warning");
      expect(result.errors).toHaveLength(0);
    });

    it("should return pending when no checks are configured", async () => {
      const result = await checkHealth({});

      expect(result.overall).toBe("pending");
      expect(result.edgeFunctions).toHaveLength(0);
      expect(result.database).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it("should aggregate all errors from failed checks", async () => {
      vi.mocked(runEdgeFunctionHealthChecks).mockResolvedValue([
        {
          type: "edge-function",
          status: "error",
          responseTimeMs: 100,
          timestamp: new Date().toISOString(),
          functionName: "test-function",
          endpoint: "https://test.supabase.co/functions/v1/test-function",
          error: "Function not found",
        },
      ]);

      vi.mocked(runDatabaseHealthChecks).mockResolvedValue([
        {
          type: "database",
          status: "error",
          responseTimeMs: 50,
          timestamp: new Date().toISOString(),
          operation: "write",
          table: "health_check_tests",
          error: "Connection error",
        },
      ]);

      const result = await checkHealth({
        edgeFunctions: [{ functionName: "test-function" }],
        database: { testKey: "test-key" },
      });

      expect(result.overall).toBe("unhealthy");
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain("Function not found");
      expect(result.errors[1]).toContain("Connection error");
    });

    it("should not run edge function checks when not configured", async () => {
      vi.mocked(runDatabaseHealthChecks).mockResolvedValue([
        {
          type: "database",
          status: "healthy",
          responseTimeMs: 50,
          timestamp: new Date().toISOString(),
          operation: "write",
          table: "health_check_tests",
        },
      ]);

      const result = await checkHealth({
        database: { testKey: "test-key" },
      });

      expect(result.edgeFunctions).toHaveLength(0);
      expect(result.database).toHaveLength(1);
      expect(runEdgeFunctionHealthChecks).not.toHaveBeenCalled();
    });

    it("should not run database checks when not configured", async () => {
      vi.mocked(runEdgeFunctionHealthChecks).mockResolvedValue([
        {
          type: "edge-function",
          status: "healthy",
          responseTimeMs: 100,
          timestamp: new Date().toISOString(),
          functionName: "test-function",
          endpoint: "https://test.supabase.co/functions/v1/test-function",
        },
      ]);

      const result = await checkHealth({
        edgeFunctions: [{ functionName: "test-function" }],
      });

      expect(result.edgeFunctions).toHaveLength(1);
      expect(result.database).toHaveLength(0);
      expect(runDatabaseHealthChecks).not.toHaveBeenCalled();
    });
  });
});
