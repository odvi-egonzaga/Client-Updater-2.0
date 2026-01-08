import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Upstash
vi.mock("@upstash/redis", () => ({
  Redis: class {},
}));

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    limit = vi.fn().mockResolvedValue({
      success: true,
      remaining: 99,
      reset: Date.now() + 60000,
    });
  },
}));

describe("Rate Limiting", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("UPSTASH_REDIS_URL", "https://test.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_TOKEN", "test-token");
  });

  it("should export rate limit checker", async () => {
    const { checkRateLimit } = await import("../index");
    expect(checkRateLimit).toBeDefined();
  });

  it("should return rate limit result", async () => {
    const { checkRateLimit } = await import("../index");
    const result = await checkRateLimit("read", "user-123");

    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("remaining");
    expect(result).toHaveProperty("reset");
  });

  it("should export rate limit types", async () => {
    const { RATE_LIMIT_TYPES } = await import("../index");
    expect(RATE_LIMIT_TYPES).toContain("read");
    expect(RATE_LIMIT_TYPES).toContain("write");
    expect(RATE_LIMIT_TYPES).toContain("export");
    expect(RATE_LIMIT_TYPES).toContain("login");
  });
});



