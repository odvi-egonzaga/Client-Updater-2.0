import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as territoryQueries from "../territories";
import { areas, branches, areaBranches } from "../../schema/organization";
import { userAreas, userBranches } from "../../schema/users";
import { eq, and, inArray, isNull } from "drizzle-orm";

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

describe("Territory Queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getAllAreas", () => {
    it("should return all areas for a company", async () => {
      const mockAreas = [
        { id: "1", code: "AREA1", name: "Area 1", companyId: "company-1" },
        { id: "2", code: "AREA2", name: "Area 2", companyId: "company-1" },
      ];

      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockOrderBy = vi.fn().mockResolvedValue(mockAreas);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
      });

      const result = await territoryQueries.getAllAreas(db, "company-1");

      expect(result).toEqual(mockAreas);
      expect(mockWhere).toHaveBeenCalled();
    });
  });

  describe("getAllBranches", () => {
    it("should return all branches for a company", async () => {
      const mockBranches = [
        { id: "1", code: "BRANCH1", name: "Branch 1" },
        { id: "2", code: "BRANCH2", name: "Branch 2" },
      ];

      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockOrderBy = vi.fn().mockResolvedValue(mockBranches);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
      });

      const result = await territoryQueries.getAllBranches(db, "company-1");

      expect(result).toEqual(mockBranches);
    });
  });

  describe("assignBranchesToUser", () => {
    it("should assign branches to user", async () => {
      const branchIds = ["branch-1", "branch-2"];
      const mockInserted = [
        { userId: "1", branchId: "branch-1" },
        { userId: "1", branchId: "branch-2" },
      ];

      const mockValues = vi.fn().mockReturnThis();
      const mockReturning = vi.fn().mockResolvedValue(mockInserted);

      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
        returning: mockReturning,
      });

      const result = await territoryQueries.assignBranchesToUser(
        db,
        "1",
        branchIds,
      );

      expect(result).toEqual(mockInserted);
    });
  });

  describe("assignAreasToUser", () => {
    it("should assign areas to user", async () => {
      const areaIds = ["area-1", "area-2"];
      const mockInserted = [
        { userId: "1", areaId: "area-1" },
        { userId: "1", areaId: "area-2" },
      ];

      const mockValues = vi.fn().mockReturnThis();
      const mockReturning = vi.fn().mockResolvedValue(mockInserted);

      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
        returning: mockReturning,
      });

      const result = await territoryQueries.assignAreasToUser(db, "1", areaIds);

      expect(result).toEqual(mockInserted);
    });
  });

  describe("removeBranchesFromUser", () => {
    it("should remove branches from user", async () => {
      const branchIds = ["branch-1", "branch-2"];
      const mockDeleted = [
        { userId: "1", branchId: "branch-1" },
        { userId: "1", branchId: "branch-2" },
      ];

      const mockWhere = vi.fn().mockReturnThis();
      const mockReturning = vi.fn().mockResolvedValue(mockDeleted);

      vi.mocked(db.delete).mockReturnValue({
        where: mockWhere,
        returning: mockReturning,
      });

      const result = await territoryQueries.removeBranchesFromUser(
        db,
        "1",
        branchIds,
      );

      expect(result).toEqual(mockDeleted);
    });
  });

  describe("removeAreasFromUser", () => {
    it("should remove areas from user", async () => {
      const areaIds = ["area-1", "area-2"];
      const mockDeleted = [
        { userId: "1", areaId: "area-1" },
        { userId: "1", areaId: "area-2" },
      ];

      const mockWhere = vi.fn().mockReturnThis();
      const mockReturning = vi.fn().mockResolvedValue(mockDeleted);

      vi.mocked(db.delete).mockReturnValue({
        where: mockWhere,
        returning: mockReturning,
      });

      const result = await territoryQueries.removeAreasFromUser(
        db,
        "1",
        areaIds,
      );

      expect(result).toEqual(mockDeleted);
    });
  });

  describe("getUserAccessibleBranches", () => {
    it("should return branches user can access directly and via areas", async () => {
      const mockBranches = [
        { id: "1", code: "BRANCH1", name: "Branch 1" },
        { id: "2", code: "BRANCH2", name: "Branch 2" },
        { id: "3", code: "BRANCH3", name: "Branch 3" },
      ];

      const mockFrom = vi.fn().mockReturnThis();
      const mockInnerJoin = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockResolvedValue(mockBranches);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        innerJoin: mockInnerJoin,
        where: mockWhere,
      });

      const result = await territoryQueries.getUserAccessibleBranches(db, "1");

      expect(result).toEqual(mockBranches);
    });
  });
});
