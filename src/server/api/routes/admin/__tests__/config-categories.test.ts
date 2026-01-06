import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { configCategoryRoutes } from '../config-categories'
import { listConfigCategories, getCategoryByCode } from '@/server/db/queries/config'
import { hasPermission } from '@/lib/permissions'

// Mock database and query functions
vi.mock('@/server/db/queries/config', () => ({
  listConfigCategories: vi.fn(),
  getCategoryByCode: vi.fn(),
}))

vi.mock('@/lib/permissions', () => ({
  hasPermission: vi.fn(),
}))

describe('Config Category Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/admin/config/categories', () => {
    it('should return categories with permission', async () => {
      const mockCategories = [
        {
          id: '1',
          code: 'pension_type',
          name: 'Pension Type',
          description: 'Pension type categories',
          isActive: true,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(listConfigCategories).mockResolvedValue(mockCategories)

      const app = new Hono()
      app.route('/', configCategoryRoutes)

      const response = await app.request('/categories')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockCategories)
      expect(hasPermission).toHaveBeenCalledWith(expect.any(String), expect.any(String), 'config', 'read')
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', configCategoryRoutes)

      const response = await app.request('/categories')
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })

    it('should filter by isActive status', async () => {
      const mockCategories = [
        {
          id: '1',
          code: 'pension_type',
          name: 'Pension Type',
          description: 'Pension type categories',
          isActive: true,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(listConfigCategories).mockResolvedValue(mockCategories)

      const app = new Hono()
      app.route('/', configCategoryRoutes)

      const response = await app.request('/categories?isActive=true')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockCategories)
      expect(listConfigCategories).toHaveBeenCalledWith({ isActive: true })
    })
  })

  describe('GET /api/admin/config/categories/:code', () => {
    it('should return category by code with permission', async () => {
      const mockCategory = {
        id: '1',
        code: 'pension_type',
        name: 'Pension Type',
        description: 'Pension type categories',
        isActive: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getCategoryByCode).mockResolvedValue(mockCategory)

      const app = new Hono()
      app.route('/', configCategoryRoutes)

      const response = await app.request('/categories/pension_type')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockCategory)
      expect(getCategoryByCode).toHaveBeenCalledWith('pension_type')
    })

    it('should return 404 when category not found', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getCategoryByCode).mockResolvedValue(null)

      const app = new Hono()
      app.route('/', configCategoryRoutes)

      const response = await app.request('/categories/nonexistent')
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('NOT_FOUND')
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', configCategoryRoutes)

      const response = await app.request('/categories/pension_type')
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })
  })
})
