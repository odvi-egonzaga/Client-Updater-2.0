import { Hono } from "hono";
import { clientListRoutes } from "./list";
import { clientDetailRoutes } from "./detail";
import { clientSearchRoutes } from "./search";

export const clientsRoutes = new Hono();

// Register all client route modules
clientsRoutes.route("/", clientListRoutes);
clientsRoutes.route("/", clientDetailRoutes);
clientsRoutes.route("/", clientSearchRoutes);
