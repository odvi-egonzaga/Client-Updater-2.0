import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as permissionQueries from "../permissions";
import { permissions, userPermissions } from "../../schema/users";
import { eq, and, inArray } from "drizzle-orm";

// Mock database
vi.mock("../../index", () => {
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockDelete = vi.fn();

  return {
    db: {
      select: mockSelect,
      insert: mockInsert,
      delete: mockDelete,
    },
  };
});

// Mock logger
vi.mock("@/lib/logger/index", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { db } from "../../index";

describe("Permission Queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getAllPermissions", () => {
    it("should return all permissions", async () => {
      const mockPermissions = [
        { id: "1", code: "users.read", resource: "users", action: "read" },
        { id: "2", code: "users.write", resource: "users", action: "write" },
      ];

      const mockFrom = vi.fn().mockReturnThis();
      const mockOrderBy = vi.fn().mockResolvedValue(mockPermissions);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        orderBy: mockOrderBy,
      });

      const result = await permissionQueries.getAllPermissions(db);

      expect(result).toEqual(mockPermissions);
    });
  });

  describe("getPermissionsByResource", () => {
    it("should return permissions for a specific resource", async () => {
      const mockPermissions = [
        { id: "1", code: "users.read", resource: "users", action: "read" },
        { id: "2", code: "users.write", resource: "users", action: "write" },
      ];

      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockOrderBy = vi.fn().mockResolvedValue(mockPermissions);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
      });

      const result = await permissionQueries.getPermissionsByResource(
        db,
        "users",
      );

      expect(result).toEqual(mockPermissions);
      expect(mockWhere).toHaveBeenCalled();
    });
  });

  describe("getUserPermissions", () => {
    it("should return user permissions with scopes", async () => {
      const mockPermissions = [
        {
          permission: { code: "users.read", resource: "users", action: "read" },
          scope: "all",
        },
      ];

      const mockFrom = vi.fn().mockReturnThis();
      const mockInnerJoin = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockResolved = vi.fn().mockResolvedValue(mockPermissions);

      const mockQuery = {
        from: mockFrom,
        innerJoin: mockInnerJoin,
        where: mockWhere,
      };

      vi.mocked(db.select).mockReturnValue(mockQuery);
      mockWhere.mockReturnValue(mockResolved);

      const result = await permissionQueries.getUserPermissions(
        db,
        "1",
        "company-1",
      );

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("assignPermissionToUser", () => {
    it("should assign permission to user", async () => {
      const mockInserted = {
        userId: "1",
        permissionId: "perm-1",
        companyId: "company-1",
        scope: "all",
      };

      const mockValues = vi.fn().mockReturnThis();
      const mockReturning = vi.fn().mockResolvedValue([mockInserted]);

      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
        returning: mockReturning,
      });

      const result = await permissionQueries.assignPermissionToUser(
        db,
        "1",
        "perm-1",
        "company-1",
        "all",
      );

      expect(result).toEqual(mockInserted);
    });
  });

  describe("removePermissionFromUser", () => {
    it("should remove permission from user", async () => {
      const mockDeleted = { userId: "1", permissionId: "perm-1" };

      const mockWhere = vi.fn().mockReturnThis();
      const mockReturning = vi.fn().mockResolvedValue([mockDeleted]);

      vi.mocked(db.delete).mockReturnValue({
        where: mockWhere,
        returning: mockReturning,
      });

      const result = await permissionQueries.removePermissionFromUser(
        db,
        "1",
        "perm-1",
        "company-1",
      );

      expect(result).toEqual(mockDeleted);
    });
  });

  describe("setUserPermissions", () => {
    it("should replace all user permissions", async () => {
      const permissionsData = [
        { permissionId: "perm-1", companyId: "company-1", scope: "all" },
        { permissionId: "perm-2", companyId: "company-1", scope: "branch" },
      ];

      const mockWhere = vi.fn().mockResolvedValue([]);

      const mockValues = vi.fn().mockReturnThis();
      const mockReturning = vi.fn().mockResolvedValue(permissionsData);

      vi.mocked(db.delete).mockReturnValue({
        where: mockWhere,
      });

      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
        returning: mockReturning,
      });

      const result = await permissionQueries.setUserPermissions(
        db,
        "1",
        permissionsData,
      );

      expect(result).toEqual(permissionsData);
    });
  });

  describe("userHasPermission", () => {
    it("should return true if user has permission", async () => {
      const mockPermissions = [
        {
          permission: { resource: "users", action: "read" },
          scope: "all",
        },
      ];

      const mockFrom = vi.fn().mockReturnThis();
      const mockInnerJoin = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue(mockPermissions);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        innerJoin: mockInnerJoin,
        where: mockWhere,
        limit: mockLimit,
      });

      const result = await permissionQueries.userHasPermission(
        db,
        "1",
        "users",
        "read",
        "company-1",
      );

      expect(result).toBe(true);
    });

    it("should return false if user does not have permission", async () => {
      const mockFrom = vi.fn().mockReturnThis();
      const mockInnerJoin = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue([]);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        innerJoin: mockInnerJoin,
        where: mockWhere,
        limit: mockLimit,
      });

      const result = await permissionQueries.userHasPermission(
        db,
        "1",
        "users",
        "delete",
        "company-1",
      );

      expect(result).toBe(false);
    });
  });
});
