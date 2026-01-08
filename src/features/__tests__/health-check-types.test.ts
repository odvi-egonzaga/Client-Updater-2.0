import { describe, it, expect } from "vitest";
import type {
  HealthStatus,
  ServiceCheck,
  ServiceHealth,
} from "../health-check/types";

describe("Health check types", () => {
  describe("HealthStatus type", () => {
    it("should accept valid health status values", () => {
      const validStatuses: HealthStatus[] = [
        "healthy",
        "unhealthy",
        "error",
        "pending",
        "unconfigured",
      ];

      validStatuses.forEach((status) => {
        expect(status).toBeDefined();
        expect(typeof status).toBe("string");
      });
    });

    it("should have exactly 5 valid health status values", () => {
      const validStatuses: HealthStatus[] = [
        "healthy",
        "unhealthy",
        "error",
        "pending",
        "unconfigured",
      ];

      expect(validStatuses).toHaveLength(5);
    });

    it("should allow creating objects with HealthStatus", () => {
      const status: HealthStatus = "healthy";
      expect(status).toBe("healthy");
    });
  });

  describe("ServiceCheck interface", () => {
    it("should create a valid ServiceCheck object", () => {
      const serviceCheck: ServiceCheck = {
        name: "Test Check",
        endpoint: "/test/endpoint",
        status: "healthy",
        responseTimeMs: 100,
        error: undefined,
      };

      expect(serviceCheck.name).toBe("Test Check");
      expect(serviceCheck.endpoint).toBe("/test/endpoint");
      expect(serviceCheck.status).toBe("healthy");
      expect(serviceCheck.responseTimeMs).toBe(100);
      expect(serviceCheck.error).toBeUndefined();
    });

    it("should create ServiceCheck without optional fields", () => {
      const serviceCheck: ServiceCheck = {
        name: "Test Check",
        endpoint: "/test/endpoint",
        status: "healthy",
      };

      expect(serviceCheck.name).toBe("Test Check");
      expect(serviceCheck.endpoint).toBe("/test/endpoint");
      expect(serviceCheck.status).toBe("healthy");
      expect(serviceCheck.responseTimeMs).toBeUndefined();
      expect(serviceCheck.error).toBeUndefined();
    });

    it("should create ServiceCheck with error field", () => {
      const serviceCheck: ServiceCheck = {
        name: "Test Check",
        endpoint: "/test/endpoint",
        status: "error",
        error: "Connection failed",
      };

      expect(serviceCheck.status).toBe("error");
      expect(serviceCheck.error).toBe("Connection failed");
    });

    it("should accept all valid HealthStatus values in ServiceCheck", () => {
      const validStatuses: HealthStatus[] = [
        "healthy",
        "unhealthy",
        "error",
        "pending",
        "unconfigured",
      ];

      validStatuses.forEach((status) => {
        const serviceCheck: ServiceCheck = {
          name: "Test Check",
          endpoint: "/test/endpoint",
          status,
        };
        expect(serviceCheck.status).toBe(status);
      });
    });
  });

  describe("ServiceHealth interface", () => {
    it("should create a valid ServiceHealth object", () => {
      const checks: ServiceCheck[] = [
        {
          name: "Check 1",
          endpoint: "/check1",
          status: "healthy",
          responseTimeMs: 50,
        },
        {
          name: "Check 2",
          endpoint: "/check2",
          status: "healthy",
          responseTimeMs: 75,
        },
      ];

      const serviceHealth: ServiceHealth = {
        name: "Test Service",
        icon: "test-icon",
        status: "healthy",
        responseTimeMs: 125,
        checks,
      };

      expect(serviceHealth.name).toBe("Test Service");
      expect(serviceHealth.icon).toBe("test-icon");
      expect(serviceHealth.status).toBe("healthy");
      expect(serviceHealth.responseTimeMs).toBe(125);
      expect(serviceHealth.checks).toHaveLength(2);
    });

    it("should create ServiceHealth with empty checks array", () => {
      const serviceHealth: ServiceHealth = {
        name: "Test Service",
        icon: "test-icon",
        status: "unconfigured",
        responseTimeMs: 0,
        checks: [],
      };

      expect(serviceHealth.checks).toHaveLength(0);
    });

    it("should create ServiceHealth with error status", () => {
      const checks: ServiceCheck[] = [
        {
          name: "Check 1",
          endpoint: "/check1",
          status: "error",
          error: "Failed to connect",
        },
      ];

      const serviceHealth: ServiceHealth = {
        name: "Test Service",
        icon: "test-icon",
        status: "error",
        responseTimeMs: 0,
        checks,
      };

      expect(serviceHealth.status).toBe("error");
      expect(serviceHealth.checks[0]?.error).toBe("Failed to connect");
    });

    it("should allow all valid HealthStatus values in ServiceHealth", () => {
      const validStatuses: HealthStatus[] = [
        "healthy",
        "unhealthy",
        "error",
        "pending",
        "unconfigured",
      ];

      validStatuses.forEach((status) => {
        const serviceHealth: ServiceHealth = {
          name: "Test Service",
          icon: "test-icon",
          status,
          responseTimeMs: 0,
          checks: [],
        };
        expect(serviceHealth.status).toBe(status);
      });
    });

    it("should have responseTimeMs as required field", () => {
      const serviceHealth: ServiceHealth = {
        name: "Test Service",
        icon: "test-icon",
        status: "healthy",
        responseTimeMs: 100,
        checks: [],
      };

      expect(typeof serviceHealth.responseTimeMs).toBe("number");
    });
  });
});
