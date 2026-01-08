import { describe, it, expect } from "vitest";
import type {
  User,
  UserWithDetails,
  UserListResponse,
  Permission,
  UserPermission,
  Area,
  UserArea,
  Branch,
  UserBranch,
  UserSession,
  UserFilters,
  CreateUserInput,
  UpdateUserInput,
  SetUserPermissionsInput,
  SetUserTerritoriesInput,
  UserTerritories,
  ApiResponse,
} from "../types";

describe("User types", () => {
  describe("User interface", () => {
    it("should create a valid User object", () => {
      const user: User = {
        id: "123",
        clerkId: "clerk_123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        imageUrl: "https://example.com/image.jpg",
        clerkOrgId: "org_123",
        isActive: true,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
        lastLoginAt: new Date(),
        loginCount: 5,
        failedLoginCount: 0,
        lockedUntil: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(user.id).toBe("123");
      expect(user.email).toBe("test@example.com");
      expect(user.isActive).toBe(true);
    });

    it("should create User with null optional fields", () => {
      const user: User = {
        id: "123",
        clerkId: null,
        email: "test@example.com",
        firstName: null,
        lastName: null,
        imageUrl: null,
        clerkOrgId: null,
        isActive: true,
        mustChangePassword: false,
        passwordChangedAt: null,
        lastLoginAt: null,
        loginCount: 0,
        failedLoginCount: 0,
        lockedUntil: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(user.firstName).toBeNull();
      expect(user.lastName).toBeNull();
      expect(user.imageUrl).toBeNull();
    });
  });

  describe("UserWithDetails interface", () => {
    it("should create a valid UserWithDetails object", () => {
      const userWithDetails: UserWithDetails = {
        id: "123",
        clerkId: "clerk_123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        imageUrl: null,
        clerkOrgId: null,
        isActive: true,
        mustChangePassword: false,
        passwordChangedAt: null,
        lastLoginAt: null,
        loginCount: 0,
        failedLoginCount: 0,
        lockedUntil: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        permissions: [],
        areas: [],
        branches: [],
      };

      expect(userWithDetails.permissions).toEqual([]);
      expect(userWithDetails.areas).toEqual([]);
      expect(userWithDetails.branches).toEqual([]);
    });
  });

  describe("UserListResponse interface", () => {
    it("should create a valid UserListResponse object", () => {
      const response: UserListResponse = {
        success: true,
        data: [],
        meta: {
          page: 1,
          pageSize: 25,
          total: 0,
          totalPages: 0,
        },
      };

      expect(response.success).toBe(true);
      expect(response.data).toEqual([]);
      expect(response.meta.page).toBe(1);
    });
  });

  describe("Permission interface", () => {
    it("should create a valid Permission object", () => {
      const permission: Permission = {
        id: "123",
        code: "users.read",
        resource: "users",
        action: "read",
        description: "Read users",
        createdAt: new Date(),
      };

      expect(permission.code).toBe("users.read");
      expect(permission.resource).toBe("users");
      expect(permission.action).toBe("read");
    });
  });

  describe("UserPermission interface", () => {
    it("should create a valid UserPermission object", () => {
      const permission: Permission = {
        id: "123",
        code: "users.read",
        resource: "users",
        action: "read",
        description: "Read users",
        createdAt: new Date(),
      };

      const userPermission: UserPermission = {
        userId: "456",
        permissionId: "123",
        permission,
        companyId: "789",
        company: {
          id: "789",
          name: "Test Company",
        },
        scope: "all",
        grantedAt: new Date(),
      };

      expect(userPermission.scope).toBe("all");
      expect(userPermission.permission.code).toBe("users.read");
    });

    it("should accept all valid scope values", () => {
      const scopes: Array<"self" | "branch" | "area" | "all"> = [
        "self",
        "branch",
        "area",
        "all",
      ];

      scopes.forEach((scope) => {
        const userPermission: UserPermission = {
          userId: "456",
          permissionId: "123",
          permission: {
            id: "123",
            code: "users.read",
            resource: "users",
            action: "read",
            description: "Read users",
            createdAt: new Date(),
          },
          companyId: null,
          company: null,
          scope,
          grantedAt: new Date(),
        };

        expect(userPermission.scope).toBe(scope);
      });
    });
  });

  describe("Area interface", () => {
    it("should create a valid Area object", () => {
      const area: Area = {
        id: "123",
        code: "AREA001",
        name: "Test Area",
        companyId: "456",
        company: {
          id: "456",
          name: "Test Company",
        },
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(area.code).toBe("AREA001");
      expect(area.name).toBe("Test Area");
    });
  });

  describe("Branch interface", () => {
    it("should create a valid Branch object", () => {
      const branch: Branch = {
        id: "123",
        code: "BRANCH001",
        name: "Test Branch",
        location: "Test Location",
        category: "Test Category",
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(branch.code).toBe("BRANCH001");
      expect(branch.name).toBe("Test Branch");
    });
  });

  describe("UserSession interface", () => {
    it("should create a valid UserSession object", () => {
      const session: UserSession = {
        id: "123",
        userId: "456",
        sessionToken: "session_token_123",
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
        createdAt: new Date(),
        expiresAt: new Date(),
        revokedAt: null,
        revokedReason: null,
      };

      expect(session.sessionToken).toBe("session_token_123");
      expect(session.ipAddress).toBe("192.168.1.1");
    });
  });

  describe("UserFilters interface", () => {
    it("should create UserFilters with all fields", () => {
      const filters: UserFilters = {
        isActive: true,
        search: "john",
      };

      expect(filters.isActive).toBe(true);
      expect(filters.search).toBe("john");
    });

    it("should create UserFilters with partial fields", () => {
      const filters1: UserFilters = {
        isActive: true,
      };

      const filters2: UserFilters = {
        search: "john",
      };

      expect(filters1.isActive).toBe(true);
      expect(filters2.search).toBe("john");
    });

    it("should create empty UserFilters", () => {
      const filters: UserFilters = {};

      expect(Object.keys(filters)).toHaveLength(0);
    });
  });

  describe("CreateUserInput interface", () => {
    it("should create a valid CreateUserInput object", () => {
      const input: CreateUserInput = {
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        imageUrl: "https://example.com/image.jpg",
        clerkUserId: "clerk_123",
        clerkOrgId: "org_123",
        isActive: true,
      };

      expect(input.email).toBe("test@example.com");
      expect(input.firstName).toBe("John");
      expect(input.lastName).toBe("Doe");
    });

    it("should create CreateUserInput with required fields only", () => {
      const input: CreateUserInput = {
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        clerkUserId: "clerk_123",
      };

      expect(input.email).toBe("test@example.com");
      expect(input.imageUrl).toBeUndefined();
      expect(input.isActive).toBeUndefined();
    });
  });

  describe("UpdateUserInput interface", () => {
    it("should create UpdateUserInput with partial fields", () => {
      const input: UpdateUserInput = {
        email: "new@example.com",
        firstName: "Jane",
      };

      expect(input.email).toBe("new@example.com");
      expect(input.firstName).toBe("Jane");
      expect(input.lastName).toBeUndefined();
    });
  });

  describe("SetUserPermissionsInput interface", () => {
    it("should create a valid SetUserPermissionsInput object", () => {
      const input: SetUserPermissionsInput = {
        permissions: [
          {
            permissionId: "123",
            companyId: "456",
            scope: "all",
          },
          {
            permissionId: "789",
            companyId: "456",
            scope: "branch",
          },
        ],
      };

      expect(input.permissions).toHaveLength(2);
      expect(input.permissions[0]?.scope).toBe("all");
    });
  });

  describe("SetUserTerritoriesInput interface", () => {
    it("should create SetUserTerritoriesInput with areas and branches", () => {
      const input: SetUserTerritoriesInput = {
        areaIds: ["123", "456"],
        branchIds: ["789", "012"],
      };

      expect(input.areaIds).toHaveLength(2);
      expect(input.branchIds).toHaveLength(2);
    });

    it("should create SetUserTerritoriesInput with only areas", () => {
      const input: SetUserTerritoriesInput = {
        areaIds: ["123", "456"],
      };

      expect(input.areaIds).toHaveLength(2);
      expect(input.branchIds).toBeUndefined();
    });

    it("should create SetUserTerritoriesInput with only branches", () => {
      const input: SetUserTerritoriesInput = {
        branchIds: ["789", "012"],
      };

      expect(input.areaIds).toBeUndefined();
      expect(input.branchIds).toHaveLength(2);
    });
  });

  describe("UserTerritories interface", () => {
    it("should create a valid UserTerritories object", () => {
      const territories: UserTerritories = {
        areas: [],
        branches: [],
      };

      expect(territories.areas).toEqual([]);
      expect(territories.branches).toEqual([]);
    });
  });

  describe("ApiResponse interface", () => {
    it("should create successful ApiResponse", () => {
      const response: ApiResponse<string> = {
        success: true,
        data: "test data",
      };

      expect(response.success).toBe(true);
      expect(response.data).toBe("test data");
      expect(response.error).toBeUndefined();
    });

    it("should create error ApiResponse", () => {
      const response: ApiResponse<string> = {
        success: false,
        error: {
          message: "Error message",
        },
      };

      expect(response.success).toBe(false);
      expect(response.data).toBeUndefined();
      expect(response.error?.message).toBe("Error message");
    });
  });
});
