// Clerk auth middleware for Hono
import { createMiddleware } from "hono/factory";
import { getAuth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import type { ApiEnv } from "../types";

export const authMiddleware = createMiddleware(async (c, next) => {
  const request = c.req.raw as NextRequest;
  const auth = getAuth(request);

  if (!auth.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Set typed context variables
  c.set("auth", {
    userId: auth.userId,
    orgId: auth.orgId ?? null,
  });
  c.set("userId", auth.userId);
  c.set("orgId", auth.orgId ?? null);

  await next();
});
