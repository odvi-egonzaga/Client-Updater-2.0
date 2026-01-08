import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as statusQueries from "../status";
import {
  clientPeriodStatus,
  statusEvents,
  statusTypes,
  statusReasons,
  clients,
  companies,
  products,
} from "../../schema/clients";
import { eq, and, desc, sql, inArray, isNull } from "drizzle-orm";

// Mock database
vi.mock("../../index", () => {
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();

  return {
    db: {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
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

describe("Status Queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getClientCurrentStatus", () => {
    it("should return current status for a client in monthly period", async () => {
      const mockStatus = {
        id: "1",
        clientId: "client1",
        periodType: "monthly",
        periodMonth: 1,
        periodYear: 2024,
        statusTypeId: "status1",
        statusTypeName: "PENDING",
        remarks: "Test remarks",
        hasPayment: false,
        updateCount: 0,
        isTerminal: false,
      };

      const mockFrom = vi.fn().mockReturnThis();
      const mockLeftJoin = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue([mockStatus]);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        leftJoin: mockLeftJoin,
        where: mockWhere,
        limit: mockLimit,
      });

      const result = await statusQueries.getClientCurrentStatus(
        db,
        "client1",
        "monthly",
        2024,
        1,
      );

      expect(result).toEqual(mockStatus);
      expect(mockWhere).toHaveBeenCalled();
    });

    it("should return current status for a client in quarterly period", async () => {
      const mockStatus = {
        id: "1",
        clientId: "client1",
        periodType: "quarterly",
        periodQuarter: 1,
        periodYear: 2024,
        statusTypeId: "status1",
        statusTypeName: "PENDING",
        remarks: "Test remarks",
        hasPayment: false,
        updateCount: 0,
        isTerminal: false,
      };

      const mockFrom = vi.fn().mockReturnThis();
      const mockLeftJoin = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue([mockStatus]);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        leftJoin: mockLeftJoin,
        where: mockWhere,
        limit: mockLimit,
      });

      const result = await statusQueries.getClientCurrentStatus(
        db,
        "client1",
        "quarterly",
        2024,
        undefined,
        1,
      );

      expect(result).toEqual(mockStatus);
      expect(mockWhere).toHaveBeenCalled();
    });

    it("should return null if status not found", async () => {
      const mockFrom = vi.fn().mockReturnThis();
      const mockLeftJoin = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue([]);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        leftJoin: mockLeftJoin,
        where: mockWhere,
        limit: mockLimit,
      });

      const result = await statusQueries.getClientCurrentStatus(
        db,
        "nonexistent",
        "monthly",
        2024,
        1,
      );

      expect(result).toBeNull();
    });
  });

  describe("getClientStatusHistory", () => {
    it("should return status history for a client", async () => {
      const mockHistory = [
        {
          id: "1",
          clientPeriodStatusId: "cps1",
          statusTypeId: "status1",
          statusTypeName: "PENDING",
          eventSequence: 1,
          createdAt: new Date("2024-01-01"),
        },
        {
          id: "2",
          clientPeriodStatusId: "cps1",
          statusTypeId: "status2",
          statusTypeName: "CALLED",
          eventSequence: 2,
          createdAt: new Date("2024-01-02"),
        },
      ];

      const mockFrom = vi.fn().mockReturnThis();
      const mockInnerJoin = vi.fn().mockReturnThis();
      const mockLeftJoin = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockOrderBy = vi.fn().mockResolvedValue(mockHistory);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        innerJoin: mockInnerJoin,
        leftJoin: mockLeftJoin,
        where: mockWhere,
        orderBy: mockOrderBy,
      });

      const result = await statusQueries.getClientStatusHistory(
        db,
        "client1",
        50,
      );

      expect(result).toEqual(mockHistory);
      expect(mockOrderBy).toHaveBeenCalled();
    });

    it("should use default limit of 50", async () => {
      const mockHistory = [];

      const mockFrom = vi.fn().mockReturnThis();
      const mockInnerJoin = vi.fn().mockReturnThis();
      const mockLeftJoin = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockOrderBy = vi.fn().mockResolvedValue(mockHistory);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        innerJoin: mockInnerJoin,
        leftJoin: mockLeftJoin,
        where: mockWhere,
        orderBy: mockOrderBy,
      });

      await statusQueries.getClientStatusHistory(db, "client1");

      expect(mockOrderBy).toHaveBeenCalled();
    });
  });

  describe("getClientsByStatus", () => {
    it("should return clients filtered by status", async () => {
      const mockClients = [
        {
          id: "1",
          clientId: "client1",
          clientCode: "C001",
          fullName: "John Doe",
          statusTypeId: "status1",
          statusTypeName: "PENDING",
          periodType: "monthly",
          periodMonth: 1,
          periodYear: 2024,
        },
      ];

      const mockFrom = vi.fn().mockReturnThis();
      const mockInnerJoin = vi.fn().mockReturnThis();
      const mockLeftJoin = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockOrderBy = vi.fn().mockResolvedValue(mockClients);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        innerJoin: mockInnerJoin,
        leftJoin: mockLeftJoin,
        where: mockWhere,
        orderBy: mockOrderBy,
      });

      const result = await statusQueries.getClientsByStatus(db, {
        statusTypeId: "status1",
        periodType: "monthly",
        periodYear: 2024,
        periodMonth: 1,
      });

      expect(result).toEqual(mockClients);
      expect(mockWhere).toHaveBeenCalled();
    });

    it("should filter by branch IDs when provided", async () => {
      const mockClients = [
        {
          id: "1",
          clientId: "client1",
          clientCode: "C001",
          fullName: "John Doe",
          statusTypeId: "status1",
          statusTypeName: "PENDING",
        },
      ];

      const mockFrom = vi.fn().mockReturnThis();
      const mockInnerJoin = vi.fn().mockReturnThis();
      const mockLeftJoin = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockOrderBy = vi.fn().mockResolvedValue(mockClients);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        innerJoin: mockInnerJoin,
        leftJoin: mockLeftJoin,
        where: mockWhere,
        orderBy: mockOrderBy,
      });

      const result = await statusQueries.getClientsByStatus(db, {
        branchIds: ["branch1", "branch2"],
      });

      expect(result).toEqual(mockClients);
      expect(mockWhere).toHaveBeenCalled();
    });
  });

  describe("createClientPeriodStatus", () => {
    it("should create new period status record", async () => {
      const mockStatus = {
        id: "1",
        clientId: "client1",
        periodType: "monthly",
        periodYear: 2024,
        periodMonth: 1,
        statusTypeId: "status1",
        hasPayment: false,
        updateCount: 0,
        isTerminal: false,
      };

      const mockValues = vi.fn().mockReturnThis();
      const mockReturning = vi.fn().mockResolvedValue([mockStatus]);

      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
        returning: mockReturning,
      });

      const result = await statusQueries.createClientPeriodStatus(db, {
        clientId: "client1",
        periodType: "monthly",
        periodYear: 2024,
        periodMonth: 1,
      });

      expect(result).toEqual(mockStatus);
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: "client1",
          periodType: "monthly",
          periodYear: 2024,
          periodMonth: 1,
        }),
      );
    });
  });

  describe("updateClientPeriodStatus", () => {
    it("should update existing status", async () => {
      const mockStatus = {
        id: "1",
        statusTypeId: "status2",
        remarks: "Updated remarks",
      };

      const mockSet = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockReturning = vi.fn().mockResolvedValue([mockStatus]);

      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
        where: mockWhere,
        returning: mockReturning,
      });

      const result = await statusQueries.updateClientPeriodStatus(db, "1", {
        statusTypeId: "status2",
        remarks: "Updated remarks",
      });

      expect(result).toEqual(mockStatus);
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          statusTypeId: "status2",
          remarks: "Updated remarks",
        }),
      );
    });

    it("should return null if status not found", async () => {
      const mockSet = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockReturning = vi.fn().mockResolvedValue([]);

      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
        where: mockWhere,
        returning: mockReturning,
      });

      const result = await statusQueries.updateClientPeriodStatus(
        db,
        "nonexistent",
        {
          statusTypeId: "status2",
        },
      );

      expect(result).toBeNull();
    });
  });

  describe("recordStatusEvent", () => {
    it("should record status change to audit trail", async () => {
      const mockEvent = {
        id: "1",
        clientPeriodStatusId: "cps1",
        statusTypeId: "status1",
        eventSequence: 1,
      };

      const mockSelect = vi.fn().mockResolvedValue([{ maxSequence: 0 }]);
      const mockValues = vi.fn().mockReturnThis();
      const mockReturning = vi.fn().mockResolvedValue([mockEvent]);

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
      });

      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
        returning: mockReturning,
      });

      const result = await statusQueries.recordStatusEvent(db, {
        clientPeriodStatusId: "cps1",
        statusTypeId: "status1",
        createdBy: "user1",
      });

      expect(result).toEqual(mockEvent);
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          clientPeriodStatusId: "cps1",
          statusTypeId: "status1",
          eventSequence: 1,
        }),
      );
    });
  });

  describe("getDashboardSummary", () => {
    it("should return dashboard summary with counts", async () => {
      const mockSummary = {
        totalClients: [{ count: 100 }],
        statusCounts: [
          { statusTypeId: "status1", statusTypeName: "PENDING", count: 50 },
          { statusTypeId: "status2", statusTypeName: "CALLED", count: 30 },
        ],
        paymentCount: [{ count: 20 }],
        terminalCount: [{ count: 5 }],
      };

      const mockFrom = vi.fn().mockReturnThis();
      const mockInnerJoin = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockGroupBy = vi.fn().mockResolvedValue(mockSummary.statusCounts);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        innerJoin: mockInnerJoin,
        where: mockWhere,
        groupBy: mockGroupBy,
      });

      const result = await statusQueries.getDashboardSummary(
        db,
        "company1",
        2024,
        1,
      );

      expect(result).toBeDefined();
      expect(result.totalClients).toBe(100);
      expect(result.statusCounts).toHaveLength(2);
      expect(result.paymentCount).toBe(20);
      expect(result.terminalCount).toBe(5);
    });
  });

  describe("getAvailableYears", () => {
    it("should return correct years for September onwards", () => {
      const date = new Date("2024-09-15");
      const years = statusQueries.getAvailableYears(date);

      expect(years).toEqual([2023, 2024, 2025]);
    });

    it("should return correct years for before September", () => {
      const date = new Date("2024-08-15");
      const years = statusQueries.getAvailableYears(date);

      expect(years).toEqual([2022, 2023, 2024]);
    });

    it("should use current date when not provided", () => {
      const years = statusQueries.getAvailableYears();

      expect(years).toHaveLength(3);
      expect(years.every((year) => typeof year === "number")).toBe(true);
    });
  });
});
