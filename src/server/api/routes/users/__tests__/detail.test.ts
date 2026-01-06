import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { userDetailRoutes } from '../detail'
import { db } from '@/server/db'
import { getUserWithPermissions } from '@/server/db/queries/users'

// Mock database and query functions
vi.mock('@/server/db', () => ({
  db: vi.fn(),
}))

vi.mock('@/server/db/queries/users', () => ({
  getUserWithPermissions: vi.fn(),
}))

describe('User Detail Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/users/:id', () => {
    it('should return user details with permissions', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        permissions: [
          {
            permission: { id: '1', resource: 'users', action: 'read' },
            scope: 'self',
          },
        ],
        areas: [],
        branches: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      vi.mocked(getUserWithPermissions).mockResolvedValue(mockUser)

      const app = new Hono()
      app.route('/', userDetailRoutes)

      const response = await app.request('/1')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockUser)
      // Dates are JSON-serialized as ISO strings
      expect(json.data.createdAt).toBe(mockUser.createdAt)
      expect(json.data.updatedAt).toBe(mockUser.updatedAt)
      expect(getUserWithPermissions).toHaveBeenCalledWith(db, '1')
    })

    it('should return 404 when user not found', async () => {
      vi.mocked(getUserWithPermissions).mockResolvedValue(null)

      const app = new Hono()
      app.route('/', userDetailRoutes)

      const response = await app.request('/nonexistent')
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.success).toBe(false)
      expect(json.error.message).toBe('User not found')
    })

    it('should return 500 on error', async () => {
      vi.mocked(getUserWithPermissions).mockRejectedValue(new Error('Database error'))

      const app = new Hono()
      app.route('/', userDetailRoutes)

      const response = await app.request('/1')
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.success).toBe(false)
      expect(json.error.message).toBe('Database error')
    })
  })
})
