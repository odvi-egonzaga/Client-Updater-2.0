import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { userPermissionsRoutes } from '../permissions'
import { db } from '@/server/db'
import { getUserPermissions, setUserPermissions } from '@/server/db/queries/permissions'

// Mock database and query functions
vi.mock('@/server/db', () => ({
  db: vi.fn(),
}))

vi.mock('@/server/db/queries/permissions', () => ({
  getUserPermissions: vi.fn(),
  setUserPermissions: vi.fn(),
}))

describe('User Permissions Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/users/:id/permissions', () => {
    it('should return user permissions', async () => {
      const mockPermissions = [
        {
          permission: { id: '1', resource: 'users', action: 'read' },
          scope: 'self',
          companyId: 'company_1',
        },
      ]

      vi.mocked(getUserPermissions).mockResolvedValue(mockPermissions)

      const app = new Hono()
      app.route('/', userPermissionsRoutes)

      const response = await app.request('/1/permissions')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockPermissions)
      expect(getUserPermissions).toHaveBeenCalledWith(db, '1', undefined)
    })

    it('should filter by company ID', async () => {
      const mockPermissions = [
        {
          permission: { id: '1', resource: 'users', action: 'read' },
          scope: 'self',
          companyId: 'company_1',
        },
      ]

      vi.mocked(getUserPermissions).mockResolvedValue(mockPermissions)

      const app = new Hono()
      app.route('/', userPermissionsRoutes)

      const response = await app.request('/1/permissions?companyId=company_1')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(getUserPermissions).toHaveBeenCalledWith(db, '1', 'company_1')
    })

    it('should return 500 on error', async () => {
      vi.mocked(getUserPermissions).mockRejectedValue(new Error('Database error'))

      const app = new Hono()
      app.route('/', userPermissionsRoutes)

      const response = await app.request('/1/permissions')
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.success).toBe(false)
      expect(json.error.message).toBe('Database error')
    })
  })

  describe('PUT /api/users/:id/permissions', () => {
    it('should set user permissions', async () => {
      const newPermissions = [
        {
          id: '1',
          userId: '1',
          permissionId: 'perm_1',
          companyId: 'company_1',
          scope: 'self',
        },
      ]

      vi.mocked(setUserPermissions).mockResolvedValue(newPermissions)

      const app = new Hono()
      app.route('/', userPermissionsRoutes)

      const response = await app.request('/1/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permissions: [
            {
              permissionId: 'perm_1',
              companyId: 'company_1',
              scope: 'self',
            },
          ],
        }),
      })

      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(newPermissions)
      expect(setUserPermissions).toHaveBeenCalledWith(db, '1', [
        {
          permissionId: 'perm_1',
          companyId: 'company_1',
          scope: 'self',
        },
      ])
    })

    it('should return 500 on error', async () => {
      vi.mocked(setUserPermissions).mockRejectedValue(new Error('Database error'))

      const app = new Hono()
      app.route('/', userPermissionsRoutes)

      const response = await app.request('/1/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permissions: [
            {
              permissionId: 'perm_1',
              companyId: 'company_1',
              scope: 'self',
            },
          ],
        }),
      })

      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.success).toBe(false)
      expect(json.error.message).toBe('Database error')
    })
  })
})
