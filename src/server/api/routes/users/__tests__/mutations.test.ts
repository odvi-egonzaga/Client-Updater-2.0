import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { userMutationRoutes } from '../mutations'
import { db } from '@/server/db'
import { createUser, updateUser, toggleUserStatus } from '@/server/db/queries/users'

// Mock database and query functions
vi.mock('@/server/db', () => ({
  db: vi.fn(),
}))

vi.mock('@/server/db/queries/users', () => ({
  createUser: vi.fn(),
  updateUser: vi.fn(),
  toggleUserStatus: vi.fn(),
}))

describe('User Mutation Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const newUser = {
        id: '1',
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
        imageUrl: 'https://example.com/avatar.jpg',
        clerkUserId: 'clerk_123',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(createUser).mockResolvedValue(newUser)

      const app = new Hono()
      app.route('/', userMutationRoutes)

      const response = await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'new@example.com',
          firstName: 'New',
          lastName: 'User',
          imageUrl: 'https://example.com/avatar.jpg',
          clerkUserId: 'clerk_123',
        }),
      })

      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(newUser)
      expect(createUser).toHaveBeenCalledWith(db, expect.objectContaining({
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
      }))
    })

    it('should return 500 on error', async () => {
      vi.mocked(createUser).mockRejectedValue(new Error('Database error'))

      const app = new Hono()
      app.route('/', userMutationRoutes)

      const response = await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'new@example.com',
          firstName: 'New',
          lastName: 'User',
        }),
      })

      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.success).toBe(false)
      expect(json.error.message).toBe('Database error')
    })
  })

  describe('PATCH /api/users/:id', () => {
    it('should update user fields', async () => {
      const updatedUser = {
        id: '1',
        email: 'updated@example.com',
        firstName: 'Updated',
        lastName: 'User',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(updateUser).mockResolvedValue(updatedUser)

      const app = new Hono()
      app.route('/', userMutationRoutes)

      const response = await app.request('/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'updated@example.com',
          firstName: 'Updated',
        }),
      })

      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(updatedUser)
      expect(updateUser).toHaveBeenCalledWith(db, '1', expect.objectContaining({
        email: 'updated@example.com',
        firstName: 'Updated',
      }))
    })

    it('should return 404 when user not found', async () => {
      vi.mocked(updateUser).mockResolvedValue(null)

      const app = new Hono()
      app.route('/', userMutationRoutes)

      const response = await app.request('/nonexistent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: 'Updated' }),
      })

      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.success).toBe(false)
      expect(json.error.message).toBe('User not found')
    })
  })

  describe('PATCH /api/users/:id/status', () => {
    it('should toggle user status', async () => {
      const updatedUser = {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(toggleUserStatus).mockResolvedValue(updatedUser)

      const app = new Hono()
      app.route('/', userMutationRoutes)

      const response = await app.request('/1/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      })

      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(updatedUser)
      expect(toggleUserStatus).toHaveBeenCalledWith(db, '1', false)
    })

    it('should return 404 when user not found', async () => {
      vi.mocked(toggleUserStatus).mockResolvedValue(null)

      const app = new Hono()
      app.route('/', userMutationRoutes)

      const response = await app.request('/nonexistent/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      })

      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.success).toBe(false)
      expect(json.error.message).toBe('User not found')
    })
  })
})
