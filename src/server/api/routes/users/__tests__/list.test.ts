import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { userListRoutes } from '../list'
import { db } from '@/server/db'
import { getAllUsers } from '@/server/db/queries/users'

// Mock database and query functions
vi.mock('@/server/db', () => ({
  db: vi.fn(),
}))

vi.mock('@/server/db/queries/users', () => ({
  getAllUsers: vi.fn(),
}))

describe('User List Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/users', () => {
    it('should return paginated list of users', async () => {
      const mockUsers = [
        {
          id: '1',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(getAllUsers).mockResolvedValue(mockUsers)

      const app = new Hono()
      app.route('/', userListRoutes)

      const response = await app.request('/?page=1&pageSize=25')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockUsers)
      expect(json.meta).toEqual({
        page: 1,
        pageSize: 25,
        total: 1,
        totalPages: 1,
      })
      expect(getAllUsers).toHaveBeenCalledWith(db, 1, 25, { isActive: undefined, search: undefined })
    })

    it('should filter by active status', async () => {
      const mockUsers = [
        {
          id: '1',
          email: 'active@example.com',
          firstName: 'Active',
          lastName: 'User',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(getAllUsers).mockResolvedValue(mockUsers)

      const app = new Hono()
      app.route('/', userListRoutes)

      const response = await app.request('/?isActive=true')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(getAllUsers).toHaveBeenCalledWith(db, 1, 25, { isActive: true, search: undefined })
    })

    it('should search users by email, first name, or last name', async () => {
      const mockUsers = [
        {
          id: '1',
          email: 'search@example.com',
          firstName: 'Search',
          lastName: 'User',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(getAllUsers).mockResolvedValue(mockUsers)

      const app = new Hono()
      app.route('/', userListRoutes)

      const response = await app.request('/?search=search')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(getAllUsers).toHaveBeenCalledWith(db, 1, 25, { isActive: undefined, search: 'search' })
    })

    it('should return 500 on error', async () => {
      vi.mocked(getAllUsers).mockRejectedValue(new Error('Database error'))

      const app = new Hono()
      app.route('/', userListRoutes)

      const response = await app.request('/')
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.success).toBe(false)
      expect(json.error.message).toBe('Database error')
    })
  })
})
