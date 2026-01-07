import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { userSessionsRoutes } from "../sessions";
import { db } from "@/server/db";
import {
  getUserSessions,
  revokeSession,
  revokeAllUserSessions,
} from "@/server/db/queries/sessions";

// Mock database and query functions
vi.mock("@/server/db", () => ({
  db: vi.fn(),
}));

vi.mock("@/server/db/queries/sessions", () => ({
  getUserSessions: vi.fn(),
  revokeSession: vi.fn(),
  revokeAllUserSessions: vi.fn(),
}));

describe("User Sessions Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/users/:id/sessions", () => {
    it("should return user sessions", async () => {
      const mockSessions = [
        {
          id: "1",
          userId: "1",
          sessionToken: "token_1",
          ipAddress: "192.168.1.1",
          userAgent: "Mozilla/5.0",
          createdAt: new Date(),
          expiresAt: new Date(),
        },
      ];

      vi.mocked(getUserSessions).mockResolvedValue(mockSessions);

      const app = new Hono();
      app.route("/", userSessionsRoutes);

      const response = await app.request("/1/sessions");
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toEqual(mockSessions);
      expect(getUserSessions).toHaveBeenCalledWith(db, "1");
    });

    it("should return 500 on error", async () => {
      vi.mocked(getUserSessions).mockRejectedValue(new Error("Database error"));

      const app = new Hono();
      app.route("/", userSessionsRoutes);

      const response = await app.request("/1/sessions");
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error.message).toBe("Database error");
    });
  });

  describe("DELETE /api/users/:id/sessions/:sessionId", () => {
    it("should revoke a single session", async () => {
      const revokedSession = {
        id: "1",
        userId: "1",
        sessionToken: "token_1",
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
        createdAt: new Date(),
        expiresAt: new Date(),
        revokedAt: new Date(),
        revokedReason: "Session revoked by admin",
      };

      vi.mocked(revokeSession).mockResolvedValue(revokedSession);

      const app = new Hono();
      app.route("/", userSessionsRoutes);

      const response = await app.request("/1/sessions/1", {
        method: "DELETE",
      });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toEqual(revokedSession);
      expect(revokeSession).toHaveBeenCalledWith(
        db,
        "1",
        "Session revoked by admin",
      );
    });

    it("should return 404 when session not found", async () => {
      vi.mocked(revokeSession).mockResolvedValue(null);

      const app = new Hono();
      app.route("/", userSessionsRoutes);

      const response = await app.request("/1/sessions/nonexistent", {
        method: "DELETE",
      });
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.error.message).toBe("Session not found");
    });
  });

  describe("POST /api/users/:id/sessions/revoke-all", () => {
    it("should revoke all user sessions", async () => {
      const revokedSessions = [
        {
          id: "1",
          userId: "1",
          sessionToken: "token_1",
          ipAddress: "192.168.1.1",
          userAgent: "Mozilla/5.0",
          createdAt: new Date(),
          expiresAt: new Date(),
          revokedAt: new Date(),
          revokedReason: "All sessions revoked by admin",
        },
      ];

      vi.mocked(revokeAllUserSessions).mockResolvedValue(revokedSessions);

      const app = new Hono();
      app.route("/", userSessionsRoutes);

      const response = await app.request("/1/sessions/revoke-all", {
        method: "POST",
      });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toEqual(revokedSessions);
      expect(revokeAllUserSessions).toHaveBeenCalledWith(
        db,
        "1",
        "All sessions revoked by admin",
      );
    });

    it("should return 500 on error", async () => {
      vi.mocked(revokeAllUserSessions).mockRejectedValue(
        new Error("Database error"),
      );

      const app = new Hono();
      app.route("/", userSessionsRoutes);

      const response = await app.request("/1/sessions/revoke-all", {
        method: "POST",
      });
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error.message).toBe("Database error");
    });
  });
});
