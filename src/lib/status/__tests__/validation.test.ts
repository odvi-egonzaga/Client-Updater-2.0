import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as validationService from "../validation";
import {
  statusTypes,
  statusReasons,
  companies,
} from "@/server/db/schema/lookups";
import { eq } from "drizzle-orm";

// Mock database
vi.mock("@/server/db/index", () => {
  const mockSelect = vi.fn();

  return {
    db: {
      select: mockSelect,
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

import { db } from "@/server/db/index";

describe("Status Validation Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("validateStatusTransition", () => {
    it("should validate valid forward transition", async () => {
      const mockCompany = [{ code: "FCASH" }];

      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue(mockCompany);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      });

      const result = await validationService.validateStatusTransition(
        "PENDING",
        "TO_FOLLOW",
        "company1",
      );

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should reject backward transition", async () => {
      const mockCompany = [{ code: "FCASH" }];

      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue(mockCompany);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      });

      const result = await validationService.validateStatusTransition(
        "CALLED",
        "PENDING",
        "company1",
      );

      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe("BACKWARD_TRANSITION");
    });

    it("should reject invalid transition", async () => {
      const mockCompany = [{ code: "FCASH" }];

      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue(mockCompany);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      });

      const result = await validationService.validateStatusTransition(
        "PENDING",
        "DONE",
        "company1",
      );

      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe("INVALID_TRANSITION");
    });

    it("should reject VISITED status for non-FCASH company", async () => {
      const mockCompany = [{ code: "PCNI" }];

      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue(mockCompany);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      });

      const result = await validationService.validateStatusTransition(
        "CALLED",
        "VISITED",
        "company1",
      );

      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe("VISITED_NOT_ALLOWED");
    });

    it("should allow VISITED status for FCASH company", async () => {
      const mockCompany = [{ code: "FCASH" }];

      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue(mockCompany);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      });

      const result = await validationService.validateStatusTransition(
        "CALLED",
        "VISITED",
        "company1",
      );

      expect(result.isValid).toBe(true);
    });

    it("should reject transition from terminal status", async () => {
      const mockCompany = [{ code: "FCASH" }];

      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue(mockCompany);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      });

      const result = await validationService.validateStatusTransition(
        "Deceased",
        "PENDING",
        "company1",
      );

      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe("TERMINAL_STATUS");
    });
  });

  describe("isVisitedStatusAllowed", () => {
    it("should return true for FCASH company", async () => {
      const mockCompany = [{ code: "FCASH" }];

      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue(mockCompany);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      });

      const result = await validationService.isVisitedStatusAllowed("company1");

      expect(result).toBe(true);
    });

    it("should return false for non-FCASH company", async () => {
      const mockCompany = [{ code: "PCNI" }];

      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue(mockCompany);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      });

      const result = await validationService.isVisitedStatusAllowed("company1");

      expect(result).toBe(false);
    });
  });

  describe("validateReasonForStatus", () => {
    it("should validate reason belongs to status", async () => {
      const mockStatus = [{ code: "PENDING" }];
      const mockReason = [
        { id: "reason1", statusTypeId: "status1", name: "Reason 1" },
      ];

      vi.mocked(db.select)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue(mockStatus),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue(mockReason),
        });

      const result = await validationService.validateReasonForStatus(
        "status1",
        "reason1",
      );

      expect(result.isValid).toBe(true);
    });

    it("should reject reason that does not belong to status", async () => {
      const mockStatus = [{ code: "PENDING" }];
      const mockReason = [
        { id: "reason1", statusTypeId: "status2", name: "Reason 1" },
      ];

      vi.mocked(db.select)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue(mockStatus),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue(mockReason),
        });

      const result = await validationService.validateReasonForStatus(
        "status1",
        "reason1",
      );

      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe("INVALID_REASON_FOR_STATUS");
    });

    it("should reject if status not found", async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      });

      const result = await validationService.validateReasonForStatus(
        "nonexistent",
        "reason1",
      );

      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe("STATUS_NOT_FOUND");
    });

    it("should reject if reason not found", async () => {
      const mockStatus = [{ code: "PENDING" }];

      vi.mocked(db.select)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue(mockStatus),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([]),
        });

      const result = await validationService.validateReasonForStatus(
        "status1",
        "nonexistent",
      );

      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe("REASON_NOT_FOUND");
    });
  });

  describe("validateRemarksRequired", () => {
    it("should validate when remarks are provided", async () => {
      const mockStatus = [{ code: "PENDING", name: "Pending" }];
      const mockReasons = [
        { id: "reason1", name: "Reason 1", requiresRemarks: true },
      ];

      vi.mocked(db.select)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue(mockStatus),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
        });

      const result = await validationService.validateRemarksRequired(
        "status1",
        "Test remarks",
      );

      expect(result.isValid).toBe(true);
    });

    it("should reject when remarks are required but not provided", async () => {
      const mockStatus = [{ code: "PENDING", name: "Pending" }];
      const mockReasons = [
        { id: "reason1", name: "Reason 1", requiresRemarks: true },
      ];

      vi.mocked(db.select)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue(mockStatus),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
        });

      const result = await validationService.validateRemarksRequired("status1");

      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe("REMARKS_REQUIRED");
    });

    it("should validate when remarks are not required", async () => {
      const mockStatus = [{ code: "PENDING", name: "Pending" }];
      const mockReasons = [
        { id: "reason1", name: "Reason 1", requiresRemarks: false },
      ];

      vi.mocked(db.select)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue(mockStatus),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
        });

      const result = await validationService.validateRemarksRequired("status1");

      expect(result.isValid).toBe(true);
    });

    it("should reject if status not found", async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      });

      const result =
        await validationService.validateRemarksRequired("nonexistent");

      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe("STATUS_NOT_FOUND");
    });
  });

  describe("isTerminalStatus", () => {
    it("should return true for terminal status", async () => {
      const mockStatus = [{ code: "Deceased" }];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(mockStatus),
      });

      const result = await validationService.isTerminalStatus("status1");

      expect(result).toBe(true);
    });

    it("should return false for non-terminal status", async () => {
      const mockStatus = [{ code: "PENDING" }];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(mockStatus),
      });

      const result = await validationService.isTerminalStatus("status1");

      expect(result).toBe(false);
    });

    it("should return false if status not found", async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      });

      const result = await validationService.isTerminalStatus("nonexistent");

      expect(result).toBe(false);
    });
  });

  describe("validateStatusUpdate", () => {
    it("should validate complete status update", async () => {
      const mockCompany = [{ code: "FCASH" }];
      const mockFromStatus = [{ code: "PENDING" }];
      const mockToStatus = [{ code: "TO_FOLLOW" }];
      const mockReason = [
        { id: "reason1", statusTypeId: "status2", name: "Reason 1" },
      ];
      const mockStatus = [{ code: "TO_FOLLOW", name: "To Follow" }];
      const mockReasons = [
        { id: "reason1", name: "Reason 1", requiresRemarks: false },
      ];

      vi.mocked(db.select)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue(mockCompany),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue(mockFromStatus),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue(mockToStatus),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue(mockReason),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue(mockStatus),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
        });

      const result = await validationService.validateStatusUpdate({
        clientPeriodStatusId: "cps1",
        fromStatusId: "status1",
        toStatusId: "status2",
        reasonId: "reason1",
        remarks: "Test remarks",
        companyId: "company1",
        updatedBy: "user1",
      });

      expect(result.isValid).toBe(true);
    });

    it("should reject if target status not found", async () => {
      const mockCompany = [{ code: "FCASH" }];
      const mockFromStatus = [{ code: "PENDING" }];

      vi.mocked(db.select)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue(mockCompany),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue(mockFromStatus),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([]),
        });

      const result = await validationService.validateStatusUpdate({
        clientPeriodStatusId: "cps1",
        fromStatusId: "status1",
        toStatusId: "nonexistent",
        companyId: "company1",
        updatedBy: "user1",
      });

      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe("STATUS_NOT_FOUND");
    });
  });
});
