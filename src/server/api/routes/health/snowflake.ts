import { Hono } from "hono";
import {
  connectSnowflake,
  executeQuery,
  destroyConnection,
} from "@/lib/snowflake/client";
import { env } from "@/config/env";

export const snowflakeHealthRoutes = new Hono();

snowflakeHealthRoutes.get("/connect", async (c) => {
  const start = performance.now();

  if (!env.SNOWFLAKE_ACCOUNT || env.SNOWFLAKE_ACCOUNT === "placeholder") {
    return c.json({
      status: "unconfigured",
      responseTimeMs: Math.round(performance.now() - start),
      message: "Snowflake not configured",
    });
  }

  try {
    const connection = await connectSnowflake();
    await destroyConnection(connection);

    return c.json({
      status: "healthy",
      responseTimeMs: Math.round(performance.now() - start),
      message: "Successfully connected to Snowflake",
      data: {
        account: env.SNOWFLAKE_ACCOUNT,
        warehouse: env.SNOWFLAKE_WAREHOUSE,
        authenticator: env.SNOWFLAKE_AUTHENTICATOR,
        role: env.SNOWFLAKE_ROLE,
      },
    });
  } catch (error) {
    return c.json(
      {
        status: "error",
        responseTimeMs: Math.round(performance.now() - start),
        error: error instanceof Error ? error.message : "Connection failed",
      },
      500,
    );
  }
});

snowflakeHealthRoutes.get("/query", async (c) => {
  const start = performance.now();

  if (!env.SNOWFLAKE_ACCOUNT || env.SNOWFLAKE_ACCOUNT === "placeholder") {
    return c.json({
      status: "unconfigured",
      responseTimeMs: Math.round(performance.now() - start),
      message: "Snowflake not configured",
    });
  }

  try {
    const connection = await connectSnowflake();
    const rows = await executeQuery<{ CURRENT_TIMESTAMP: string }>(
      connection,
      "SELECT CURRENT_TIMESTAMP() as CURRENT_TIMESTAMP",
    );
    await destroyConnection(connection);

    return c.json({
      status: "healthy",
      responseTimeMs: Math.round(performance.now() - start),
      message: "Query executed successfully",
      data: {
        timestamp: rows[0]?.CURRENT_TIMESTAMP,
        rowCount: rows.length,
      },
    });
  } catch (error) {
    return c.json(
      {
        status: "error",
        responseTimeMs: Math.round(performance.now() - start),
        error: error instanceof Error ? error.message : "Query failed",
      },
      500,
    );
  }
});
