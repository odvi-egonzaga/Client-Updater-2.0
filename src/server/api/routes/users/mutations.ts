import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import {
  createUser,
  updateUser,
  toggleUserStatus,
  getUserByClerkId,
} from "@/server/db/queries/users";
import { permissions, userPermissions } from "@/server/db/schema/users";
import { logger } from "@/lib/logger";

export const userMutationRoutes = new Hono();

// Validation schema for creating a user with role
const createUserWithRoleSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.enum(["admin", "area_manager", "branch_officer", "regular"]),
  imageUrl: z.string().url().optional(),
  clerkOrgId: z.string().optional(),
});

// Validation schema for creating a user (legacy, for backward compatibility)
const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  imageUrl: z.string().url().optional(),
  clerkUserId: z.string().min(1),
  clerkOrgId: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

// Validation schema for updating a user
const updateUserSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  imageUrl: z.string().url().optional(),
  clerkOrgId: z.string().optional(),
});

// Validation schema for toggling user status
const toggleStatusSchema = z.object({
  isActive: z.boolean(),
});

/**
 * POST /api/users/create-with-role
 * Create a new user with Clerk and assign role-based permissions
 */
userMutationRoutes.post(
  "/create-with-role",
  zValidator("json", createUserWithRoleSchema),
  async (c) => {
    const start = performance.now();
    const userData = c.req.valid("json");

    try {
      // Create user in Clerk
      const client = await clerkClient();
      const clerkUser = await client.users.createUser({
        emailAddress: [userData.email],
        firstName: userData.firstName,
        lastName: userData.lastName,
        skipPasswordChecks: true,
        skipPasswordRequirement: true,
      });

      // Wait for webhook to create user in local database
      // Poll for user creation with timeout
      let localUser = null;
      let attempts = 0;
      const maxAttempts = 10; // 10 seconds max wait time
      
      while (attempts < maxAttempts && !localUser) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        localUser = await getUserByClerkId(clerkUser.id);
        attempts++;
      }

      if (!localUser) {
        logger.error("User not found in local database after Clerk creation", new Error("User creation timeout"), {
          action: "create_user_with_role",
          clerkUserId: clerkUser.id,
          email: userData.email,
        });
        return c.json(
          {
            success: false,
            error: {
              message: "User created in Clerk but not synced to local database",
            },
          },
          500,
        );
      }

      // Get all permissions
      const allPermissions = await db.select().from(permissions);
      
      // Assign permissions based on role
      const rolePermissions = getPermissionsForRole(userData.role, allPermissions);
      const roleScope = getScopeForRole(userData.role);

      // Insert user permissions
      if (rolePermissions.length > 0) {
        const userPermissionsToInsert = rolePermissions.map((permission) => ({
          userId: localUser.id,
          permissionId: permission.id,
          scope: roleScope as any,
        }));
        
        await db.insert(userPermissions).values(userPermissionsToInsert);
      }

      logger.info("Created new user with role", {
        action: "create_user_with_role",
        userId: localUser.id,
        clerkUserId: clerkUser.id,
        email: userData.email,
        role: userData.role,
      });

      return c.json({
        success: true,
        data: {
          ...localUser,
          role: userData.role,
        },
      });
    } catch (error) {
      logger.error("Failed to create user with role", error as Error, {
        action: "create_user_with_role",
        email: userData.email,
      });

      return c.json(
        {
          success: false,
          error: {
            message:
              error instanceof Error ? error.message : "Failed to create user",
          },
        },
        500,
      );
    }
  },
);

/**
 * POST /api/users
 * Create a new user (legacy, for backward compatibility)
 */
userMutationRoutes.post(
  "/",
  zValidator("json", createUserSchema),
  async (c) => {
    const start = performance.now();
    const userData = c.req.valid("json");

    try {
      const user = await createUser(db, {
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      logger.info("Created new user", {
        action: "create_user",
        userId: user.id,
        email: user.email,
      });

      return c.json({
        success: true,
        data: user,
      });
    } catch (error) {
      logger.error("Failed to create user", error as Error, {
        action: "create_user",
        email: userData.email,
      });

      return c.json(
        {
          success: false,
          error: {
            message:
              error instanceof Error ? error.message : "Failed to create user",
          },
        },
        500,
      );
    }
  },
);

/**
 * PATCH /api/users/:id
 * Update user fields
 */
userMutationRoutes.patch(
  "/:id",
  zValidator("json", updateUserSchema),
  async (c) => {
    const start = performance.now();
    const userId = c.req.param("id");
    const updates = c.req.valid("json");

    try {
      const user = await updateUser(db, userId, updates);

      if (!user) {
        logger.warn("User not found for update", {
          action: "update_user",
          userId,
        });

        return c.json(
          {
            success: false,
            error: {
              message: "User not found",
            },
          },
          404,
        );
      }

      logger.info("Updated user", {
        action: "update_user",
        userId,
      });

      return c.json({
        success: true,
        data: user,
      });
    } catch (error) {
      logger.error("Failed to update user", error as Error, {
        action: "update_user",
        userId,
      });

      return c.json(
        {
          success: false,
          error: {
            message:
              error instanceof Error ? error.message : "Failed to update user",
          },
        },
        500,
      );
    }
  },
);

/**
 * PATCH /api/users/:id/status
 * Toggle user active status
 */
userMutationRoutes.patch(
  "/:id/status",
  zValidator("json", toggleStatusSchema),
  async (c) => {
    const start = performance.now();
    const userId = c.req.param("id");
    const { isActive } = c.req.valid("json");

    try {
      const user = await toggleUserStatus(db, userId, isActive);

      if (!user) {
        logger.warn("User not found for status toggle", {
          action: "toggle_user_status",
          userId,
        });

        return c.json(
          {
            success: false,
            error: {
              message: "User not found",
            },
          },
          404,
        );
      }

      logger.info("Toggled user status", {
        action: "toggle_user_status",
        userId,
        isActive,
      });

      return c.json({
        success: true,
        data: user,
      });
    } catch (error) {
      logger.error("Failed to toggle user status", error as Error, {
        action: "toggle_user_status",
        userId,
        isActive,
      });

      return c.json(
        {
          success: false,
          error: {
            message:
              error instanceof Error
                ? error.message
                : "Failed to toggle user status",
          },
        },
        500,
      );
    }
  },
);

/**
 * Get permissions for a specific role
 */
function getPermissionsForRole(role: string, allPermissions: any[]): any[] {
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

    default:
      return [];
  }

  return allPermissions.filter((p) => permissionCodes.includes(p.code));
}

/**
 * Get scope for a specific role
 */
function getScopeForRole(role: string): string {
  switch (role) {
    case "admin":
      return "all";
    case "area_manager":
      return "area";
    case "branch_officer":
      return "branch";
    case "regular":
      return "self";
    default:
      return "self";
  }
}
