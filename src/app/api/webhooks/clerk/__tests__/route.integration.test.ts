import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { POST } from "../route";
import {
  createUser,
  updateUser,
  deactivateUser,
  getUserByClerkId,
  recordUserLogin,
} from "@/server/db/queries/users";
import { isEventProcessed, markEventProcessed } from "@/server/db/queries/webhooks";
import { logger } from "@/lib/logger";

// Mock next/headers
const mockHeadersGet = vi.fn();
const mockHeaders = {
  get: mockHeadersGet,
};
function mockHeadersFn() {
  return Promise.resolve(mockHeaders);
}

vi.mock("next/headers", () => ({
  headers: mockHeadersFn,
}));

// Mock Webhook class - use vi.hoisted to define before mock
const { mockWebhookInstance, MockWebhook } = vi.hoisted(() => {
  const mockWebhookInstance = {
    verify: vi.fn(),
  };
  class MockWebhook {
    constructor(secret: string) {
      return mockWebhookInstance;
    }
  }
  return { mockWebhookInstance, MockWebhook };
});

vi.mock("svix", () => ({
  Webhook: MockWebhook,
}));

vi.mock("@/config/env", () => ({
  env: {
    CLERK_WEBHOOK_SECRET: "test-secret",
  },
}));

vi.mock("@/server/db", () => ({
  db: {},
}));

vi.mock("@/server/db/schema/users", () => ({
  users: {},
  eq: vi.fn(),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/server/db/queries/users", () => ({
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deactivateUser: vi.fn(),
  getUserByClerkId: vi.fn(),
  recordUserLogin: vi.fn(),
}));

vi.mock("@/server/db/queries/webhooks", () => ({
  isEventProcessed: vi.fn(),
  markEventProcessed: vi.fn(),
}));

