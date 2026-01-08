import { Hono } from "hono";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const frameworkHealthRoutes = new Hono();

frameworkHealthRoutes.get("/hono", (c) => {
  const start = performance.now();
  return c.json({
    status: "healthy",
    responseTimeMs: Math.round(performance.now() - start),
    message: "Hono framework is running correctly",
    data: {
      version: "4.11.3", // matching package.json
      environment: process.env.NODE_ENV,
    },
  });
});

frameworkHealthRoutes.get("/drizzle", async (c) => {
  const start = performance.now();
  try {
    // Note: Edge Runtime doesn't support direct Drizzle + postgres.js connection
    // We check Supabase connection instead as a proxy for DB health
    const { error } = await supabaseAdmin
      .from("health_check_tests")
      .select("count")
      .limit(1);

    if (error) throw error;

    return c.json({
      status: "healthy",
      responseTimeMs: Math.round(performance.now() - start),
      message:
        "Database access via Supabase Client is working (Edge compatible)",
      data: {
        mode: "http-client",
        platform: "supabase",
      },
    });
  } catch (error) {
    return c.json(
      {
        status: "error",
        responseTimeMs: Math.round(performance.now() - start),
        error: error instanceof Error ? error.message : "Database check failed",
      },
      500,
    );
  }
});
