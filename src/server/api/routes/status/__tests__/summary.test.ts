import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { statusSummaryRoutes } from "../summary";
import { db } from "@/server/db";
import { getDashboardSummary } from "@/server/db/queries/status";
import { getUserBranchFilter } from "@/lib/territories/filter";
import { hasPermission } from "@/lib/permissions";

// Mock database and query functions
vi.mock("@/server/db", () => ({
  db: vi.fn(),
}));

vi.mock("@/server/db/queries/status", () => ({
  getDashboardSummary: vi.fn(),
}));

vi.mock("@/lib/territories/filter", () => ({
  getUserBranchFilter: vi.fn(),
}));

vi.mock("@/lib/permissions", () => ({
  hasPermission: vi.fn(),
}));

describe("Status Summary Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/status/summary", () => {
    it("should return dashboard summary with permission", async () => {
      const mockSummary = {
        totalClients: 100,
        statusCounts: [
          { statusTypeId: "1", statusTypeName: "PENDING", count: 20 },
          { statusTypeId: "2", statusTypeName: "TO_FOLLOW", count: 15 },
          { statusTypeId: "3", statusTypeName: "CALLED", count: 25 },
          { statusTypeId: "4", statusTypeName: "VISITED", count: 10 },
          { statusTypeId: "5", statusTypeName: "UPDATED", count: 20 },
          { statusTypeId: "6", statusTypeName: "DONE", count: 10 },
        ],
        paymentCount: 50,
        terminalCount: 5,
      };

      vi.mocked(hasPermission).mockResolvedValue(true);
      vi.mocked(getUserBranchFilter).mockResolvedValue({
        scope: "all",
        branchIds: [],
      });
      vi.mocked(getDashboardSummary).mockResolvedValue(mockSummary);

      const app = new Hono();
      app.route("/", statusSummaryRoutes);

      const response = await app.request(
        "/summary?companyId=FCASH&periodYear=2024",
      );
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.totalClients).toBe(100);
      expect(json.data.statusCounts.PENDING).toBe(20);
      expect(json.data.statusCounts.TO_FOLLOW).toBe(15);
      expect(json.data.statusCounts.CALLED).toBe(25);
      expect(json.data.statusCounts.VISITED).toBe(10);
      expect(json.data.statusCounts.UPDATED).toBe(20);
      expect(json.data.statusCounts.DONE).toBe(10);
      expect(json.data.paymentCount).toBe(50);
      expect(json.data.terminalCount).toBe(5);
      expect(hasPermission).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        "status",
        "read",
      );
    });

    it("should return 403 when user lacks permission", async () => {
      vi.mocked(hasPermission).mockResolvedValue(false);

      const app = new Hono();
      app.route("/", statusSummaryRoutes);

      const response = await app.request(
        "/summary?companyId=FCASH&periodYear=2024",
      );
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("FORBIDDEN");
    });

    it("should validate required query parameters", async () => {
      vi.mocked(hasPermission).mockResolvedValue(true);

      const app = new Hono();
      app.route("/", statusSummaryRoutes);

      // Missing companyId
      const response1 = await app.request("/summary?periodYear=2024");
      const json1 = await response1.json();

      expect(response1.status).toBe(400);
      expect(json1.success).toBe(false);

      // Missing periodYear
      const response2 = await app.request("/summary?companyId=FCASH");
      const json2 = await response2.json();

      expect(response2.status).toBe(400);
      expect(json2.success).toBe(false);
    });

    it("should validate periodMonth range", async () => {
      vi.mocked(hasPermission).mockResolvedValue(true);

      const app = new Hono();
      app.route("/", statusSummaryRoutes);

      // Invalid periodMonth (0)
      const response1 = await app.request(
        "/summary?companyId=FCASH&periodYear=2024&periodMonth=0",
      );
      const json1 = await response1.json();

      expect(response1.status).toBe(400);
      expect(json1.success).toBe(false);

      // Invalid periodMonth (13)
      const response2 = await app.request(
        "/summary?companyId=FCASH&periodYear=2024&periodMonth=13",
      );
      const json2 = await response2.json();

      expect(response2.status).toBe(400);
      expect(json2.success).toBe(false);
    });

    it("should validate periodQuarter range", async () => {
      vi.mocked(hasPermission).mockResolvedValue(true);

      const app = new Hono();
      app.route("/", statusSummaryRoutes);

      // Invalid periodQuarter (0)
      const response1 = await app.request(
        "/summary?companyId=FCASH&periodYear=2024&periodQuarter=0",
      );
      const json1 = await response1.json();

      expect(response1.status).toBe(400);
      expect(json1.success).toBe(false);

      // Invalid periodQuarter (5)
      const response2 = await app.request(
        "/summary?companyId=FCASH&periodYear=2024&periodQuarter=5",
      );
      const json2 = await response2.json();

      expect(response2.status).toBe(400);
      expect(json2.success).toBe(false);
    });

    it("should return 500 on error", async () => {
      vi.mocked(hasPermission).mockResolvedValue(true);
      vi.mocked(getUserBranchFilter).mockResolvedValue({
        scope: "all",
        branchIds: [],
      });
      vi.mocked(getDashboardSummary).mockRejectedValue(
        new Error("Database error"),
      );

      const app = new Hono();
      app.route("/", statusSummaryRoutes);

      const response = await app.request(
        "/summary?companyId=FCASH&periodYear=2024",
      );
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("INTERNAL_ERROR");
    });
  });
});
