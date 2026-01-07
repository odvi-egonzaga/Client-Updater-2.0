import { Hono } from "hono";
import { nextbankClient } from "@/lib/nextbank/client";
import { env } from "@/config/env";

export const nextbankHealthRoutes = new Hono();

nextbankHealthRoutes.get("/ping", async (c) => {
  const start = performance.now();

  if (!env.NEXTBANK_API || env.NEXTBANK_API === "placeholder") {
    return c.json({
      status: "unconfigured",
      responseTimeMs: Math.round(performance.now() - start),
      message: "NextBank API not configured",
    });
  }

  // Generate fingerprint based on request headers
  const userAgent = c.req.header("user-agent") || "unknown";
  const ipAddress =
    c.req.header("x-forwarded-for")?.split(",")[0] ||
    c.req.header("x-real-ip") ||
    "127.0.0.1";
  const acceptLanguage = c.req.header("accept-language") || "";

  const fingerprintString = `${userAgent}-${ipAddress}-${acceptLanguage}`;
  const fingerprint = Buffer.from(fingerprintString).toString("base64");

  try {
    const result = await nextbankClient.ping(fingerprint);
    return c.json({
      status: "healthy",
      responseTimeMs: Math.round(performance.now() - start),
      message: "Successfully pinged NextBank API",
      data: result,
    });
  } catch (error) {
    return c.json(
      {
        status: "error",
        responseTimeMs: Math.round(performance.now() - start),
        error: error instanceof Error ? error.message : "Ping failed",
      },
      500,
    );
  }
});
