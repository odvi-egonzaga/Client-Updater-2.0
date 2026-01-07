import { describe, it, expect } from "vitest";
import { SERVICES } from "../health-check/config";

describe("SERVICES configuration", () => {
  it("should be defined", () => {
    expect(SERVICES).toBeDefined();
    expect(Array.isArray(SERVICES)).toBe(true);
  });

  it("should have 6 services configured", () => {
    expect(SERVICES).toHaveLength(6);
  });

  it("should have Clerk Authentication service", () => {
    const clerkService = SERVICES.find(
      (s) => s.name === "Clerk Authentication",
    );
    expect(clerkService).toBeDefined();
    expect(clerkService?.icon).toBe("key");
    expect(clerkService?.checks).toHaveLength(3);
  });

  it("should have Supabase Database service", () => {
    const dbService = SERVICES.find((s) => s.name === "Supabase Database");
    expect(dbService).toBeDefined();
    expect(dbService?.icon).toBe("database");
    expect(dbService?.checks).toHaveLength(3);
  });

  it("should have Supabase Storage service", () => {
    const storageService = SERVICES.find((s) => s.name === "Supabase Storage");
    expect(storageService).toBeDefined();
    expect(storageService?.icon).toBe("folder");
    expect(storageService?.checks).toHaveLength(3);
  });

  it("should have Supabase Edge Functions service", () => {
    const edgeService = SERVICES.find(
      (s) => s.name === "Supabase Edge Functions",
    );
    expect(edgeService).toBeDefined();
    expect(edgeService?.icon).toBe("zap");
    expect(edgeService?.checks).toHaveLength(2);
  });

  it("should have Snowflake service", () => {
    const snowflakeService = SERVICES.find((s) => s.name === "Snowflake");
    expect(snowflakeService).toBeDefined();
    expect(snowflakeService?.icon).toBe("snowflake");
    expect(snowflakeService?.checks).toHaveLength(2);
  });

  it("should have NextBank service", () => {
    const nextbankService = SERVICES.find((s) => s.name === "NextBank");
    expect(nextbankService).toBeDefined();
    expect(nextbankService?.icon).toBe("building");
    expect(nextbankService?.checks).toHaveLength(2);
  });

  it("should have all services with required properties", () => {
    SERVICES.forEach((service) => {
      expect(service.name).toBeDefined();
      expect(typeof service.name).toBe("string");
      expect(service.name.length).toBeGreaterThan(0);

      expect(service.icon).toBeDefined();
      expect(typeof service.icon).toBe("string");
      expect(service.icon.length).toBeGreaterThan(0);

      expect(service.checks).toBeDefined();
      expect(Array.isArray(service.checks)).toBe(true);
      expect(service.checks.length).toBeGreaterThan(0);
    });
  });

  it("should have all checks with required properties", () => {
    SERVICES.forEach((service) => {
      service.checks.forEach((check) => {
        expect(check.name).toBeDefined();
        expect(typeof check.name).toBe("string");
        expect(check.name.length).toBeGreaterThan(0);

        expect(check.endpoint).toBeDefined();
        expect(typeof check.endpoint).toBe("string");
        expect(check.endpoint.length).toBeGreaterThan(0);
        expect(check.endpoint).toMatch(/^\/.+/);
      });
    });
  });

  it("should have unique service names", () => {
    const serviceNames = SERVICES.map((s) => s.name);
    const uniqueNames = new Set(serviceNames);
    expect(uniqueNames.size).toBe(serviceNames.length);
  });

  it("should have unique icons", () => {
    const icons = SERVICES.map((s) => s.icon);
    const uniqueIcons = new Set(icons);
    expect(uniqueIcons.size).toBe(icons.length);
  });

  it("should have Clerk Authentication checks with correct endpoints", () => {
    const clerkService = SERVICES.find(
      (s) => s.name === "Clerk Authentication",
    );
    expect(clerkService?.checks[0].endpoint).toBe("/clerk/user");
    expect(clerkService?.checks[1].endpoint).toBe("/clerk/org");
    expect(clerkService?.checks[2].endpoint).toBe("/clerk/members");
  });

  it("should have Supabase Database checks with correct endpoints", () => {
    const dbService = SERVICES.find((s) => s.name === "Supabase Database");
    expect(dbService?.checks[0].endpoint).toBe("/database/write");
    expect(dbService?.checks[1].endpoint).toBe("/database/read");
    expect(dbService?.checks[2].endpoint).toBe("/database/delete");
  });

  it("should have Supabase Storage checks with correct endpoints", () => {
    const storageService = SERVICES.find((s) => s.name === "Supabase Storage");
    expect(storageService?.checks[0].endpoint).toBe("/storage/upload");
    expect(storageService?.checks[1].endpoint).toBe("/storage/download");
    expect(storageService?.checks[2].endpoint).toBe("/storage/delete");
  });

  it("should have Edge Functions checks with correct endpoints", () => {
    const edgeService = SERVICES.find(
      (s) => s.name === "Supabase Edge Functions",
    );
    expect(edgeService?.checks[0].endpoint).toBe("/edge/ping");
    expect(edgeService?.checks[1].endpoint).toBe("/edge/auth");
  });

  it("should have Snowflake checks with correct endpoints", () => {
    const snowflakeService = SERVICES.find((s) => s.name === "Snowflake");
    expect(snowflakeService?.checks[0].endpoint).toBe("/snowflake/connect");
    expect(snowflakeService?.checks[1].endpoint).toBe("/snowflake/query");
  });

  it("should have NextBank checks with correct endpoints", () => {
    const nextbankService = SERVICES.find((s) => s.name === "NextBank");
    expect(nextbankService?.checks[0].endpoint).toBe("/nextbank/ping");
    expect(nextbankService?.checks[1].endpoint).toBe("/nextbank/auth");
  });

  it("should have total of 15 checks across all services", () => {
    const totalChecks = SERVICES.reduce(
      (sum, service) => sum + service.checks.length,
      0,
    );
    expect(totalChecks).toBe(15);
  });
});
