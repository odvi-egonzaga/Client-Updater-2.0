import { Hono } from "hono";
import { synologyClient } from "@/lib/synology/client";
import { env } from "@/config/env";

export const synologyHealthRoutes = new Hono();

synologyHealthRoutes.get("/ping", async (c) => {
  const start = performance.now();

  if (!env.SYNOLOGY_HOST) {
    return c.json({
      status: "unconfigured",
      responseTimeMs: Math.round(performance.now() - start),
      message: "Synology Host not configured",
    });
  }

  try {
    const result = await synologyClient.ping();
    return c.json({
      status: "healthy",
      responseTimeMs: Math.round(performance.now() - start),
      message: "Successfully connected to Synology",
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

synologyHealthRoutes.get("/auth", async (c) => {
  const start = performance.now();

  if (!env.SYNOLOGY_HOST || !env.SYNOLOGY_USERNAME || !env.SYNOLOGY_PASSWORD) {
    return c.json({
      status: "unconfigured",
      responseTimeMs: Math.round(performance.now() - start),
      message: "Synology credentials not configured",
    });
  }

  try {
    // The ping method already does a login check if credentials are provided
    const result = await synologyClient.ping();
    return c.json({
      status: "healthy",
      responseTimeMs: Math.round(performance.now() - start),
      message: "Successfully authenticated with Synology",
      data: result,
    });
  } catch (error) {
    return c.json(
      {
        status: "error",
        responseTimeMs: Math.round(performance.now() - start),
        error: error instanceof Error ? error.message : "Auth failed",
      },
      500,
    );
  }
});
