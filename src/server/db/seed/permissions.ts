import { db } from "@/server/db";
import { permissions } from "@/server/db/schema";

const PERMISSIONS = [
  // Clients
  {
    code: "clients:read",
    resource: "clients",
    action: "read",
    description: "View client list and details",
  },
  {
    code: "clients:update",
    resource: "clients",
    action: "update",
    description: "Update client information",
  },

  // Status
  {
    code: "status:read",
    resource: "status",
    action: "read",
    description: "View client status",
  },
  {
    code: "status:update",
    resource: "status",
    action: "update",
    description: "Update client status",
  },
  {
    code: "status:history:read",
    resource: "status",
    action: "history:read",
    description: "View status history",
  },

  // Reports
  {
    code: "reports:read",
    resource: "reports",
    action: "read",
    description: "View reports",
  },
  {
    code: "reports:export",
    resource: "reports",
    action: "export",
    description: "Export reports",
  },

  // Users
  {
    code: "users:read",
    resource: "users",
    action: "read",
    description: "View user list",
  },
  {
    code: "users:manage",
    resource: "users",
    action: "manage",
    description: "Create/update/delete users",
  },

  // Branches
  {
    code: "branches:read",
    resource: "branches",
    action: "read",
    description: "View branches",
  },
  {
    code: "branches:manage",
    resource: "branches",
    action: "manage",
    description: "Manage branches",
  },

  // Areas
  {
    code: "areas:read",
    resource: "areas",
    action: "read",
    description: "View areas",
  },
  {
    code: "areas:manage",
    resource: "areas",
    action: "manage",
    description: "Manage areas",
  },

  // Config
  {
    code: "config:read",
    resource: "config",
    action: "read",
    description: "View configuration",
  },
  {
    code: "config:manage",
    resource: "config",
    action: "manage",
    description: "Manage configuration",
  },

  // Sync
  {
    code: "sync:read",
    resource: "sync",
    action: "read",
    description: "View sync status",
  },
  {
    code: "sync:execute",
    resource: "sync",
    action: "execute",
    description: "Trigger sync jobs",
  },
];

export async function seedPermissions() {
  console.log("Seeding permissions...");

  await db.insert(permissions).values(PERMISSIONS).onConflictDoNothing();

  console.log(`  - ${PERMISSIONS.length} permissions seeded`);
  console.log("Permissions seeded successfully!");
}
