import type { Context, Next } from "hono";
import { checkRateLimit, RateLimitType } from "@/lib/rate-limit";

export function rateLimitMiddleware(type: RateLimitType = "read") {
  return async (c: Context, next: Next) => {
    const userId = c.get("userId") as string | undefined;
    const identifier = userId || c.req.header("x-forwarded-for") || "anonymous";

    const result = await checkRateLimit(type, identifier);

    // Set rate limit headers
    c.header("X-RateLimit-Remaining", String(result.remaining));
    c.header("X-RateLimit-Reset", String(result.reset));

    if (!result.success) {
      return c.json(
        {
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests. Please try again later.",
          },
        },
        429,
      );
    }

    await next();
  };
}

