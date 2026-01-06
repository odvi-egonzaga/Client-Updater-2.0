import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { areaRoutes } from '../areas'
import {
  listAreas,
  getAreaById,
  createArea,
  updateArea,
  deleteArea,
  getAreaOptions,
} from '@/server/db/queries/areas'
import { hasPermission } from '@/lib/permissions'

// Mock database and query functions
vi.mock('@/server/db/queries/areas', () => ({
  listAreas: vi.fn(),
  getAreaById: vi.fn(),
  createArea: vi.fn(),
  updateArea: vi.fn(),
  deleteArea: vi.fn(),
  getAreaOptions: vi.fn(),
}))

vi.mock('@/lib/permissions', () => ({
  hasPermission: vi.fn(),
}))

describe('Area Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/organization/areas', () => {
    it('should return paginated list of areas with permission', async () => {
      const mockAreas = [
        {
          id: '1',
          code: 'A001',
          name: 'Test Area',
          companyId: 'company1',
          isActive: true,
          sortOrder: 0,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: {
            branches: 5,
          },
        },
      ]

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(listAreas).mockResolvedValue({
        data: mockAreas,
        meta: {
          total: 1,
          page: 1,
          pageSize: 25,
          totalPages: 1,
        },
      })

      const app = new Hono()
      app.route('/', areaRoutes)

      const response = await app.request('/?page=1&pageSize=25')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockAreas)
      expect(json.meta).toEqual({
        page: 1,
        pageSize: 25,
        total: 1,
        totalPages: 1,
      })
      expect(hasPermission).toHaveBeenCalledWith(expect.any(String), expect.any(String), 'areas', 'read')
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', areaRoutes)

      const response = await app.request('/')
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })

    it('should return 500 on error', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(listAreas).mockRejectedValue(new Error('Database error'))

      const app = new Hono()
      app.route('/', areaRoutes)

      const response = await app.request('/')
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.success).toBe(false)
      expect(json.error.message).toBe('Database error')
    })
  })

  describe('GET /api/organization/areas/options', () => {
    it('should return area options with permission', async () => {
      const mockOptions = [
        {
          id: '1',
          code: 'A001',
          name: 'Test Area',
          companyId: 'company1',
        },
      ]

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getAreaOptions).mockResolvedValue(mockOptions)

      const app = new Hono()
      app.route('/', areaRoutes)

      const response = await app.request('/options')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockOptions)
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', areaRoutes)

      const response = await app.request('/options')
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })
  })

  describe('GET /api/organization/areas/:id', () => {
    it('should return area by ID with permission', async () => {
      const mockArea = {
        id: '1',
        code: 'A001',
        name: 'Test Area',
        companyId: 'company1',
        isActive: true,
        sortOrder: 0,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        branches: [],
      }

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getAreaById).mockResolvedValue(mockArea)

      const app = new Hono()
      app.route('/', areaRoutes)

      const response = await app.request('/1')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockArea)
    })

    it('should return 404 when area not found', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getAreaById).mockResolvedValue(null)

      const app = new Hono()
      app.route('/', areaRoutes)

      const response = await app.request('/1')
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('NOT_FOUND')
    })
  })

  describe('POST /api/organization/areas', () => {
    it('should create area with permission', async () => {
      const mockArea = {
        id: '1',
        code: 'A001',
        name: 'Test Area',
        companyId: 'company1',
        isActive: true,
        sortOrder: 0,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(createArea).mockResolvedValue(mockArea)

      const app = new Hono()
      app.route('/', areaRoutes)

      const response = await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: 'A001',
          name: 'Test Area',
          companyId: 'company1',
        }),
      })
      const json = await response.json()

      expect(response.status).toBe(201)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockArea)
      expect(createArea).toHaveBeenCalledWith({
        code: 'A001',
        name: 'Test Area',
        companyId: 'company1',
      })
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', areaRoutes)

      const response = await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: 'A001',
          name: 'Test Area',
          companyId: 'company1',
        }),
      })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })
  })

  describe('PATCH /api/organization/areas/:id', () => {
    it('should update area with permission', async () => {
      const mockArea = {
        id: '1',
        code: 'A001',
        name: 'Updated Area',
        companyId: 'company1',
        isActive: true,
        sortOrder: 0,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(updateArea).mockResolvedValue(mockArea)

      const app = new Hono()
      app.route('/', areaRoutes)

      const response = await app.request('/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Updated Area',
        }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockArea)
      expect(updateArea).toHaveBeenCalledWith('1', { name: 'Updated Area' })
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', areaRoutes)

      const response = await app.request('/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Updated Area',
        }),
      })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })
  })

  describe('DELETE /api/organization/areas/:id', () => {
    it('should delete area with permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(deleteArea).mockResolvedValue(undefined)

      const app = new Hono()
      app.route('/', areaRoutes)

      const response = await app.request('/1', {
        method: 'DELETE',
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toBeNull()
      expect(deleteArea).toHaveBeenCalledWith('1')
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', areaRoutes)

      const response = await app.request('/1', {
        method: 'DELETE',
      })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })
  })
})
