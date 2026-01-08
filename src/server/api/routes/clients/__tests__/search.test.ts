import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { clientSearchRoutes } from "../search";
import { db } from "@/server/db";
import { searchClients, getClientById } from "@/server/db/queries/clients";
import { getUserBranchFilter } from "@/lib/territories/filter";
import { hasPermission } from "@/lib/permissions";

// Mock database and query functions
vi.mock("@/server/db", () => ({
  db: vi.fn(),
}));

vi.mock("@/server/db/queries/clients", () => ({
  searchClients: vi.fn(),
  getClientById: vi.fn(),
}));

vi.mock("@/lib/territories/filter", () => ({
  getUserBranchFilter: vi.fn(),
}));

vi.mock("@/lib/permissions", () => ({
  hasPermission: vi.fn(),
}));

describe("Client Search Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/clients/search", () => {
    it("should return search results with permission", async () => {
      const mockResults = [
        {
          id: "1",
          clientCode: "C001",
          fullName: "Test Client",
          pensionNumber: "P001",
        },
      ];

      vi.mocked(hasPermission).mockResolvedValue(true);
      vi.mocked(getUserBranchFilter).mockResolvedValue({
        scope: "all",
        branchIds: [],
      });
      vi.mocked(searchClients).mockResolvedValue(mockResults as any);

      const app = new Hono();
      app.route("/", clientSearchRoutes);

      const response = await app.request("/search?q=test&limit=10");
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toEqual(mockResults);
      expect(searchClients).toHaveBeenCalledWith(db, "test", 10);
    });

    it("should return 403 when user lacks permission", async () => {
      vi.mocked(hasPermission).mockResolvedValue(false);

      const app = new Hono();
      app.route("/", clientSearchRoutes);

      const response = await app.request("/search?q=test");
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("FORBIDDEN");
    });

    it("should return empty list when user has no territory access", async () => {
      vi.mocked(hasPermission).mockResolvedValue(true);
      vi.mocked(getUserBranchFilter).mockResolvedValue({
        scope: "none",
        branchIds: [],
      });

      const app = new Hono();
      app.route("/", clientSearchRoutes);

      const response = await app.request("/search?q=test");
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toEqual([]);
    });

    it("should filter by territory when user has territory access", async () => {
      const mockResults = [
        {
          id: "1",
          clientCode: "C001",
          fullName: "Test Client",
          pensionNumber: "P001",
        },
      ];

      const mockClient = {
        id: "1",
        branchId: "branch1",
      };

      vi.mocked(hasPermission).mockResolvedValue(true);
      vi.mocked(getUserBranchFilter).mockResolvedValue({
        scope: "territory",
        branchIds: ["branch1", "branch2"],
      });
      vi.mocked(searchClients).mockResolvedValue(mockResults as any);
      vi.mocked(getClientById).mockResolvedValue(mockClient as any);

      const app = new Hono();
      app.route("/", clientSearchRoutes);

      const response = await app.request("/search?q=test");
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toEqual(mockResults);
    });

    it("should validate query parameter (minimum 2 characters)", async () => {
      const app = new Hono();
      app.route("/", clientSearchRoutes);

      const response = await app.request("/search?q=t");

      expect(response.status).toBe(400);
    });

    it("should validate query parameter (maximum 100 characters)", async () => {
      const longQuery = "a".repeat(101);
      const app = new Hono();
      app.route("/", clientSearchRoutes);

      const response = await app.request(`/search?q=${longQuery}`);

      expect(response.status).toBe(400);
    });

    it("should validate limit parameter (minimum 1)", async () => {
      const app = new Hono();
      app.route("/", clientSearchRoutes);

      const response = await app.request("/search?q=test&limit=0");

      expect(response.status).toBe(400);
    });

    it("should validate limit parameter (maximum 50)", async () => {
      const app = new Hono();
      app.route("/", clientSearchRoutes);

      const response = await app.request("/search?q=test&limit=51");

      expect(response.status).toBe(400);
    });

    it("should return 500 on error", async () => {
      vi.mocked(hasPermission).mockResolvedValue(true);
      vi.mocked(getUserBranchFilter).mockResolvedValue({
        scope: "all",
        branchIds: [],
      });
      vi.mocked(searchClients).mockRejectedValue(new Error("Database error"));

      const app = new Hono();
      app.route("/", clientSearchRoutes);

      const response = await app.request("/search?q=test");
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error.message).toBe("Database error");
    });
  });
});
