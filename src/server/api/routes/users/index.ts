import { Hono } from "hono";
import { userListRoutes } from "./list";
import { userDetailRoutes } from "./detail";
import { userMutationRoutes } from "./mutations";
import { userPermissionsRoutes } from "./permissions";
import { userTerritoriesRoutes } from "./territories";
import { userSessionsRoutes } from "./sessions";

export const usersRoutes = new Hono();

// Register all user route modules
usersRoutes.route("/", userListRoutes);
usersRoutes.route("/", userDetailRoutes);
usersRoutes.route("/", userMutationRoutes);
usersRoutes.route("/", userPermissionsRoutes);
usersRoutes.route("/", userTerritoriesRoutes);
usersRoutes.route("/", userSessionsRoutes);
