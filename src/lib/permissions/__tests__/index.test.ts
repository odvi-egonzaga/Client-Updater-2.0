import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CachedPermission, PermissionCheckContext } from "../index";

// Mock the cache module
vi.mock("@/lib/cache/redis", () => ({
  cache: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    delPattern: vi.fn(),
    isAvailable: vi.fn(() => true),
  },
  cacheKeys: {
    userPermissions: (userId: string) => `user:${userId}:permissions`,
  },
  CACHE_TTL: {
    USER_PERMISSIONS: 5 * 60,
  },
}));

// Mock the database queries
vi.mock("@/server/db/queries/permissions", () => ({
  getUserPermissions: vi.fn(),
}));

// Mock the logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the database
vi.mock("@/server/db/index", () => ({
  db: {},
}));

describe("Permission Service", () => {
  const mockUserId = "user-123";
  const mockCompanyId = "company-456";
  const mockPermissions: CachedPermission[] = [
    {
      permission: {
        id: "perm-1",
        code: "users.read",
        resource: "users",
        action: "read",
        description: "Read users",
        createdAt: new Date("2024-01-01"),
      },
      scope: "all",
      companyId: mockCompanyId,
    },
    {
      permission: {
        id: "perm-2",
        code: "clients.write",
        resource: "clients",
        action: "write",
        description: "Write clients",
        createdAt: new Date("2024-01-01"),
      },
      scope: "branch",
      companyId: mockCompanyId,
    },
    {
      permission: {
        id: "perm-3",
        code: "clients.delete",
        resource: "clients",
        action: "delete",
        description: "Delete clients",
        createdAt: new Date("2024-01-01"),
      },
      scope: "self",
      companyId: mockCompanyId,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getCachedPermissions", () => {
    it("should return cached permissions on cache hit", async () => {
      const { cache } = await import("@/lib/cache/redis");
      const { getUserPermissions } =
        await import("@/server/db/queries/permissions");
      const { getCachedPermissions } = await import("../index");

      vi.mocked(cache.get).mockResolvedValue(mockPermissions);

      const result = await getCachedPermissions(mockUserId, mockCompanyId);

      expect(cache.get).toHaveBeenCalledWith(`user:${mockUserId}:permissions`);
      expect(getUserPermissions).not.toHaveBeenCalled();
      expect(result).toEqual(mockPermissions);
    });

    it("should fetch from database on cache miss and cache the result", async () => {
      const { cache } = await import("@/lib/cache/redis");
      const { getUserPermissions } =
        await import("@/server/db/queries/permissions");
      const { getCachedPermissions } = await import("../index");

      vi.mocked(cache.get).mockResolvedValue(null);
      vi.mocked(getUserPermissions).mockResolvedValue(mockPermissions);

      const result = await getCachedPermissions(mockUserId, mockCompanyId);

      expect(cache.get).toHaveBeenCalledWith(`user:${mockUserId}:permissions`);
      expect(getUserPermissions).toHaveBeenCalledWith(
        expect.anything(),
        mockUserId,
        mockCompanyId,
      );
      expect(cache.set).toHaveBeenCalledWith(
        `user:${mockUserId}:permissions`,
        mockPermissions,
        300,
      );
      expect(result).toEqual(mockPermissions);
    });

    it("should filter by company when companyId is provided", async () => {
      const { cache } = await import("@/lib/cache/redis");
      const { getCachedPermissions } = await import("../index");

      const permissionsWithMultipleCompanies: CachedPermission[] = [
        ...mockPermissions,
        {
          permission: {
            id: "perm-4",
            code: "users.write",
            resource: "users",
            action: "write",
            description: "Write users",
            createdAt: new Date("2024-01-01"),
          },
          scope: "all",
          companyId: "other-company",
        },
      ];

      vi.mocked(cache.get).mockResolvedValue(permissionsWithMultipleCompanies);

      const result = await getCachedPermissions(mockUserId, mockCompanyId);

      expect(result).toHaveLength(3);
      expect(result.every((p) => p.companyId === mockCompanyId)).toBe(true);
    });

    it("should fallback to database on cache error", async () => {
      const { cache } = await import("@/lib/cache/redis");
      const { getUserPermissions } =
        await import("@/server/db/queries/permissions");
      const { getCachedPermissions } = await import("../index");

      vi.mocked(cache.get).mockRejectedValue(new Error("Cache error"));
      vi.mocked(getUserPermissions).mockResolvedValue(mockPermissions);

      const result = await getCachedPermissions(mockUserId, mockCompanyId);

      expect(getUserPermissions).toHaveBeenCalledWith(
        expect.anything(),
        mockUserId,
        mockCompanyId,
      );
      expect(result).toEqual(mockPermissions);
    });

    it("should throw error when both cache and database fail", async () => {
      const { cache } = await import("@/lib/cache/redis");
      const { getUserPermissions } =
        await import("@/server/db/queries/permissions");
      const { getCachedPermissions } = await import("../index");

      vi.mocked(cache.get).mockRejectedValue(new Error("Cache error"));
      vi.mocked(getUserPermissions).mockRejectedValue(
        new Error("Database error"),
      );

      await expect(
        getCachedPermissions(mockUserId, mockCompanyId),
      ).rejects.toThrow("Database error");
    });
  });

  describe("hasPermission", () => {
    it("should return true when user has permission with all scope", async () => {
      const { hasPermission } = await import("../index");
      const { cache } = await import("@/lib/cache/redis");

      vi.mocked(cache.get).mockResolvedValue(mockPermissions);

      const result = await hasPermission(
        mockUserId,
        mockCompanyId,
        "users",
        "read",
      );

      expect(result).toBe(true);
    });

    it("should return false when user does not have permission", async () => {
      const { hasPermission } = await import("../index");
      const { cache } = await import("@/lib/cache/redis");

      vi.mocked(cache.get).mockResolvedValue(mockPermissions);

      const result = await hasPermission(
        mockUserId,
        mockCompanyId,
        "reports",
        "read",
      );

      expect(result).toBe(false);
    });

    it("should return true for branch scope without context", async () => {
      const { hasPermission } = await import("../index");
      const { cache } = await import("@/lib/cache/redis");

      vi.mocked(cache.get).mockResolvedValue(mockPermissions);

      const result = await hasPermission(
        mockUserId,
        mockCompanyId,
        "clients",
        "write",
      );

      expect(result).toBe(true);
    });

    it("should return true for self scope when user is owner", async () => {
      const { hasPermission } = await import("../index");
      const { cache } = await import("@/lib/cache/redis");

      vi.mocked(cache.get).mockResolvedValue(mockPermissions);

      const context: PermissionCheckContext = {
        resourceOwnerId: mockUserId,
      };

      const result = await hasPermission(
        mockUserId,
        mockCompanyId,
        "clients",
        "delete",
        context,
      );

      expect(result).toBe(true);
    });

    it("should return false for self scope when user is not owner", async () => {
      const { hasPermission } = await import("../index");
      const { cache } = await import("@/lib/cache/redis");

      vi.mocked(cache.get).mockResolvedValue(mockPermissions);

      const context: PermissionCheckContext = {
        resourceOwnerId: "other-user",
      };

      const result = await hasPermission(
        mockUserId,
        mockCompanyId,
        "clients",
        "delete",
        context,
      );

      expect(result).toBe(false);
    });

    it("should return false for self scope without context", async () => {
      const { hasPermission } = await import("../index");
      const { cache } = await import("@/lib/cache/redis");

      vi.mocked(cache.get).mockResolvedValue(mockPermissions);

      const result = await hasPermission(
        mockUserId,
        mockCompanyId,
        "clients",
        "delete",
      );

      expect(result).toBe(false);
    });

    it("should use highest scope when multiple permissions exist", async () => {
      const { hasPermission } = await import("../index");
      const { cache } = await import("@/lib/cache/redis");

      const permissionsWithMultipleScopes: CachedPermission[] = [
        {
          permission: {
            id: "perm-1",
            code: "users.read",
            resource: "users",
            action: "read",
            description: "Read users",
            createdAt: new Date("2024-01-01"),
          },
          scope: "self",
          companyId: mockCompanyId,
        },
        {
          permission: {
            id: "perm-2",
            code: "users.read",
            resource: "users",
            action: "read",
            description: "Read users",
            createdAt: new Date("2024-01-01"),
          },
          scope: "all",
          companyId: mockCompanyId,
        },
      ];

      vi.mocked(cache.get).mockResolvedValue(permissionsWithMultipleScopes);

      const result = await hasPermission(
        mockUserId,
        mockCompanyId,
        "users",
        "read",
      );

      expect(result).toBe(true);
    });

    it("should return false on error", async () => {
      const { hasPermission } = await import("../index");
      const { cache } = await import("@/lib/cache/redis");

      vi.mocked(cache.get).mockRejectedValue(new Error("Cache error"));

      const result = await hasPermission(
        mockUserId,
        mockCompanyId,
        "users",
        "read",
      );

      expect(result).toBe(false);
    });
  });

  describe("invalidateUserPermissions", () => {
    it("should delete cached permissions for user", async () => {
      const { invalidateUserPermissions } = await import("../index");
      const { cache } = await import("@/lib/cache/redis");

      await invalidateUserPermissions(mockUserId);

      expect(cache.del).toHaveBeenCalledWith(`user:${mockUserId}:permissions`);
    });

    it("should not throw error when cache deletion fails", async () => {
      const { invalidateUserPermissions } = await import("../index");
      const { cache } = await import("@/lib/cache/redis");

      vi.mocked(cache.del).mockRejectedValue(new Error("Cache error"));

      await expect(
        invalidateUserPermissions(mockUserId),
      ).resolves.not.toThrow();
    });
  });

  describe("invalidateAllUserPermissions", () => {
    it("should delete all user permission caches", async () => {
      const { invalidateAllUserPermissions } = await import("../index");
      const { cache } = await import("@/lib/cache/redis");

      await invalidateAllUserPermissions();

      expect(cache.delPattern).toHaveBeenCalledWith("user:*:permissions");
    });

    it("should not throw error when cache deletion fails", async () => {
      const { invalidateAllUserPermissions } = await import("../index");
      const { cache } = await import("@/lib/cache/redis");

      vi.mocked(cache.delPattern).mockRejectedValue(new Error("Cache error"));

      await expect(invalidateAllUserPermissions()).resolves.not.toThrow();
    });
  });

  describe("getAllUserPermissions", () => {
    it("should get all permissions for user", async () => {
      const { getAllUserPermissions } = await import("../index");
      const { cache } = await import("@/lib/cache/redis");

      vi.mocked(cache.get).mockResolvedValue(mockPermissions);

      const result = await getAllUserPermissions(mockUserId);

      expect(result).toEqual(mockPermissions);
    });
  });

  describe("hasAnyPermissionForResource", () => {
    it("should return true when user has any permission for resource", async () => {
      const { hasAnyPermissionForResource } = await import("../index");
      const { cache } = await import("@/lib/cache/redis");

      vi.mocked(cache.get).mockResolvedValue(mockPermissions);

      const result = await hasAnyPermissionForResource(
        mockUserId,
        mockCompanyId,
        "users",
      );

      expect(result).toBe(true);
    });

    it("should return false when user has no permission for resource", async () => {
      const { hasAnyPermissionForResource } = await import("../index");
      const { cache } = await import("@/lib/cache/redis");

      vi.mocked(cache.get).mockResolvedValue(mockPermissions);

      const result = await hasAnyPermissionForResource(
        mockUserId,
        mockCompanyId,
        "reports",
      );

      expect(result).toBe(false);
    });

    it("should return false on error", async () => {
      const { hasAnyPermissionForResource } = await import("../index");
      const { cache } = await import("@/lib/cache/redis");

      vi.mocked(cache.get).mockRejectedValue(new Error("Cache error"));

      const result = await hasAnyPermissionForResource(
        mockUserId,
        mockCompanyId,
        "users",
      );

      expect(result).toBe(false);
    });
  });
});
