import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { clientDetailRoutes } from "../detail";
import { db } from "@/server/db";
import {
  getClientWithDetails,
  getClientSyncHistory,
} from "@/server/db/queries/clients";
import { canAccessBranch } from "@/lib/territories/filter";
import { hasPermission } from "@/lib/permissions";

// Mock database and query functions
vi.mock("@/server/db", () => ({
  db: vi.fn(),
}));

vi.mock("@/server/db/queries/clients", () => ({
  getClientWithDetails: vi.fn(),
  getClientSyncHistory: vi.fn(),
}));

vi.mock("@/lib/territories/filter", () => ({
  canAccessBranch: vi.fn(),
}));

vi.mock("@/lib/permissions", () => ({
  hasPermission: vi.fn(),
}));

describe("Client Detail Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/clients/:id", () => {
    it("should return client details with permission", async () => {
      const mockClient = {
        id: "1",
        clientCode: "C001",
        fullName: "Test Client",
        pensionNumber: "P001",
        branchId: "branch1",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(hasPermission).mockResolvedValue(true);
      vi.mocked(getClientWithDetails).mockResolvedValue(mockClient as any);
      vi.mocked(canAccessBranch).mockResolvedValue(true);

      const app = new Hono();
      app.route("/", clientDetailRoutes);

      const response = await app.request("/1");
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toEqual(mockClient);
      expect(hasPermission).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        "clients",
        "read",
      );
    });

    it("should return 403 when user lacks permission", async () => {
      vi.mocked(hasPermission).mockResolvedValue(false);

      const app = new Hono();
      app.route("/", clientDetailRoutes);

      const response = await app.request("/1");
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("FORBIDDEN");
    });

    it("should return 404 when client not found", async () => {
      vi.mocked(hasPermission).mockResolvedValue(true);
      vi.mocked(getClientWithDetails).mockResolvedValue(null);

      const app = new Hono();
      app.route("/", clientDetailRoutes);

      const response = await app.request("/1");
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("NOT_FOUND");
    });

    it("should return 403 when user cannot access client branch", async () => {
      const mockClient = {
        id: "1",
        clientCode: "C001",
        fullName: "Test Client",
        pensionNumber: "P001",
        branchId: "branch1",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(hasPermission).mockResolvedValue(true);
      vi.mocked(getClientWithDetails).mockResolvedValue(mockClient as any);
      vi.mocked(canAccessBranch).mockResolvedValue(false);

      const app = new Hono();
      app.route("/", clientDetailRoutes);

      const response = await app.request("/1");
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("FORBIDDEN");
    });

    it("should return 500 on error", async () => {
      vi.mocked(hasPermission).mockResolvedValue(true);
      vi.mocked(getClientWithDetails).mockRejectedValue(
        new Error("Database error"),
      );

      const app = new Hono();
      app.route("/", clientDetailRoutes);

      const response = await app.request("/1");
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error.message).toBe("Database error");
    });
  });

  describe("GET /api/clients/:id/sync-history", () => {
    it("should return client sync history with permission", async () => {
      const mockClient = {
        id: "1",
        clientCode: "C001",
        fullName: "Test Client",
        pensionNumber: "P001",
        branchId: "branch1",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSyncHistory = [
        {
          id: "1",
          clientId: "1",
          fieldChanged: "fullName",
          oldValue: "Old Name",
          newValue: "New Name",
          changedAt: new Date(),
        },
      ];

      vi.mocked(hasPermission).mockResolvedValue(true);
      vi.mocked(getClientWithDetails).mockResolvedValue(mockClient as any);
      vi.mocked(canAccessBranch).mockResolvedValue(true);
      vi.mocked(getClientSyncHistory).mockResolvedValue(mockSyncHistory as any);

      const app = new Hono();
      app.route("/", clientDetailRoutes);

      const response = await app.request("/1/sync-history");
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toEqual(mockSyncHistory);
    });

    it("should return 403 when user lacks permission", async () => {
      vi.mocked(hasPermission).mockResolvedValue(false);

      const app = new Hono();
      app.route("/", clientDetailRoutes);

      const response = await app.request("/1/sync-history");
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("FORBIDDEN");
    });

    it("should return 404 when client not found", async () => {
      vi.mocked(hasPermission).mockResolvedValue(true);
      vi.mocked(getClientWithDetails).mockResolvedValue(null);

      const app = new Hono();
      app.route("/", clientDetailRoutes);

      const response = await app.request("/1/sync-history");
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("NOT_FOUND");
    });

    it("should return 403 when user cannot access client branch", async () => {
      const mockClient = {
        id: "1",
        clientCode: "C001",
        fullName: "Test Client",
        pensionNumber: "P001",
        branchId: "branch1",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(hasPermission).mockResolvedValue(true);
      vi.mocked(getClientWithDetails).mockResolvedValue(mockClient as any);
      vi.mocked(canAccessBranch).mockResolvedValue(false);

      const app = new Hono();
      app.route("/", clientDetailRoutes);

      const response = await app.request("/1/sync-history");
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("FORBIDDEN");
    });

    it("should return 500 on error", async () => {
      vi.mocked(hasPermission).mockResolvedValue(true);
      vi.mocked(getClientWithDetails).mockResolvedValue({
        id: "1",
        branchId: "branch1",
      } as any);
      vi.mocked(canAccessBranch).mockResolvedValue(true);
      vi.mocked(getClientSyncHistory).mockRejectedValue(
        new Error("Database error"),
      );

      const app = new Hono();
      app.route("/", clientDetailRoutes);

      const response = await app.request("/1/sync-history");
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error.message).toBe("Database error");
    });
  });
});
