import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Infrastructure Environment Variables", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should parse Upstash Redis URL", async () => {
    vi.stubEnv("UPSTASH_REDIS_URL", "https://test.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_TOKEN", "test-token");

    const { env } = await import("../env");
    expect(env.UPSTASH_REDIS_URL).toBe("https://test.upstash.io");
    expect(env.UPSTASH_REDIS_TOKEN).toBe("test-token");
  });

  it("should have default rate limit values", async () => {
    const { env } = await import("../env");
    expect(env.RATE_LIMIT_READ_REQUESTS).toBe(100);
    expect(env.RATE_LIMIT_WRITE_REQUESTS).toBe(30);
  });
});

