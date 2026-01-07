import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { statusUpdateRoutes } from "../update";
import { db } from "@/server/db";
import {
  getClientCurrentStatus,
  updateClientPeriodStatus,
  recordStatusEvent,
  createClientPeriodStatus,
} from "@/server/db/queries/status";
import { getUserBranchFilter } from "@/lib/territories/filter";
import { hasPermission } from "@/lib/permissions";
import { validateStatusUpdate } from "@/lib/status/validation";

// Mock database and query functions
vi.mock("@/server/db", () => ({
  db: vi.fn(),
}));

vi.mock("@/server/db/queries/status", () => ({
  getClientCurrentStatus: vi.fn(),
  updateClientPeriodStatus: vi.fn(),
  recordStatusEvent: vi.fn(),
  createClientPeriodStatus: vi.fn(),
}));

vi.mock("@/lib/territories/filter", () => ({
  getUserBranchFilter: vi.fn(),
}));

vi.mock("@/lib/permissions", () => ({
  hasPermission: vi.fn(),
}));

vi.mock("@/lib/status/validation", () => ({
  validateStatusUpdate: vi.fn(),
  isTerminalStatus: vi.fn(),
}));

describe("Status Update Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/status/update", () => {
    it("should update client status with permission", async () => {
      const requestBody = {
        clientId: "client-1",
        periodType: "monthly",
        periodYear: 2024,
        periodMonth: 1,
        statusId: "status-2",
        reasonId: "reason-1",
        remarks: "Test remarks",
        hasPayment: false,
      };

      const mockCurrentStatus = {
        id: "status-1",
        clientId: "client-1",
        statusTypeId: "status-1",
        updateCount: 0,
      };

      const mockUpdatedStatus = {
        id: "status-1",
        clientId: "client-1",
        statusTypeId: "status-2",
      };

      const mockEvent = {
        id: "event-1",
        eventSequence: 1,
      };

      vi.mocked(hasPermission).mockResolvedValue(true);
      vi.mocked(getUserBranchFilter).mockResolvedValue({
        scope: "all",
        branchIds: [],
      });
      vi.mocked(getClientCurrentStatus).mockResolvedValue(mockCurrentStatus);
      vi.mocked(validateStatusUpdate).mockResolvedValue({ isValid: true });
      vi.mocked(updateClientPeriodStatus).mockResolvedValue(mockUpdatedStatus);
      vi.mocked(recordStatusEvent).mockResolvedValue(mockEvent);
      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi
          .fn()
          .mockResolvedValue([
            { id: "client-1", branchId: "branch-1", productId: "product-1" },
            { companyId: "company-1" },
          ]),
      });

      const app = new Hono();
      app.route("/", statusUpdateRoutes);

      const response = await app.request("/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.status.id).toBe("status-1");
      expect(json.data.event.id).toBe("event-1");
      expect(hasPermission).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        "status",
        "update",
      );
    });

    it("should return 403 when user lacks permission", async () => {
      const requestBody = {
        clientId: "client-1",
        periodType: "monthly",
        periodYear: 2024,
        statusId: "status-2",
      };

      vi.mocked(hasPermission).mockResolvedValue(false);

      const app = new Hono();
      app.route("/", statusUpdateRoutes);

      const response = await app.request("/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("FORBIDDEN");
    });

    it("should return 404 when client not found", async () => {
      const requestBody = {
        clientId: "client-1",
        periodType: "monthly",
        periodYear: 2024,
        statusId: "status-2",
      };

      vi.mocked(hasPermission).mockResolvedValue(true);
      vi.mocked(getUserBranchFilter).mockResolvedValue({
        scope: "all",
        branchIds: [],
      });
      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      });

      const app = new Hono();
      app.route("/", statusUpdateRoutes);

      const response = await app.request("/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("NOT_FOUND");
    });

    it("should return 403 when user cannot access client branch", async () => {
      const requestBody = {
        clientId: "client-1",
        periodType: "monthly",
        periodYear: 2024,
        statusId: "status-2",
      };

      vi.mocked(hasPermission).mockResolvedValue(true);
      vi.mocked(getUserBranchFilter).mockResolvedValue({
        scope: "territory",
        branchIds: ["branch-2"],
      });
      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi
          .fn()
          .mockResolvedValue([
            { id: "client-1", branchId: "branch-1", productId: "product-1" },
            { companyId: "company-1" },
          ]),
      });

      const app = new Hono();
      app.route("/", statusUpdateRoutes);

      const response = await app.request("/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("FORBIDDEN");
    });

    it("should return 400 when validation fails", async () => {
      const requestBody = {
        clientId: "client-1",
        periodType: "monthly",
        periodYear: 2024,
        statusId: "status-2",
      };

      vi.mocked(hasPermission).mockResolvedValue(true);
      vi.mocked(getUserBranchFilter).mockResolvedValue({
        scope: "all",
        branchIds: [],
      });
      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi
          .fn()
          .mockResolvedValue([
            { id: "client-1", branchId: "branch-1", productId: "product-1" },
            { companyId: "company-1" },
          ]),
      });
      vi.mocked(validateStatusUpdate).mockResolvedValue({
        isValid: false,
        error: {
          code: "INVALID_TRANSITION",
          message: "Invalid status transition",
        },
      });

      const app = new Hono();
      app.route("/", statusUpdateRoutes);

      const response = await app.request("/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("INVALID_TRANSITION");
    });

    it("should validate required request body fields", async () => {
      vi.mocked(hasPermission).mockResolvedValue(true);

      const app = new Hono();
      app.route("/", statusUpdateRoutes);

      // Missing clientId
      const response1 = await app.request("/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodType: "monthly",
          periodYear: 2024,
          statusId: "status-2",
        }),
      });
      const json1 = await response1.json();

      expect(response1.status).toBe(400);
      expect(json1.success).toBe(false);

      // Missing statusId
      const response2 = await app.request("/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: "client-1",
          periodType: "monthly",
          periodYear: 2024,
        }),
      });
      const json2 = await response2.json();

      expect(response2.status).toBe(400);
      expect(json2.success).toBe(false);
    });

    it("should return 500 on error", async () => {
      const requestBody = {
        clientId: "client-1",
        periodType: "monthly",
        periodYear: 2024,
        statusId: "status-2",
      };

      vi.mocked(hasPermission).mockResolvedValue(true);
      vi.mocked(getUserBranchFilter).mockRejectedValue(
        new Error("Database error"),
      );

      const app = new Hono();
      app.route("/", statusUpdateRoutes);

      const response = await app.request("/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("INTERNAL_ERROR");
    });
  });
});
