import { db } from "@/server/db";
import { users, userPermissions, userAreas, userBranches, permissions } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import {
  SEED_CONFIG,
  generateFilipinoName,
  getRecentDate,
  getRandomInt,
  getRandomItem,
  getRandomBoolean,
} from "./helpers";

type UserRole = "admin" | "area_manager" | "branch_officer" | "regular" | "developer";

export async function seedUsers(organizationData: { areas: any[]; branches: any[] }) {
  console.log("Seeding users...");

  // Get all permissions
  const allPermissions = await db.select().from(permissions);

  // Create users with different roles
  const usersToCreate: typeof users.$inferInsert[] = [];

  // Admin users (full access)
  for (let i = 0; i < SEED_CONFIG.adminUsers; i++) {
    usersToCreate.push(createUser("admin", i));
  }

  // Area managers (area-level access)
  for (let i = 0; i < SEED_CONFIG.areaManagers; i++) {
    usersToCreate.push(createUser("area_manager", i));
  }

  // Branch officers (branch-level access)
  for (let i = 0; i < SEED_CONFIG.branchOfficers; i++) {
    usersToCreate.push(createUser("branch_officer", i));
  }

  // Regular users (self-only access)
  for (let i = 0; i < SEED_CONFIG.regularUsers; i++) {
    usersToCreate.push(createUser("regular", i));
  }

  // Developer users (full access for development)
  for (let i = 0; i < SEED_CONFIG.developerUsers; i++) {
    usersToCreate.push(createUser("developer", i));
  }

  const insertedUsers = await db.insert(users).values(usersToCreate).onConflictDoNothing().returning();
  console.log(`  - ${insertedUsers.length} users seeded`);

  // Assign permissions based on role
  const userPermissionsToInsert: typeof userPermissions.$inferInsert[] = [];

  insertedUsers.forEach((user) => {
    const role = (user.email.split("@")[0]?.split("_")[0] || "regular") as UserRole;
    const rolePermissions = getPermissionsForRole(role, allPermissions);

    rolePermissions.forEach((permission) => {
      userPermissionsToInsert.push({
        userId: user.id,
        permissionId: permission.id,
        scope: getScopeForRole(role) as any,
      });
    });
  });

  if (userPermissionsToInsert.length > 0) {
    await db.insert(userPermissions).values(userPermissionsToInsert).onConflictDoNothing();
    console.log(`  - ${userPermissionsToInsert.length} user permissions seeded`);
  } else {
    console.log(`  - No user permissions to seed`);
  }

  // Assign areas and branches based on role
  const userAreasToInsert: typeof userAreas.$inferInsert[] = [];
  const userBranchesToInsert: typeof userBranches.$inferInsert[] = [];

  insertedUsers.forEach((user) => {
    const role = (user.email.split("@")[0]?.split("_")[0] || "regular") as UserRole;

    if (role === "area_manager") {
      // Assign 1-2 areas
      const numAreas = getRandomInt(1, 2);
      const assignedAreas = getRandomItems(organizationData.areas, numAreas);

      assignedAreas.forEach((area) => {
        userAreasToInsert.push({
          userId: user.id,
          areaId: area.id,
        });
      });
    } else if (role === "branch_officer") {
      // Assign 1-2 branches
      const numBranches = getRandomInt(1, 2);
      const assignedBranches = getRandomItems(organizationData.branches, numBranches);

      assignedBranches.forEach((branch) => {
        userBranchesToInsert.push({
          userId: user.id,
          branchId: branch.id,
        });
      });
    }
  });

  if (userAreasToInsert.length > 0) {
    await db.insert(userAreas).values(userAreasToInsert).onConflictDoNothing();
    console.log(`  - ${userAreasToInsert.length} user-area assignments seeded`);
  } else {
    console.log(`  - No user-area assignments to seed`);
  }

  if (userBranchesToInsert.length > 0) {
    await db.insert(userBranches).values(userBranchesToInsert).onConflictDoNothing();
    console.log(`  - ${userBranchesToInsert.length} user-branch assignments seeded`);
  } else {
    console.log(`  - No user-branch assignments to seed`);
  }

  console.log("Users seeded successfully!");

  return insertedUsers;
}

function createUser(role: UserRole, index: number): typeof users.$inferInsert {
  const firstName = generateFilipinoName().split(" ")[0];
  const lastName = generateFilipinoName().split(" ")[1];
  const email = `${role}_${index + 1}@fcash-pcni.test`;

  return {
    email,
    firstName,
    lastName,
    isActive: true,
    mustChangePassword: false,
    lastLoginAt: getRecentDate(30),
    loginCount: getRandomInt(1, 50),
    failedLoginCount: getRandomInt(0, 3),
    imageUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${email}`,
  } as any;
}

function getPermissionsForRole(role: UserRole, allPermissions: any[]): any[] {
  const permissionCodes: string[] = [];

  switch (role) {
    case "admin":
      // All permissions
      return allPermissions;

    case "area_manager":
      permissionCodes.push(
        "clients:read",
        "clients:update",
        "status:read",
        "status:update",
        "status:history:read",
        "reports:read",
        "reports:export",
        "branches:read",
        "areas:read",
        "config:read",
        "sync:read",
      );
      break;

    case "branch_officer":
      permissionCodes.push(
        "clients:read",
        "clients:update",
        "status:read",
        "status:update",
        "status:history:read",
        "reports:read",
        "branches:read",
      );
      break;

    case "regular":
      permissionCodes.push(
        "clients:read",
        "status:read",
        "status:history:read",
        "reports:read",
      );
      break;

    case "developer":
      // All permissions like admin
      return allPermissions;
  }

  return allPermissions.filter((p) => permissionCodes.includes(p.code));
}

function getScopeForRole(role: UserRole): string {
  switch (role) {
    case "admin":
      return "all";
    case "area_manager":
      return "area";
    case "branch_officer":
      return "branch";
    case "regular":
      return "self";
    case "developer":
      return "all";
    default:
      return "self";
  }
}

function getRandomItems<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, array.length));
}
