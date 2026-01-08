import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { userTerritoriesRoutes } from "../territories";
import { db } from "@/server/db";
import {
  getAllAreas,
  getAllBranches,
  assignAreasToUser,
  assignBranchesToUser,
  removeAreasFromUser,
  removeBranchesFromUser,
} from "@/server/db/queries/territories";
import { getUserAreas, getUserBranches } from "@/server/db/queries/users";

// Mock database and query functions
vi.mock("@/server/db", () => ({
  db: vi.fn(),
}));

vi.mock("@/server/db/queries/territories", () => ({
  getAllAreas: vi.fn(),
  getAllBranches: vi.fn(),
  assignAreasToUser: vi.fn(),
  assignBranchesToUser: vi.fn(),
  removeAreasFromUser: vi.fn(),
  removeBranchesFromUser: vi.fn(),
}));

vi.mock("@/server/db/queries/users", () => ({
  getUserAreas: vi.fn(),
  getUserBranches: vi.fn(),
}));

describe("User Territories Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/territories/areas", () => {
    it("should return all areas for a company", async () => {
      const mockAreas = [
        {
          id: "1",
          name: "Area 1",
          companyId: "company_1",
        },
      ];

      vi.mocked(getAllAreas).mockResolvedValue(mockAreas);

      const app = new Hono();
      app.route("/", userTerritoriesRoutes);

      const response = await app.request("/areas?companyId=company_1");
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toEqual(mockAreas);
      expect(getAllAreas).toHaveBeenCalledWith(db, "company_1");
    });

    it("should return 400 when companyId is missing", async () => {
      const app = new Hono();
      app.route("/", userTerritoriesRoutes);

      const response = await app.request("/areas");
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error.message).toBe("companyId query parameter is required");
    });
  });

  describe("GET /api/territories/branches", () => {
    it("should return all branches for a company", async () => {
      const mockBranches = [
        {
          id: "1",
          name: "Branch 1",
          companyId: "company_1",
        },
      ];

      vi.mocked(getAllBranches).mockResolvedValue(mockBranches);

      const app = new Hono();
      app.route("/", userTerritoriesRoutes);

      const response = await app.request("/branches?companyId=company_1");
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toEqual(mockBranches);
      expect(getAllBranches).toHaveBeenCalledWith(db, "company_1");
    });

    it("should return 400 when companyId is missing", async () => {
      const app = new Hono();
      app.route("/", userTerritoriesRoutes);

      const response = await app.request("/branches");
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error.message).toBe("companyId query parameter is required");
    });
  });

  describe("GET /api/users/:id/territories", () => {
    it("should return user territories", async () => {
      const mockAreas = [{ area: { id: "1", name: "Area 1" } }];
      const mockBranches = [{ branch: { id: "1", name: "Branch 1" } }];

      vi.mocked(getUserAreas).mockResolvedValue(mockAreas);
      vi.mocked(getUserBranches).mockResolvedValue(mockBranches);

      const app = new Hono();
      app.route("/", userTerritoriesRoutes);

      const response = await app.request("/1/territories");
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toEqual({
        areas: mockAreas,
        branches: mockBranches,
      });
      expect(getUserAreas).toHaveBeenCalledWith(db, "1");
      expect(getUserBranches).toHaveBeenCalledWith(db, "1");
    });
  });

  describe("PUT /api/users/:id/territories", () => {
    it("should set user territories", async () => {
      const currentAreas = [{ area: { id: "old_1" } }];
      const currentBranches = [{ branch: { id: "old_1" } }];
      const newAreas = [{ id: "1", userId: "1", areaId: "new_1" }];
      const newBranches = [{ id: "1", userId: "1", branchId: "new_1" }];

      vi.mocked(getUserAreas).mockResolvedValue(currentAreas);
      vi.mocked(getUserBranches).mockResolvedValue(currentBranches);
      vi.mocked(removeAreasFromUser).mockResolvedValue([]);
      vi.mocked(removeBranchesFromUser).mockResolvedValue([]);
      vi.mocked(assignAreasToUser).mockResolvedValue(newAreas);
      vi.mocked(assignBranchesToUser).mockResolvedValue(newBranches);

      const app = new Hono();
      app.route("/", userTerritoriesRoutes);

      const response = await app.request("/1/territories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          areaIds: ["new_1"],
          branchIds: ["new_1"],
        }),
      });

      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toEqual({
        areas: newAreas,
        branches: newBranches,
      });
    });
  });
});
