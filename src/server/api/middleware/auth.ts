// Clerk auth middleware for Hono placeholder
import { createMiddleware } from "hono/factory";
import { getAuth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";

export const authMiddleware = createMiddleware(async (c, next) => {
  const request = c.req.raw as NextRequest;
  const auth = getAuth(request);

  if (!auth.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("auth", auth);
  c.set("userId", auth.userId);
  c.set("orgId", auth.orgId);

  await next();
});
