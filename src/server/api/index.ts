import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { authMiddleware } from "./middleware/auth";
import { healthRoutes } from "./routes/health";
import { usersRoutes } from "./routes/users/index";
import { clientsRoutes } from "./routes/clients/index";
import { syncRoutes } from "./routes/sync/index";
import { statusRoutes } from "./routes/status/index";

const app = new Hono().basePath("/api");

app.use("*", logger());
app.use("*", cors());

// Public routes
app.get("/ping", (c) =>
  c.json({ status: "ok", timestamp: new Date().toISOString() }),
);

// Protected routes - require authentication
app.use("*", authMiddleware);
app.route("/health", healthRoutes);
app.route("/users", usersRoutes);
app.route("/clients", clientsRoutes);
app.route("/sync", syncRoutes);
app.route("/status", statusRoutes);

export { app };
export type AppType = typeof app;
