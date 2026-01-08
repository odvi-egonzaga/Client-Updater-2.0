import { Hono } from "hono";

/**
 * Hono environment types for context variables
 * These are set by authMiddleware and available in all protected routes
 */
export interface ApiEnv {
  Variables: {
    userId: string;
    orgId: string | null;
    auth: {
      userId: string;
      orgId: string | null;
    };
  };
}

/**
 * Create a new typed Hono instance with our environment
 * Use this instead of `new Hono()` in all route files
 */
export const ApiHono = Hono as unknown as new () => Hono<ApiEnv>;