describe("Clerk Webhook Integration Tests", () => {
  const testClerkId = `user_test_${Date.now()}`;
  const testEmail = `test-${Date.now()}@example.com`;
  const testOrgId = `org_test_${Date.now()}`;
  const testSessionId = `sess_test_${Date.now()}`;

  beforeAll(async () => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    vi.clearAllMocks();
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup Webhook mock - MockWebhook is already a factory function that returns mockWebhookInstance
    mockWebhookInstance.verify.mockReturnValue({ type: "test", data: { id: "test-id" } });

    // Setup headers mock to return null by default
    mockHeadersGet.mockReturnValue(null);

    // Setup webhook queries mock
    vi.mocked(isEventProcessed).mockResolvedValue(false);
    vi.mocked(markEventProcessed).mockResolvedValue(undefined);
  });

  afterEach(async () => {
    vi.clearAllMocks();
  });

  describe("Complete User Lifecycle Flow", () => {
    it("should handle complete user lifecycle: create, update, session, org membership, and delete", async () => {
      // Configure mock headers to return Svix headers
      mockHeadersGet.mockImplementation((key: string) => {
        const headers: Record<string, string> = {
          "svix-id": "test-id",
          "svix-timestamp": "test-timestamp",
          "svix-signature": "test-signature",
        };
        return headers[key] || null;
      });

      const createEventData = {
        id: testClerkId,
        email_addresses: [{ email_address: testEmail, id: "email_123" }],
        first_name: "John",
        last_name: "Doe",
        image_url: "https://example.com/image.jpg",
      };

      const createRequest = new Request("http://localhost:3000/api/webhooks/clerk", {
        method: "POST",
        headers: {
          "svix-id": "test-id",
          "svix-timestamp": "test-timestamp",
          "svix-signature": "test-signature",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          type: "user.created",
          data: createEventData,
        }),
      });

      mockWebhookInstance.verify.mockReturnValue({
        type: "user.created",
        data: createEventData,
      });

      const createResponse = await POST(createRequest);
      expect(createResponse.status).toBe(200);

      expect(createUser).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          clerkId: testClerkId,
          email: testEmail,
          firstName: "John",
          lastName: "Doe",
          imageUrl: "https://example.com/image.jpg",
        }),
      );

      expect(logger.info).toHaveBeenCalledWith(
        "User created via webhook",
        expect.objectContaining({
          action: "user_created",
          clerkId: testClerkId,
          email: testEmail,
        }),
      );

      expect(markEventProcessed).toHaveBeenCalledWith(
        testClerkId,
        "user.created",
        expect.objectContaining({
          type: "user.created",
          data: expect.objectContaining({
            id: testClerkId,
          }),
        }),
      );

      // Configure getUserByClerkId to return a user (for user.updated)
      vi.mocked(getUserByClerkId).mockResolvedValue({
        id: "internal-uuid-123",
        clerkId: testClerkId,
        email: testEmail,
      });

      const updateEventData = {
        id: testClerkId,
        email_addresses: [{ email_address: `updated-${testEmail}`, id: "email_123" }],
        first_name: "Jane",
        last_name: "Smith",
        image_url: "https://example.com/new-image.jpg",
      };

      mockWebhookInstance.verify.mockReturnValue({
        type: "user.updated",
        data: updateEventData,
      });

      const updateRequest = new Request("http://localhost:3000/api/webhooks/clerk", {
        method: "POST",
        headers: {
          "svix-id": "test-id",
          "svix-timestamp": "test-timestamp",
          "svix-signature": "test-signature",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          type: "user.updated",
          data: updateEventData,
        }),
      });

      const updateResponse = await POST(updateRequest);
      expect(updateResponse.status).toBe(200);

      expect(updateUser).toHaveBeenCalledWith(
        expect.anything(),
        "internal-uuid-123",
        expect.objectContaining({
          email: `updated-${testEmail}`,
          firstName: "Jane",
          lastName: "Smith",
          imageUrl: "https://example.com/new-image.jpg",
        }),
      );

      expect(logger.info).toHaveBeenCalledWith(
        "User updated via webhook",
        expect.objectContaining({
          action: "user_updated",
          clerkId: testClerkId,
        }),
      );

      expect(markEventProcessed).toHaveBeenCalledWith(
        testClerkId,
        "user.updated",
        expect.objectContaining({
          type: "user.updated",
          data: expect.objectContaining({
            id: testClerkId,
          }),
        }),
      );

      // Configure mock headers to return Svix headers
      mockHeadersGet.mockImplementation((key: string) => {
        const headers: Record<string, string> = {
          "svix-id": "test-id",
          "svix-timestamp": "test-timestamp",
          "svix-signature": "test-signature",
        };
        return headers[key] || null;
      });

      const sessionCreatedEventData = {
        id: testSessionId,
        user_id: testClerkId,
        ip_address: "192.168.1.1",
        user_agent: "Mozilla/5.0",
      };

      mockWebhookInstance.verify.mockReturnValue({
        type: "session.created",
        data: sessionCreatedEventData,
      });

      const sessionCreatedRequest = new Request("http://localhost:3000/api/webhooks/clerk", {
        method: "POST",
        headers: {
          "svix-id": "test-id",
          "svix-timestamp": "test-timestamp",
          "svix-signature": "test-signature",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          type: "session.created",
          data: sessionCreatedEventData,
        }),
      });

      // Configure getUserByClerkId to return a user (for session.created)
      vi.mocked(getUserByClerkId).mockResolvedValue({
        id: "internal-uuid-123",
        clerkId: testClerkId,
        email: testEmail,
      });

      const sessionCreatedResponse = await POST(sessionCreatedRequest);
      expect(sessionCreatedResponse.status).toBe(200);

      expect(recordUserLogin).toHaveBeenCalledWith(
        expect.anything(),
        "internal-uuid-123",
        "192.168.1.1",
        "Mozilla/5.0",
      );

      expect(logger.info).toHaveBeenCalledWith(
        "Session created via webhook",
        expect.objectContaining({
          action: "session_created",
          clerkId: testClerkId,
          ipAddress: "192.168.1.1",
        }),
      );

      expect(markEventProcessed).toHaveBeenCalledWith(
        testSessionId,
        "session.created",
        expect.objectContaining({
          type: "session.created",
          data: expect.objectContaining({
            id: testSessionId,
          }),
        }),
      );

      // Configure mock headers to return Svix headers
      mockHeadersGet.mockImplementation((key: string) => {
        const headers: Record<string, string> = {
          "svix-id": "test-id",
          "svix-timestamp": "test-timestamp",
          "svix-signature": "test-signature",
        };
        return headers[key] || null;
      });

      const testMembershipId = "membership_lifecycle_123";
      const orgCreatedEventData = {
        id: testMembershipId,
        public_user_data: {
          user_id: testClerkId,
        },
        organization: {
          id: testOrgId,
          name: "Test Organization",
        },
      };

      mockWebhookInstance.verify.mockReturnValue({
        type: "organizationMembership.created",
        data: orgCreatedEventData,
      });

      const orgCreatedRequest = new Request("http://localhost:3000/api/webhooks/clerk", {
        method: "POST",
        headers: {
          "svix-id": "test-id",
          "svix-timestamp": "test-timestamp",
          "svix-signature": "test-signature",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          type: "organizationMembership.created",
          data: orgCreatedEventData,
        }),
      });

      const orgCreatedResponse = await POST(orgCreatedRequest);
      expect(orgCreatedResponse.status).toBe(200);

      expect(updateUser).toHaveBeenCalledWith(
        expect.anything(),
        "internal-uuid-123",
        expect.objectContaining({
          clerkOrgId: testOrgId,
        }),
      );

      expect(logger.info).toHaveBeenCalledWith(
        "Organization membership created via webhook",
        expect.objectContaining({
          action: "organization_membership_created",
          clerkId: testClerkId,
          clerkOrgId: testOrgId,
        }),
      );

      expect(markEventProcessed).toHaveBeenCalledWith(
        testMembershipId,
        "organizationMembership.created",
        expect.objectContaining({
          type: "organizationMembership.created",
          data: expect.objectContaining({
            id: testMembershipId,
            public_user_data: expect.objectContaining({
              user_id: testClerkId,
            }),
            organization: expect.objectContaining({
              id: testOrgId,
              name: "Test Organization",
            }),
          }),
        }),
      );

      // Configure mock headers to return Svix headers
      mockHeadersGet.mockImplementation((key: string) => {
        const headers: Record<string, string> = {
          "svix-id": "test-id",
          "svix-timestamp": "test-timestamp",
          "svix-signature": "test-signature",
        };
        return headers[key] || null;
      });

      const newOrgId = "org_lifecycle_456";
      const testMembershipId2 = "membership_lifecycle_789";
      const orgUpdatedEventData = {
        id: testMembershipId2,
        public_user_data: {
          user_id: testClerkId,
        },
        organization: {
          id: newOrgId,
          name: "New Organization",
        },
      };

      mockWebhookInstance.verify.mockReturnValue({
        type: "organizationMembership.updated",
        data: orgUpdatedEventData,
      });

      const orgUpdatedRequest = new Request("http://localhost:3000/api/webhooks/clerk", {
        method: "POST",
        headers: {
          "svix-id": "test-id",
          "svix-timestamp": "test-timestamp",
          "svix-signature": "test-signature",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          type: "organizationMembership.updated",
          data: orgUpdatedEventData,
        }),
      });

      const orgUpdatedResponse = await POST(orgUpdatedRequest);
      expect(orgUpdatedResponse.status).toBe(200);

      expect(updateUser).toHaveBeenCalledWith(
        expect.anything(),
        "internal-uuid-123",
        expect.objectContaining({
          clerkOrgId: newOrgId,
        }),
      );

      expect(logger.info).toHaveBeenCalledWith(
        "Organization membership updated via webhook",
        expect.objectContaining({
          action: "organization_membership_updated",
          clerkId: testClerkId,
          clerkOrgId: newOrgId,
        }),
      );

      expect(markEventProcessed).toHaveBeenCalledWith(
        testMembershipId2,
        "organizationMembership.updated",
        expect.objectContaining({
          type: "organizationMembership.updated",
          data: expect.objectContaining({
            id: testMembershipId2,
            public_user_data: expect.objectContaining({
              user_id: testClerkId,
            }),
            organization: expect.objectContaining({
              id: newOrgId,
              name: "New Organization",
            }),
          }),
        }),
      );

      // Configure mock headers to return Svix headers
      mockHeadersGet.mockImplementation((key: string) => {
        const headers: Record<string, string> = {
          "svix-id": "test-id",
          "svix-timestamp": "test-timestamp",
          "svix-signature": "test-signature",
        };
        return headers[key] || null;
      });

      const testMembershipId3 = "membership_lifecycle_999";
      const orgDeletedEventData = {
        id: testMembershipId3,
        public_user_data: {
          user_id: testClerkId,
        },
        organization: {
          id: newOrgId,
        },
      };

      mockWebhookInstance.verify.mockReturnValue({
        type: "organizationMembership.deleted",
        data: orgDeletedEventData,
      });

      const orgDeletedRequest = new Request("http://localhost:3000/api/webhooks/clerk", {
        method: "POST",
        headers: {
          "svix-id": "test-id",
          "svix-timestamp": "test-timestamp",
          "svix-signature": "test-signature",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          type: "organizationMembership.deleted",
          data: orgDeletedEventData,
        }),
      });

      const orgDeletedResponse = await POST(orgDeletedRequest);
      expect(orgDeletedResponse.status).toBe(200);

      expect(updateUser).toHaveBeenCalledWith(
        expect.anything(),
        "internal-uuid-123",
        expect.objectContaining({
          clerkOrgId: null,
        }),
      );

      expect(logger.info).toHaveBeenCalledWith(
        "Organization membership deleted via webhook",
        expect.objectContaining({
          action: "organization_membership_deleted",
          clerkId: testClerkId,
        }),
      );

      expect(markEventProcessed).toHaveBeenCalledWith(
        testMembershipId3,
        "organizationMembership.deleted",
        expect.objectContaining({
          type: "organizationMembership.deleted",
          data: expect.objectContaining({
            id: testMembershipId3,
            public_user_data: expect.objectContaining({
              user_id: testClerkId,
            }),
            organization: expect.objectContaining({
              id: newOrgId,
            }),
          }),
        }),
      );

      const deleteEventData = {
        id: testClerkId,
      };

      const deleteRequest = new Request("http://localhost:3000/api/webhooks/clerk", {
        method: "POST",
        headers: {
          "svix-id": "test-id",
          "svix-timestamp": "test-timestamp",
          "svix-signature": "test-signature",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          type: "user.deleted",
          data: deleteEventData,
        }),
      });

      mockWebhookInstance.verify.mockReturnValue({
        type: "user.deleted",
        data: deleteEventData,
      });

      const deleteResponse = await POST(deleteRequest);
      expect(deleteResponse.status).toBe(200);

      expect(deactivateUser).toHaveBeenCalledWith(
        expect.anything(),
        "internal-uuid-123",
      );

      expect(logger.info).toHaveBeenCalledWith(
        "User soft deleted via webhook",
        expect.objectContaining({
          action: "user_deleted",
          clerkId: testClerkId,
        }),
      );

      expect(markEventProcessed).toHaveBeenCalledWith(
        testClerkId,
        "user.deleted",
        expect.objectContaining({
          type: "user.deleted",
          data: expect.objectContaining({
            id: testClerkId,
          }),
        }),
      );
    });
  });

  describe("Idempotency Flow", () => {
    it("should handle duplicate webhook events idempotently", async () => {
      // Configure mock headers to return Svix headers
      mockHeadersGet.mockImplementation((key: string) => {
        const headers: Record<string, string> = {
          "svix-id": "test-id",
          "svix-timestamp": "test-timestamp",
          "svix-signature": "test-signature",
        };
        return headers[key] || null;
      });

      const eventData = {
        id: testClerkId,
        email_addresses: [{ email_address: testEmail, id: "email_123" }],
        first_name: "John",
        last_name: "Doe",
      };

      const firstRequest = new Request("http://localhost:3000/api/webhooks/clerk", {
        method: "POST",
        headers: {
          "svix-id": "test-id",
          "svix-timestamp": "test-timestamp",
          "svix-signature": "test-signature",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          type: "user.created",
          data: eventData,
        }),
      });

      mockWebhookInstance.verify.mockReturnValue({
        type: "user.created",
        data: eventData,
      });

      const firstResponse = await POST(firstRequest);
      expect(firstResponse.status).toBe(200);

      expect(createUser).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          clerkId: testClerkId,
          email: testEmail,
          firstName: "John",
          lastName: "Doe",
        }),
      );

      expect(logger.info).toHaveBeenCalledWith(
        "User created via webhook",
        expect.objectContaining({
          action: "user_created",
          clerkId: testClerkId,
          email: testEmail,
        }),
      );

      expect(markEventProcessed).toHaveBeenCalledWith(
        testClerkId,
        "user.created",
        expect.objectContaining({
          type: "user.created",
          data: expect.objectContaining({
            id: testClerkId,
          }),
        }),
      );

      // Configure isEventProcessed to return true (for duplicate check)
      vi.mocked(isEventProcessed).mockResolvedValue(true);

      const duplicateRequest = new Request("http://localhost:3000/api/webhooks/clerk", {
        method: "POST",
        headers: {
          "svix-id": "test-id",
          "svix-timestamp": "test-timestamp",
          "svix-signature": "test-signature",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          type: "user.created",
          data: eventData,
        }),
      });

      const duplicateResponse = await POST(duplicateRequest);
      expect(duplicateResponse.status).toBe(200);

      const duplicateResponseBody = await duplicateResponse.json();
      expect(duplicateResponseBody.received).toBe(true);
      expect(duplicateResponseBody.message).toBe("Event already processed");

      expect(isEventProcessed).toHaveBeenCalledWith(testClerkId);
      expect(isEventProcessed).toHaveResolvedWith(true);
    });
  });

  describe("Error Handling Flow", () => {
    it("should return 400 for invalid webhook signature", async () => {
      // Configure mock headers to return Svix headers
      mockHeadersGet.mockImplementation((key: string) => {
        const headers: Record<string, string> = {
          "svix-id": "test-id",
          "svix-timestamp": "test-timestamp",
          "svix-signature": "test-signature",
        };
        return headers[key] || null;
      });

      const eventData = {
        id: testClerkId,
        email_addresses: [{ email_address: testEmail, id: "email_123" }],
      };

      const invalidSigRequest = new Request("http://localhost:3000/api/webhooks/clerk", {
        method: "POST",
        headers: {
          "svix-id": "test-id",
          "svix-timestamp": "test-timestamp",
          "svix-signature": "test-signature",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          type: "user.created",
          data: eventData,
        }),
      });

      // Configure webhook verify to throw error
      mockWebhookInstance.verify.mockImplementation(() => {
        throw new Error("Invalid signature");
      });

      const invalidSigResponse = await POST(invalidSigRequest);
      expect(invalidSigResponse.status).toBe(400);
      expect(await invalidSigResponse.text()).toBe("Error: Invalid signature");

      expect(createUser).not.toHaveBeenCalled();
    });

    it("should return 400 for missing Svix headers", async () => {
      // Configure mock headers to return null (missing Svix headers)
      mockHeadersGet.mockReturnValue(null);

      const missingHeadersRequest = new Request("http://localhost:3000/api/webhooks/clerk", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const missingHeadersResponse = await POST(missingHeadersRequest);
      expect(missingHeadersResponse.status).toBe(400);
      expect(await missingHeadersResponse.text()).toBe("Error: Missing Svix headers");
    });

    it("should return 404 for updating non-existent user", async () => {
      // Configure mock headers to return Svix headers
      mockHeadersGet.mockImplementation((key: string) => {
        const headers: Record<string, string> = {
          "svix-id": "test-id",
          "svix-timestamp": "test-timestamp",
          "svix-signature": "test-signature",
        };
        return headers[key] || null;
      });

      const nonExistentClerkId = `user_nonexistent_${new Date().getTime()}`;
      const eventData = {
        id: nonExistentClerkId,
        email_addresses: [{ email_address: "nonexistent@example.com", id: "email_123" }],
        first_name: "John",
      };

      const nonExistentUserRequest = new Request("http://localhost:3000/api/webhooks/clerk", {
        method: "POST",
        headers: {
          "svix-id": "test-id",
          "svix-timestamp": "test-timestamp",
          "svix-signature": "test-signature",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          type: "user.updated",
          data: eventData,
        }),
      });

      mockWebhookInstance.verify.mockReturnValue({
        type: "user.updated",
        data: eventData,
      });

      // Configure getUserByClerkId to return null (user not found)
      vi.mocked(getUserByClerkId).mockResolvedValue(null);

      const nonExistentUserResponse = await POST(nonExistentUserRequest);
      expect(nonExistentUserResponse.status).toBe(404);
      expect(await nonExistentUserResponse.text()).toBe("Error: User not found");

      expect(getUserByClerkId).toHaveBeenCalledWith(nonExistentClerkId);
      expect(getUserByClerkId).toHaveResolvedWith(null);
    });

    it("should return 404 for deleting non-existent user", async () => {
      // Configure mock headers to return Svix headers
      mockHeadersGet.mockImplementation((key: string) => {
        const headers: Record<string, string> = {
          "svix-id": "test-id",
          "svix-timestamp": "test-timestamp",
          "svix-signature": "test-signature",
        };
        return headers[key] || null;
      });

      const nonExistentClerkId = `user_nonexistent_${new Date().getTime()}`;
      const eventData = {
        id: nonExistentClerkId,
      };

      const nonExistentUserRequest = new Request("http://localhost:3000/api/webhooks/clerk", {
        method: "POST",
        headers: {
          "svix-id": "test-id",
          "svix-timestamp": "test-timestamp",
          "svix-signature": "test-signature",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          type: "user.deleted",
          data: eventData,
        }),
      });

      mockWebhookInstance.verify.mockReturnValue({
        type: "user.deleted",
        data: eventData,
      });

      // Configure getUserByClerkId to return null (user not found)
      vi.mocked(getUserByClerkId).mockResolvedValue(null);

      const nonExistentUserResponse = await POST(nonExistentUserRequest);
      expect(nonExistentUserResponse.status).toBe(404);
      expect(await nonExistentUserResponse.text()).toBe("Error: User not found");

      expect(getUserByClerkId).toHaveBeenCalledWith(nonExistentClerkId);
      expect(getUserByClerkId).toHaveResolvedWith(null);
    });

    it("should return 404 for session.created for non-existent user", async () => {
      // Configure mock headers to return Svix headers
      mockHeadersGet.mockImplementation((key: string) => {
        const headers: Record<string, string> = {
          "svix-id": "test-id",
          "svix-timestamp": "test-timestamp",
          "svix-signature": "test-signature",
        };
        return headers[key] || null;
      });

      const nonExistentClerkId = `user_nonexistent_${new Date().getTime()}`;
      const eventData = {
        id: `sess_${new Date().getTime()}`,
        user_id: nonExistentClerkId,
        ip_address: "192.168.1.1",
        user_agent: "Mozilla/5.0",
      };

      const nonExistentUserRequest = new Request("http://localhost:3000/api/webhooks/clerk", {
        method: "POST",
        headers: {
          "svix-id": "test-id",
          "svix-timestamp": "test-timestamp",
          "svix-signature": "test-signature",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          type: "session.created",
          data: eventData,
        }),
      });

      mockWebhookInstance.verify.mockReturnValue({
        type: "session.created",
        data: eventData,
      });

      // Configure getUserByClerkId to return null (user not found)
      vi.mocked(getUserByClerkId).mockResolvedValue(null);

      const nonExistentUserResponse = await POST(nonExistentUserRequest);
      expect(nonExistentUserResponse.status).toBe(404);
      expect(await nonExistentUserResponse.text()).toBe("Error: User not found");

      expect(getUserByClerkId).toHaveBeenCalledWith(nonExistentClerkId);
      expect(getUserByClerkId).toHaveResolvedWith(null);
    });

    it("should return 404 for organizationMembership.created for non-existent user", async () => {
      // Configure mock headers to return Svix headers
      mockHeadersGet.mockImplementation((key: string) => {
        const headers: Record<string, string> = {
          "svix-id": "test-id",
          "svix-timestamp": "test-timestamp",
          "svix-signature": "test-signature",
        };
        return headers[key] || null;
      });

      const nonExistentClerkId = `user_nonexistent_${new Date().getTime()}`;
      const eventData = {
        id: `membership_${new Date().getTime()}`,
        public_user_data: {
          user_id: nonExistentClerkId,
        },
        organization: {
          id: testOrgId,
        },
      };

      const nonExistentUserRequest = new Request("http://localhost:3000/api/webhooks/clerk", {
        method: "POST",
        headers: {
          "svix-id": "test-id",
          "svix-timestamp": "test-timestamp",
          "svix-signature": "test-signature",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          type: "organizationMembership.created",
          data: eventData,
        }),
      });

      mockWebhookInstance.verify.mockReturnValue({
        type: "organizationMembership.created",
        data: eventData,
      });

      // Configure getUserByClerkId to return null (user not found)
      vi.mocked(getUserByClerkId).mockResolvedValue(null);

      const nonExistentUserResponse = await POST(nonExistentUserRequest);
      expect(nonExistentUserResponse.status).toBe(404);
      expect(await nonExistentUserResponse.text()).toBe("Error: User not found");

      expect(getUserByClerkId).toHaveBeenCalledWith(nonExistentClerkId);
      expect(getUserByClerkId).toHaveResolvedWith(null);
    });
  });

  describe("Session Tracking Flow", () => {
    it("should track user sessions correctly", async () => {
      // Configure mock headers to return Svix headers
      mockHeadersGet.mockImplementation((key: string) => {
        const headers: Record<string, string> = {
          "svix-id": "test-id",
          "svix-timestamp": "test-timestamp",
          "svix-signature": "test-signature",
        };
        return headers[key] || null;
      });

      // First, create a user
      const createEventData = {
        id: testClerkId,
        email_addresses: [{ email_address: testEmail, id: "email_123" }],
        first_name: "John",
        last_name: "Doe",
      };

      const createRequest = new Request("http://localhost:3000/api/webhooks/clerk", {
        method: "POST",
        headers: {
          "svix-id": "test-id",
          "svix-timestamp": "test-timestamp",
          "svix-signature": "test-signature",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          type: "user.created",
          data: createEventData,
        }),
      });

      mockWebhookInstance.verify.mockReturnValue({
        type: "user.created",
        data: createEventData,
      });

      const createResponse = await POST(createRequest);
      expect(createResponse.status).toBe(200);

      // Configure getUserByClerkId to return a user (for session.created)
      vi.mocked(getUserByClerkId).mockResolvedValue({
        id: "internal-uuid-123",
        clerkId: testClerkId,
        email: testEmail,
      });

      // Now send a session.created event to track the login
      const sessionCreatedEventData = {
        id: testSessionId,
        user_id: testClerkId,
        ip_address: "192.168.1.1",
        user_agent: "Mozilla/5.0",
      };

      const sessionCreatedRequest = new Request("http://localhost:3000/api/webhooks/clerk", {
        method: "POST",
        headers: {
          "svix-id": "test-id",
          "svix-timestamp": "test-timestamp",
          "svix-signature": "test-signature",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          type: "session.created",
          data: sessionCreatedEventData,
        }),
      });

      mockWebhookInstance.verify.mockReturnValue({
        type: "session.created",
        data: sessionCreatedEventData,
      });

      const sessionCreatedResponse = await POST(sessionCreatedRequest);
      expect(sessionCreatedResponse.status).toBe(200);

      expect(recordUserLogin).toHaveBeenCalledWith(
        expect.anything(),
        "internal-uuid-123",
        "192.168.1.1",
        "Mozilla/5.0",
      );

      expect(logger.info).toHaveBeenCalledWith(
        "Session created via webhook",
        expect.objectContaining({
          action: "session_created",
          clerkId: testClerkId,
          ipAddress: "192.168.1.1",
        }),
      );

      expect(markEventProcessed).toHaveBeenCalledWith(
        testSessionId,
        "session.created",
        expect.objectContaining({
          type: "session.created",
          data: expect.objectContaining({
            id: testSessionId,
          }),
        }),
      );

      // Send session.ended event
      const sessionEndedEventData = {
        id: "sess_ended_123",
        user_id: testClerkId,
      };

      const sessionEndedRequest = new Request("http://localhost:3000/api/webhooks/clerk", {
        method: "POST",
        headers: {
          "svix-id": "test-id",
          "svix-timestamp": "test-timestamp",
          "svix-signature": "test-signature",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          type: "session.ended",
          data: sessionEndedEventData,
        }),
      });

      mockWebhookInstance.verify.mockReturnValue({
        type: "session.ended",
        data: sessionEndedEventData,
      });

      const sessionEndedResponse = await POST(sessionEndedRequest);
      expect(sessionEndedResponse.status).toBe(200);

      expect(logger.info).toHaveBeenCalledWith(
        "Session ended via webhook",
        expect.objectContaining({
          action: "session_ended",
          clerkId: testClerkId,
        }),
      );

      const session2EventData = {
        id: "sess_2_123",
        user_id: testClerkId,
        ip_address: "192.168.1.2",
        user_agent: "Chrome/1.0",
      };

      const session2Request = new Request("http://localhost:3000/api/webhooks/clerk", {
        method: "POST",
        headers: {
          "svix-id": "test-id",
          "svix-timestamp": "test-timestamp",
          "svix-signature": "test-signature",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          type: "session.created",
          data: session2EventData,
        }),
      });

      mockWebhookInstance.verify.mockReturnValue({
        type: "session.created",
        data: session2EventData,
      });

      const session2Response = await POST(session2Request);
      expect(session2Response.status).toBe(200);

      expect(recordUserLogin).toHaveBeenCalledWith(
        expect.anything(),
        "internal-uuid-123",
        "192.168.1.2",
        "Chrome/1.0",
      );

      expect(logger.info).toHaveBeenCalledWith(
        "Session created via webhook",
        expect.objectContaining({
          action: "session_created",
          clerkId: testClerkId,
          ipAddress: "192.168.1.2",
        }),
      );

      expect(markEventProcessed).toHaveBeenCalledWith(
        "sess_2_123",
        "session.created",
        expect.objectContaining({
          type: "session.created",
          data: expect.objectContaining({
            id: "sess_2_123",
          }),
        }),
      );
    });
  });

  describe("Organization Membership Flow", () => {
    it("should handle organization membership lifecycle", async () => {
      // Configure mock headers to return Svix headers
      mockHeadersGet.mockImplementation((key: string) => {
        const headers: Record<string, string> = {
          "svix-id": "test-id",
          "svix-timestamp": "test-timestamp",
          "svix-signature": "test-signature",
        };
        return headers[key] || null;
      });

      // First, create a user
      const createEventData = {
        id: testClerkId,
        email_addresses: [{ email_address: testEmail, id: "email_123" }],
        first_name: "John",
        last_name: "Doe",
      };

      const createRequest = new Request("http://localhost:3000/api/webhooks/clerk", {
        method: "POST",
        headers: {
          "svix-id": "test-id",
          "svix-timestamp": "test-timestamp",
          "svix-signature": "test-signature",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          type: "user.created",
          data: createEventData,
        }),
      });

      mockWebhookInstance.verify.mockReturnValue({
        type: "user.created",
        data: createEventData,
      });

      const createResponse = await POST(createRequest);
      expect(createResponse.status).toBe(200);

      // Configure getUserByClerkId to return a user (for organizationMembership events)
      vi.mocked(getUserByClerkId).mockResolvedValue({
        id: "internal-uuid-123",
        clerkId: testClerkId,
        email: testEmail,
      });

      // Now send organizationMembership.created event
      const testMembershipId = "membership_test_123";
      const orgCreatedEventData = {
        id: testMembershipId,
        public_user_data: {
          user_id: testClerkId,
        },
        organization: {
          id: testOrgId,
          name: "Test Organization",
        },
      };

      const orgCreatedRequest = new Request("http://localhost:3000/api/webhooks/clerk", {
        method: "POST",
        headers: {
          "svix-id": "test-id",
          "svix-timestamp": "test-timestamp",
          "svix-signature": "test-signature",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          type: "organizationMembership.created",
          data: orgCreatedEventData,
        }),
      });

      mockWebhookInstance.verify.mockReturnValue({
        type: "organizationMembership.created",
        data: orgCreatedEventData,
      });

      const orgCreatedResponse = await POST(orgCreatedRequest);
      expect(orgCreatedResponse.status).toBe(200);

      expect(updateUser).toHaveBeenCalledWith(
        expect.anything(),
        "internal-uuid-123",
        expect.objectContaining({
          clerkOrgId: testOrgId,
        }),
      );

      expect(logger.info).toHaveBeenCalledWith(
        "Organization membership created via webhook",
        expect.objectContaining({
          action: "organization_membership_created",
          clerkId: testClerkId,
          clerkOrgId: testOrgId,
        }),
      );

      expect(markEventProcessed).toHaveBeenCalledWith(
        testMembershipId,
        "organizationMembership.created",
        expect.objectContaining({
          type: "organizationMembership.created",
          data: expect.objectContaining({
            id: testMembershipId,
            public_user_data: expect.objectContaining({
              user_id: testClerkId,
            }),
            organization: expect.objectContaining({
              id: testOrgId,
              name: "Test Organization",
            }),
          }),
        }),
      );

      // Send organizationMembership.updated event
      const newOrgId = "org_test_456";
      const testMembershipId2 = "membership_test_789";
      const orgUpdatedEventData = {
        id: testMembershipId2,
        public_user_data: {
          user_id: testClerkId,
        },
        organization: {
          id: newOrgId,
          name: "New Organization",
        },
      };

      const orgUpdatedRequest = new Request("http://localhost:3000/api/webhooks/clerk", {
        method: "POST",
        headers: {
          "svix-id": "test-id",
          "svix-timestamp": "test-timestamp",
          "svix-signature": "test-signature",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          type: "organizationMembership.updated",
          data: orgUpdatedEventData,
        }),
      });

      mockWebhookInstance.verify.mockReturnValue({
        type: "organizationMembership.updated",
        data: orgUpdatedEventData,
      });

      const orgUpdatedResponse = await POST(orgUpdatedRequest);
      expect(orgUpdatedResponse.status).toBe(200);

      expect(updateUser).toHaveBeenCalledWith(
        expect.anything(),
        "internal-uuid-123",
        expect.objectContaining({
          clerkOrgId: newOrgId,
        }),
      );

      expect(logger.info).toHaveBeenCalledWith(
        "Organization membership updated via webhook",
        expect.objectContaining({
          action: "organization_membership_updated",
          clerkId: testClerkId,
          clerkOrgId: newOrgId,
        }),
      );

      expect(markEventProcessed).toHaveBeenCalledWith(
        testMembershipId2,
        "organizationMembership.updated",
        expect.objectContaining({
          type: "organizationMembership.updated",
          data: expect.objectContaining({
            id: testMembershipId2,
            public_user_data: expect.objectContaining({
              user_id: testClerkId,
            }),
            organization: expect.objectContaining({
              id: newOrgId,
              name: "New Organization",
            }),
          }),
        }),
      );

      // Send organizationMembership.deleted event
      const testMembershipId3 = "membership_test_999";
      const orgDeletedEventData = {
        id: testMembershipId3,
        public_user_data: {
          user_id: testClerkId,
        },
        organization: {
          id: newOrgId,
        },
      };

      const orgDeletedRequest = new Request("http://localhost:3000/api/webhooks/clerk", {
        method: "POST",
        headers: {
          "svix-id": "test-id",
          "svix-timestamp": "test-timestamp",
          "svix-signature": "test-signature",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          type: "organizationMembership.deleted",
          data: orgDeletedEventData,
        }),
      });

      mockWebhookInstance.verify.mockReturnValue({
        type: "organizationMembership.deleted",
        data: orgDeletedEventData,
      });

      const orgDeletedResponse = await POST(orgDeletedRequest);
      expect(orgDeletedResponse.status).toBe(200);

      expect(updateUser).toHaveBeenCalledWith(
        expect.anything(),
        "internal-uuid-123",
        expect.objectContaining({
          clerkOrgId: null,
        }),
      );

      expect(logger.info).toHaveBeenCalledWith(
        "Organization membership deleted via webhook",
        expect.objectContaining({
          action: "organization_membership_deleted",
          clerkId: testClerkId,
        }),
      );

      expect(markEventProcessed).toHaveBeenCalledWith(
        testMembershipId3,
        "organizationMembership.deleted",
        expect.objectContaining({
          type: "organizationMembership.deleted",
          data: expect.objectContaining({
            id: testMembershipId3,
            public_user_data: expect.objectContaining({
              user_id: testClerkId,
            }),
            organization: expect.objectContaining({
              id: newOrgId,
            }),
          }),
        }),
      );
    });
  });

  describe("Database Verification", () => {
    it("should correctly set all timestamps and maintain relationships", async () => {
      // Configure mock headers to return Svix headers
      mockHeadersGet.mockImplementation((key: string) => {
        const headers: Record<string, string> = {
          "svix-id": "test-id",
          "svix-timestamp": "test-timestamp",
          "svix-signature": "test-signature",
        };
        return headers[key] || null;
      });

      const eventData = {
        id: testClerkId,
        email_addresses: [{ email_address: testEmail, id: "email_123" }],
        first_name: "John",
        last_name: "Doe",
      };

      const request = new Request("http://localhost:3000/api/webhooks/clerk", {
        method: "POST",
        headers: {
          "svix-id": "test-id",
          "svix-timestamp": "test-timestamp",
          "svix-signature": "test-signature",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          type: "user.created",
          data: eventData,
        }),
      });

      mockWebhookInstance.verify.mockReturnValue({
        type: "user.created",
        data: eventData,
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      expect(createUser).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          clerkId: testClerkId,
          email: testEmail,
          firstName: "John",
          lastName: "Doe",
          imageUrl: null,
        }),
      );

      expect(logger.info).toHaveBeenCalledWith(
        "User created via webhook",
        expect.objectContaining({
          action: "user_created",
          clerkId: testClerkId,
          email: testEmail,
        }),
      );

      expect(markEventProcessed).toHaveBeenCalledWith(
        testClerkId,
        "user.created",
        expect.objectContaining({
          type: "user.created",
          data: expect.objectContaining({
            id: testClerkId,
          }),
        }),
      );
    });
  });

  describe("Real Webhook Payload Structure", () => {
    it("should handle realistic Clerk webhook payload structure", async () => {
      // Configure mock headers to return Svix headers
      mockHeadersGet.mockImplementation((key: string) => {
        const headers: Record<string, string> = {
          "svix-id": "test-id",
          "svix-timestamp": "test-timestamp",
          "svix-signature": "test-signature",
        };
        return headers[key] || null;
      });

      const realisticEventData = {
        id: testClerkId,
        object: "user",
        external_id: null,
        primary_email_address_id: "email_123",
        email_addresses: [
          {
            id: "email_123",
            email_address: testEmail,
            verification: {
              status: "verified",
              strategy: "email_link",
            },
          },
        ],
        first_name: "John",
        last_name: "Doe",
        profile_image_url: "https://example.com/image.jpg",
        image_url: "https://example.com/image.jpg",
        username: null,
        public_metadata: {},
        private_metadata: {},
        unsafe_metadata: {},
        created_at: 1704067200000,
        updated_at: 1704067200000,
        last_sign_in_at: null,
        last_active_at: null,
        has_image: true,
        password_enabled: true,
        totp_enabled: false,
        backup_codes_enabled: false,
        two_factor_enabled: false,
        phone_numbers: [],
        web3_wallets: [],
        sso_accounts: [],
        passkeys: [],
        organization_memberships: [],
        external_accounts: [],
        create_organization_enabled: false,
        delete_self_enabled: false,
        create_guest_enabled: false,
        gender: null,
        birthday: null,
      };

      const request = new Request("http://localhost:3000/api/webhooks/clerk", {
        method: "POST",
        headers: {
          "svix-id": "test-id",
          "svix-timestamp": "test-timestamp",
          "svix-signature": "test-signature",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          type: "user.created",
          data: realisticEventData,
        }),
      });

      mockWebhookInstance.verify.mockReturnValue({
        type: "user.created",
        data: realisticEventData,
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      expect(createUser).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          clerkId: testClerkId,
          email: testEmail,
          firstName: "John",
          lastName: "Doe",
          imageUrl: "https://example.com/image.jpg",
        }),
      );
    });
  });
});
