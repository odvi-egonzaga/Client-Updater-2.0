import { Hono } from "hono";
import { statusSummaryRoutes } from "./summary";
import { clientStatusRoutes } from "./client-status";
import { statusHistoryRoutes } from "./history";
import { statusUpdateRoutes } from "./update";
import { statusBulkUpdateRoutes } from "./bulk-update";

export const statusRoutes = new Hono();

// Register all status route modules
statusRoutes.route("/", statusSummaryRoutes);
statusRoutes.route("/", clientStatusRoutes);
statusRoutes.route("/", statusHistoryRoutes);
statusRoutes.route("/", statusUpdateRoutes);
statusRoutes.route("/", statusBulkUpdateRoutes);
