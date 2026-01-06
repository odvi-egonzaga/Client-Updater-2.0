import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '../route'
import { Webhook } from 'svix'
import { createUser, updateUser, deactivateUser, getUserByClerkId, recordUserLogin } from '@/server/db/queries/users'
import { logger } from '@/lib/logger'

// Mock dependencies
vi.mock('svix', () => ({
  Webhook: vi.fn(),
}))

vi.mock('@/config/env', () => ({
  env: {
    CLERK_WEBHOOK_SECRET: 'test-secret',
  },
}))

vi.mock('@/server/db', () => ({
  db: {},
}))

vi.mock('@/server/db/schema/users', () => ({
  users: {},
  eq: vi.fn(),
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/server/db/queries/users', () => ({
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deactivateUser: vi.fn(),
  getUserByClerkId: vi.fn(),
  recordUserLogin: vi.fn(),
}))

describe('Clerk Webhook Route', () => {
  let mockWebhook: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup Webhook mock
    mockWebhook = {
      verify: vi.fn(),
    }
    vi.mocked(Webhook).mockImplementation(() => mockWebhook)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Webhook Verification', () => {
    it('should return 400 if Svix headers are missing', async () => {
      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      expect(await response.text()).toBe('Error: Missing Svix headers')
      expect(logger.error).toHaveBeenCalledWith(
        'Missing Svix headers',
        expect.any(Error),
        expect.objectContaining({ action: 'webhook_verification' })
      )
    })

    it('should return 400 if webhook signature is invalid', async () => {
      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'svix-id': 'test-id',
          'svix-timestamp': 'test-timestamp',
          'svix-signature': 'test-signature',
        },
        body: JSON.stringify({}),
      })

      mockWebhook.verify.mockImplementation(() => {
        throw new Error('Invalid signature')
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      expect(await response.text()).toBe('Error: Invalid signature')
      expect(logger.error).toHaveBeenCalledWith(
        'Error verifying webhook',
        expect.any(Error),
        expect.objectContaining({ action: 'webhook_verification' })
      )
    })
  })

  describe('user.created event', () => {
    it('should create user with internal UUID', async () => {
      const clerkId = 'user_123'
      const email = 'test@example.com'
      const eventData = {
        id: clerkId,
        email_addresses: [{ email_address: email }],
        first_name: 'John',
        last_name: 'Doe',
        image_url: 'https://example.com/image.jpg',
      }

      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'svix-id': 'test-id',
          'svix-timestamp': 'test-timestamp',
          'svix-signature': 'test-signature',
        },
        body: JSON.stringify({
          type: 'user.created',
          data: eventData,
        }),
      })

      mockWebhook.verify.mockReturnValue({
        type: 'user.created',
        data: eventData,
      })

      vi.mocked(createUser).mockResolvedValue({
        id: 'internal-uuid-123',
        clerkId,
        email,
        firstName: 'John',
        lastName: 'Doe',
        imageUrl: 'https://example.com/image.jpg',
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      expect(createUser).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          clerkId,
          email,
          firstName: 'John',
          lastName: 'Doe',
          imageUrl: 'https://example.com/image.jpg',
        })
      )

      expect(logger.info).toHaveBeenCalledWith(
        'User created via webhook',
        expect.objectContaining({
          action: 'user_created',
          clerkId,
          email,
        })
      )
    })

    it('should return 500 if user creation fails', async () => {
      const clerkId = 'user_123'
      const eventData = {
        id: clerkId,
        email_addresses: [{ email_address: 'test@example.com' }],
      }

      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'svix-id': 'test-id',
          'svix-timestamp': 'test-timestamp',
          'svix-signature': 'test-signature',
        },
        body: JSON.stringify({
          type: 'user.created',
          data: eventData,
        }),
      })

      mockWebhook.verify.mockReturnValue({
        type: 'user.created',
        data: eventData,
      })

      vi.mocked(createUser).mockRejectedValue(new Error('Database error'))

      const response = await POST(request)
      expect(response.status).toBe(500)
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to create user via webhook',
        expect.any(Error),
        expect.objectContaining({ action: 'user_created', clerkId })
      )
    })
  })

  describe('user.updated event', () => {
    it('should update user by clerkId', async () => {
      const clerkId = 'user_123'
      const internalId = 'internal-uuid-123'
      const eventData = {
        id: clerkId,
        email_addresses: [{ email_address: 'updated@example.com' }],
        first_name: 'Jane',
        last_name: 'Smith',
        image_url: 'https://example.com/new-image.jpg',
      }

      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'svix-id': 'test-id',
          'svix-timestamp': 'test-timestamp',
          'svix-signature': 'test-signature',
        },
        body: JSON.stringify({
          type: 'user.updated',
          data: eventData,
        }),
      })

      mockWebhook.verify.mockReturnValue({
        type: 'user.updated',
        data: eventData,
      })

      vi.mocked(getUserByClerkId).mockResolvedValue({
        id: internalId,
        clerkId,
        email: 'test@example.com',
      })

      vi.mocked(updateUser).mockResolvedValue({
        id: internalId,
        clerkId,
        email: 'updated@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        imageUrl: 'https://example.com/new-image.jpg',
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      expect(getUserByClerkId).toHaveBeenCalledWith(clerkId)
      expect(updateUser).toHaveBeenCalledWith(
        expect.anything(),
        internalId,
        expect.objectContaining({
          email: 'updated@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          imageUrl: 'https://example.com/new-image.jpg',
        })
      )

      expect(logger.info).toHaveBeenCalledWith(
        'User updated via webhook',
        expect.objectContaining({
          action: 'user_updated',
          internalId,
          clerkId,
        })
      )
    })

    it('should return 404 if user not found', async () => {
      const clerkId = 'user_123'
      const eventData = {
        id: clerkId,
        email_addresses: [{ email_address: 'test@example.com' }],
      }

      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'svix-id': 'test-id',
          'svix-timestamp': 'test-timestamp',
          'svix-signature': 'test-signature',
        },
        body: JSON.stringify({
          type: 'user.updated',
          data: eventData,
        }),
      })

      mockWebhook.verify.mockReturnValue({
        type: 'user.updated',
        data: eventData,
      })

      vi.mocked(getUserByClerkId).mockResolvedValue(null)

      const response = await POST(request)
      expect(response.status).toBe(404)
      expect(logger.warn).toHaveBeenCalledWith(
        'User not found for update',
        expect.objectContaining({ action: 'user_updated', clerkId })
      )
    })
  })

  describe('user.deleted event', () => {
    it('should soft delete user by clerkId', async () => {
      const clerkId = 'user_123'
      const internalId = 'internal-uuid-123'
      const eventData = {
        id: clerkId,
      }

      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'svix-id': 'test-id',
          'svix-timestamp': 'test-timestamp',
          'svix-signature': 'test-signature',
        },
        body: JSON.stringify({
          type: 'user.deleted',
          data: eventData,
        }),
      })

      mockWebhook.verify.mockReturnValue({
        type: 'user.deleted',
        data: eventData,
      })

      vi.mocked(getUserByClerkId).mockResolvedValue({
        id: internalId,
        clerkId,
        email: 'test@example.com',
      })

      vi.mocked(deactivateUser).mockResolvedValue({
        id: internalId,
        clerkId,
        deletedAt: new Date(),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      expect(getUserByClerkId).toHaveBeenCalledWith(clerkId)
      expect(deactivateUser).toHaveBeenCalledWith(expect.anything(), internalId)

      expect(logger.info).toHaveBeenCalledWith(
        'User soft deleted via webhook',
        expect.objectContaining({
          action: 'user_deleted',
          internalId,
          clerkId,
        })
      )
    })

    it('should return 404 if user not found', async () => {
      const clerkId = 'user_123'
      const eventData = {
        id: clerkId,
      }

      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'svix-id': 'test-id',
          'svix-timestamp': 'test-timestamp',
          'svix-signature': 'test-signature',
        },
        body: JSON.stringify({
          type: 'user.deleted',
          data: eventData,
        }),
      })

      mockWebhook.verify.mockReturnValue({
        type: 'user.deleted',
        data: eventData,
      })

      vi.mocked(getUserByClerkId).mockResolvedValue(null)

      const response = await POST(request)
      expect(response.status).toBe(404)
      expect(logger.warn).toHaveBeenCalledWith(
        'User not found for deletion',
        expect.objectContaining({ action: 'user_deleted', clerkId })
      )
    })
  })

  describe('session.created event', () => {
    it('should record user login', async () => {
      const clerkId = 'user_123'
      const internalId = 'internal-uuid-123'
      const ipAddress = '192.168.1.1'
      const userAgent = 'Mozilla/5.0'
      const eventData = {
        id: 'session_123',
        user_id: clerkId,
        ip_address: ipAddress,
        user_agent: userAgent,
      }

      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'svix-id': 'test-id',
          'svix-timestamp': 'test-timestamp',
          'svix-signature': 'test-signature',
        },
        body: JSON.stringify({
          type: 'session.created',
          data: eventData,
        }),
      })

      mockWebhook.verify.mockReturnValue({
        type: 'session.created',
        data: eventData,
      })

      vi.mocked(getUserByClerkId).mockResolvedValue({
        id: internalId,
        clerkId,
        email: 'test@example.com',
      })

      vi.mocked(recordUserLogin).mockResolvedValue({
        id: internalId,
        clerkId,
        lastLoginAt: new Date(),
        loginCount: 1,
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      expect(getUserByClerkId).toHaveBeenCalledWith(clerkId)
      expect(recordUserLogin).toHaveBeenCalledWith(
        expect.anything(),
        internalId,
        ipAddress,
        userAgent
      )

      expect(logger.info).toHaveBeenCalledWith(
        'Session created via webhook',
        expect.objectContaining({
          action: 'session_created',
          internalId,
          clerkId,
          ipAddress,
        })
      )
    })

    it('should return 404 if user not found', async () => {
      const clerkId = 'user_123'
      const eventData = {
        id: 'session_123',
        user_id: clerkId,
      }

      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'svix-id': 'test-id',
          'svix-timestamp': 'test-timestamp',
          'svix-signature': 'test-signature',
        },
        body: JSON.stringify({
          type: 'session.created',
          data: eventData,
        }),
      })

      mockWebhook.verify.mockReturnValue({
        type: 'session.created',
        data: eventData,
      })

      vi.mocked(getUserByClerkId).mockResolvedValue(null)

      const response = await POST(request)
      expect(response.status).toBe(404)
      expect(logger.warn).toHaveBeenCalledWith(
        'User not found for session creation',
        expect.objectContaining({ action: 'session_created', clerkId })
      )
    })
  })

  describe('session.ended event', () => {
    it('should log session end', async () => {
      const clerkId = 'user_123'
      const internalId = 'internal-uuid-123'
      const eventData = {
        id: 'session_123',
        user_id: clerkId,
      }

      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'svix-id': 'test-id',
          'svix-timestamp': 'test-timestamp',
          'svix-signature': 'test-signature',
        },
        body: JSON.stringify({
          type: 'session.ended',
          data: eventData,
        }),
      })

      mockWebhook.verify.mockReturnValue({
        type: 'session.ended',
        data: eventData,
      })

      vi.mocked(getUserByClerkId).mockResolvedValue({
        id: internalId,
        clerkId,
        email: 'test@example.com',
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      expect(getUserByClerkId).toHaveBeenCalledWith(clerkId)

      expect(logger.info).toHaveBeenCalledWith(
        'Session ended via webhook',
        expect.objectContaining({
          action: 'session_ended',
          internalId,
          clerkId,
        })
      )
    })
  })

  describe('organizationMembership.created event', () => {
    it('should update user with organization ID', async () => {
      const clerkId = 'user_123'
      const internalId = 'internal-uuid-123'
      const orgId = 'org_123'
      const eventData = {
        id: 'membership_123',
        public_user_data: {
          user_id: clerkId,
        },
        organization: {
          id: orgId,
        },
      }

      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'svix-id': 'test-id',
          'svix-timestamp': 'test-timestamp',
          'svix-signature': 'test-signature',
        },
        body: JSON.stringify({
          type: 'organizationMembership.created',
          data: eventData,
        }),
      })

      mockWebhook.verify.mockReturnValue({
        type: 'organizationMembership.created',
        data: eventData,
      })

      vi.mocked(getUserByClerkId).mockResolvedValue({
        id: internalId,
        clerkId,
        email: 'test@example.com',
      })

      vi.mocked(updateUser).mockResolvedValue({
        id: internalId,
        clerkId,
        clerkOrgId: orgId,
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      expect(getUserByClerkId).toHaveBeenCalledWith(clerkId)
      expect(updateUser).toHaveBeenCalledWith(
        expect.anything(),
        internalId,
        expect.objectContaining({
          clerkOrgId: orgId,
        })
      )

      expect(logger.info).toHaveBeenCalledWith(
        'Organization membership created via webhook',
        expect.objectContaining({
          action: 'organization_membership_created',
          internalId,
          clerkId,
          clerkOrgId: orgId,
        })
      )
    })
  })

  describe('organizationMembership.updated event', () => {
    it('should update user with new organization ID', async () => {
      const clerkId = 'user_123'
      const internalId = 'internal-uuid-123'
      const orgId = 'org_456'
      const eventData = {
        id: 'membership_123',
        public_user_data: {
          user_id: clerkId,
        },
        organization: {
          id: orgId,
        },
      }

      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'svix-id': 'test-id',
          'svix-timestamp': 'test-timestamp',
          'svix-signature': 'test-signature',
        },
        body: JSON.stringify({
          type: 'organizationMembership.updated',
          data: eventData,
        }),
      })

      mockWebhook.verify.mockReturnValue({
        type: 'organizationMembership.updated',
        data: eventData,
      })

      vi.mocked(getUserByClerkId).mockResolvedValue({
        id: internalId,
        clerkId,
        email: 'test@example.com',
      })

      vi.mocked(updateUser).mockResolvedValue({
        id: internalId,
        clerkId,
        clerkOrgId: orgId,
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      expect(getUserByClerkId).toHaveBeenCalledWith(clerkId)
      expect(updateUser).toHaveBeenCalledWith(
        expect.anything(),
        internalId,
        expect.objectContaining({
          clerkOrgId: orgId,
        })
      )

      expect(logger.info).toHaveBeenCalledWith(
        'Organization membership updated via webhook',
        expect.objectContaining({
          action: 'organization_membership_updated',
          internalId,
          clerkId,
          clerkOrgId: orgId,
        })
      )
    })
  })

  describe('Logging', () => {
    it('should log all webhook events received', async () => {
      const eventData = {
        id: 'user_123',
        email_addresses: [{ email_address: 'test@example.com' }],
      }

      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'svix-id': 'test-id',
          'svix-timestamp': 'test-timestamp',
          'svix-signature': 'test-signature',
        },
        body: JSON.stringify({
          type: 'user.created',
          data: eventData,
        }),
      })

      mockWebhook.verify.mockReturnValue({
        type: 'user.created',
        data: eventData,
      })

      vi.mocked(createUser).mockResolvedValue({
        id: 'internal-uuid-123',
        clerkId: 'user_123',
        email: 'test@example.com',
      })

      await POST(request)

      expect(logger.info).toHaveBeenCalledWith(
        'Webhook event received',
        expect.objectContaining({
          action: 'webhook_received',
          eventType: 'user.created',
          eventId: 'user_123',
        })
      )
    })
  })
})
