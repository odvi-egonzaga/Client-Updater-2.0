import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as syncQueries from "../sync";
import { syncJobs } from "../../schema/jobs";
import { eq, desc } from "drizzle-orm";

// Mock database
vi.mock("../../index", () => {
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();

  return {
    db: {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
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

describe("Sync Queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("createSyncJob", () => {
    it("should create a new sync job", async () => {
      const mockJob = {
        id: "1",
        type: "snowflake",
        status: "pending",
        parameters: {},
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
      };

      const mockValues = vi.fn().mockReturnThis();
      const mockReturning = vi.fn().mockResolvedValue([mockJob]);

      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
        returning: mockReturning,
      });

      const result = await syncQueries.createSyncJob(db, "snowflake");

      expect(result).toEqual(mockJob);
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "snowflake",
          status: "pending",
        }),
      );
    });

    it("should create sync job with options", async () => {
      const mockJob = {
        id: "1",
        type: "snowflake",
        status: "pending",
        parameters: { branchCodes: ["BR001"] },
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        createdBy: "user123",
      };

      const mockValues = vi.fn().mockReturnThis();
      const mockReturning = vi.fn().mockResolvedValue([mockJob]);

      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
        returning: mockReturning,
      });

      const result = await syncQueries.createSyncJob(db, "snowflake", {
        type: "snowflake",
        parameters: { branchCodes: ["BR001"] },
        createdBy: "user123",
      });

      expect(result).toEqual(mockJob);
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "snowflake",
          parameters: { branchCodes: ["BR001"] },
          createdBy: "user123",
        }),
      );
    });
  });

  describe("updateSyncJob", () => {
    it("should update sync job", async () => {
      const mockJob = {
        id: "1",
        type: "snowflake",
        status: "processing",
        parameters: {},
        recordsProcessed: 100,
        recordsCreated: 50,
        recordsUpdated: 50,
      };

      const mockSet = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockReturning = vi.fn().mockResolvedValue([mockJob]);

      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
        where: mockWhere,
        returning: mockReturning,
      });

      const result = await syncQueries.updateSyncJob(db, "1", {
        status: "processing",
        recordsProcessed: 100,
        recordsCreated: 50,
        recordsUpdated: 50,
      });

      expect(result).toEqual(mockJob);
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "processing",
          recordsProcessed: 100,
        }),
      );
    });

    it("should return null if job not found", async () => {
      const mockSet = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockReturning = vi.fn().mockResolvedValue([]);

      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
        where: mockWhere,
        returning: mockReturning,
      });

      const result = await syncQueries.updateSyncJob(db, "nonexistent", {
        status: "processing",
      });

      expect(result).toBeNull();
    });
  });

  describe("getSyncJob", () => {
    it("should get sync job by ID", async () => {
      const mockJob = {
        id: "1",
        type: "snowflake",
        status: "completed",
        parameters: {},
        recordsProcessed: 100,
        recordsCreated: 50,
        recordsUpdated: 50,
      };

      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue([mockJob]);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      });

      const result = await syncQueries.getSyncJob(db, "1");

      expect(result).toEqual(mockJob);
    });

    it("should return null if job not found", async () => {
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue([]);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      });

      const result = await syncQueries.getSyncJob(db, "nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("getRecentSyncJobs", () => {
    it("should get recent sync jobs", async () => {
      const mockJobs = [
        { id: "1", type: "snowflake", status: "completed" },
        { id: "2", type: "snowflake", status: "pending" },
      ];

      const mockFrom = vi.fn().mockReturnThis();
      const mockOrderBy = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue(mockJobs);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        orderBy: mockOrderBy,
        limit: mockLimit,
      });

      const result = await syncQueries.getRecentSyncJobs(db, 10);

      expect(result).toEqual(mockJobs);
      expect(mockLimit).toHaveBeenCalledWith(10);
    });

    it("should use default limit of 10", async () => {
      const mockJobs = [];

      const mockFrom = vi.fn().mockReturnThis();
      const mockOrderBy = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue(mockJobs);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        orderBy: mockOrderBy,
        limit: mockLimit,
      });

      await syncQueries.getRecentSyncJobs(db);

      expect(mockLimit).toHaveBeenCalledWith(10);
    });
  });

  describe("getSyncJobsByStatus", () => {
    it("should get sync jobs by status", async () => {
      const mockJobs = [
        { id: "1", type: "snowflake", status: "completed" },
        { id: "2", type: "snowflake", status: "completed" },
      ];

      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockOrderBy = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue(mockJobs);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
      });

      const result = await syncQueries.getSyncJobsByStatus(db, "completed", 10);

      expect(result).toEqual(mockJobs);
      expect(mockLimit).toHaveBeenCalledWith(10);
    });
  });

  describe("startSyncJob", () => {
    it("should mark sync job as started", async () => {
      const mockJob = {
        id: "1",
        type: "snowflake",
        status: "processing",
        startedAt: new Date(),
      };

      const mockSet = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockReturning = vi.fn().mockResolvedValue([mockJob]);

      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
        where: mockWhere,
        returning: mockReturning,
      });

      const result = await syncQueries.startSyncJob(db, "1");

      expect(result).toEqual(mockJob);
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "processing",
          startedAt: expect.any(Date),
        }),
      );
    });
  });

  describe("completeSyncJob", () => {
    it("should mark sync job as completed", async () => {
      const mockJob = {
        id: "1",
        type: "snowflake",
        status: "completed",
        recordsProcessed: 100,
        recordsCreated: 50,
        recordsUpdated: 50,
        completedAt: new Date(),
      };

      const mockSet = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockReturning = vi.fn().mockResolvedValue([mockJob]);

      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
        where: mockWhere,
        returning: mockReturning,
      });

      const result = await syncQueries.completeSyncJob(db, "1", 100, 50, 50);

      expect(result).toEqual(mockJob);
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "completed",
          recordsProcessed: 100,
          recordsCreated: 50,
          recordsUpdated: 50,
          completedAt: expect.any(Date),
        }),
      );
    });
  });

  describe("failSyncJob", () => {
    it("should mark sync job as failed", async () => {
      const mockJob = {
        id: "1",
        type: "snowflake",
        status: "failed",
        error: "Connection error",
        completedAt: new Date(),
      };

      const mockSet = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockReturning = vi.fn().mockResolvedValue([mockJob]);

      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
        where: mockWhere,
        returning: mockReturning,
      });

      const result = await syncQueries.failSyncJob(db, "1", "Connection error");

      expect(result).toEqual(mockJob);
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "failed",
          error: "Connection error",
          completedAt: expect.any(Date),
        }),
      );
    });
  });
});
