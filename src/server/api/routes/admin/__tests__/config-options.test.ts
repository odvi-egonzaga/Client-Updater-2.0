import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { configOptionRoutes } from '../config-options'
import {
  listConfigOptions,
  getConfigOptionById,
  createConfigOption,
  updateConfigOption,
} from '@/server/db/queries/config'
import { hasPermission } from '@/lib/permissions'

// Mock database and query functions
vi.mock('@/server/db/queries/config', () => ({
  listConfigOptions: vi.fn(),
  getConfigOptionById: vi.fn(),
  createConfigOption: vi.fn(),
  updateConfigOption: vi.fn(),
}))

vi.mock('@/lib/permissions', () => ({
  hasPermission: vi.fn(),
}))

describe('Config Option Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/admin/config/options', () => {
    it('should return options with permission', async () => {
      const mockOptions = [
        {
          id: '1',
          categoryId: 'cat1',
          code: 'pension_type_1',
          label: 'Pension Type 1',
          value: 'type1',
          metadata: null,
          isDefault: false,
          isSystem: false,
          isActive: true,
          sortOrder: 0,
          parentOptionId: null,
          companyId: null,
          createdBy: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(listConfigOptions).mockResolvedValue(mockOptions)

      const app = new Hono()
      app.route('/', configOptionRoutes)

      const response = await app.request('/options')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockOptions)
      expect(hasPermission).toHaveBeenCalledWith(expect.any(String), expect.any(String), 'config', 'read')
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', configOptionRoutes)

      const response = await app.request('/options')
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })

    it('should filter by categoryId', async () => {
      const mockOptions = []

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(listConfigOptions).mockResolvedValue(mockOptions)

      const app = new Hono()
      app.route('/', configOptionRoutes)

      const response = await app.request('/options?categoryId=cat1')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(listConfigOptions).toHaveBeenCalledWith({
        categoryId: 'cat1',
        isActive: undefined,
        includeInactive: false,
      })
    })
  })

  describe('GET /api/admin/config/options/:id', () => {
    it('should return option by ID with permission', async () => {
      const mockOption = {
        id: '1',
        categoryId: 'cat1',
        code: 'pension_type_1',
        label: 'Pension Type 1',
        value: 'type1',
        metadata: null,
        isDefault: false,
        isSystem: false,
        isActive: true,
        sortOrder: 0,
        parentOptionId: null,
        companyId: null,
        createdBy: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getConfigOptionById).mockResolvedValue(mockOption)

      const app = new Hono()
      app.route('/', configOptionRoutes)

      const response = await app.request('/options/1')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockOption)
      expect(getConfigOptionById).toHaveBeenCalledWith('1')
    })

    it('should return 404 when option not found', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getConfigOptionById).mockResolvedValue(null)

      const app = new Hono()
      app.route('/', configOptionRoutes)

      const response = await app.request('/options/1')
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('NOT_FOUND')
    })
  })

  describe('POST /api/admin/config/options', () => {
    it('should create option with permission', async () => {
      const mockOption = {
        id: '1',
        categoryId: 'cat1',
        code: 'pension_type_1',
        label: 'Pension Type 1',
        value: 'type1',
        metadata: null,
        isDefault: false,
        isSystem: false,
        isActive: true,
        sortOrder: 0,
        parentOptionId: null,
        companyId: null,
        createdBy: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(createConfigOption).mockResolvedValue(mockOption)

      const app = new Hono()
      app.route('/', configOptionRoutes)

      const response = await app.request('/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: 'cat1',
          code: 'pension_type_1',
          label: 'Pension Type 1',
          value: 'type1',
        }),
      })
      const json = await response.json()

      expect(response.status).toBe(201)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockOption)
      expect(createConfigOption).toHaveBeenCalledWith({
        categoryId: 'cat1',
        code: 'pension_type_1',
        label: 'Pension Type 1',
        value: 'type1',
        createdBy: 'user1',
      })
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', configOptionRoutes)

      const response = await app.request('/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: 'cat1',
          code: 'pension_type_1',
          label: 'Pension Type 1',
        }),
      })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })
  })

  describe('PATCH /api/admin/config/options/:id', () => {
    it('should update non-system option with permission', async () => {
      const mockOption = {
        id: '1',
        categoryId: 'cat1',
        code: 'pension_type_1',
        label: 'Updated Label',
        value: 'type1',
        metadata: null,
        isDefault: false,
        isSystem: false,
        isActive: true,
        sortOrder: 0,
        parentOptionId: null,
        companyId: null,
        createdBy: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockExisting = {
        id: '1',
        categoryId: 'cat1',
        code: 'pension_type_1',
        label: 'Pension Type 1',
        value: 'type1',
        metadata: null,
        isDefault: false,
        isSystem: false,
        isActive: true,
        sortOrder: 0,
        parentOptionId: null,
        companyId: null,
        createdBy: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getConfigOptionById).mockResolvedValue(mockExisting)
      vi.mocked(updateConfigOption).mockResolvedValue(mockOption)

      const app = new Hono()
      app.route('/', configOptionRoutes)

      const response = await app.request('/options/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: 'Updated Label',
        }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockOption)
      expect(updateConfigOption).toHaveBeenCalledWith('1', { label: 'Updated Label' })
    })

    it('should restrict updates to system options', async () => {
      const mockOption = {
        id: '1',
        categoryId: 'cat1',
        code: 'pension_type_1',
        label: 'Pension Type 1',
        value: 'type1',
        metadata: null,
        isDefault: false,
        isSystem: true,
        isActive: true,
        sortOrder: 0,
        parentOptionId: null,
        companyId: null,
        createdBy: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockExisting = {
        id: '1',
        categoryId: 'cat1',
        code: 'pension_type_1',
        label: 'Pension Type 1',
        value: 'type1',
        metadata: null,
        isDefault: false,
        isSystem: true,
        isActive: true,
        sortOrder: 0,
        parentOptionId: null,
        companyId: null,
        createdBy: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getConfigOptionById).mockResolvedValue(mockExisting)
      vi.mocked(updateConfigOption).mockResolvedValue(mockOption)

      const app = new Hono()
      app.route('/', configOptionRoutes)

      const response = await app.request('/options/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: 'Updated Label',
        }),
      })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
      expect(json.error.message).toContain('Cannot modify system option fields')
    })

    it('should allow updating allowed fields on system options', async () => {
      const mockOption = {
        id: '1',
        categoryId: 'cat1',
        code: 'pension_type_1',
        label: 'Pension Type 1',
        value: 'updated_value',
        metadata: null,
        isDefault: false,
        isSystem: true,
        isActive: true,
        sortOrder: 1,
        parentOptionId: null,
        companyId: null,
        createdBy: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockExisting = {
        id: '1',
        categoryId: 'cat1',
        code: 'pension_type_1',
        label: 'Pension Type 1',
        value: 'type1',
        metadata: null,
        isDefault: false,
        isSystem: true,
        isActive: true,
        sortOrder: 0,
        parentOptionId: null,
        companyId: null,
        createdBy: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getConfigOptionById).mockResolvedValue(mockExisting)
      vi.mocked(updateConfigOption).mockResolvedValue(mockOption)

      const app = new Hono()
      app.route('/', configOptionRoutes)

      const response = await app.request('/options/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: 'updated_value',
          isActive: true,
          sortOrder: 1,
        }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockOption)
      expect(updateConfigOption).toHaveBeenCalledWith('1', {
        value: 'updated_value',
        isActive: true,
        sortOrder: 1,
      })
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', configOptionRoutes)

      const response = await app.request('/options/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: 'Updated Label',
        }),
      })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })
  })

  describe('DELETE /api/admin/config/options/:id', () => {
    it('should delete non-system option with permission', async () => {
      const mockExisting = {
        id: '1',
        categoryId: 'cat1',
        code: 'pension_type_1',
        label: 'Pension Type 1',
        value: 'type1',
        metadata: null,
        isDefault: false,
        isSystem: false,
        isActive: true,
        sortOrder: 0,
        parentOptionId: null,
        companyId: null,
        createdBy: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getConfigOptionById).mockResolvedValue(mockExisting)

      const app = new Hono()
      app.route('/', configOptionRoutes)

      const response = await app.request('/options/1', {
        method: 'DELETE',
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toBeNull()
    })

    it('should prevent deleting system options', async () => {
      const mockExisting = {
        id: '1',
        categoryId: 'cat1',
        code: 'pension_type_1',
        label: 'Pension Type 1',
        value: 'type1',
        metadata: null,
        isDefault: false,
        isSystem: true,
        isActive: true,
        sortOrder: 0,
        parentOptionId: null,
        companyId: null,
        createdBy: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getConfigOptionById).mockResolvedValue(mockExisting)

      const app = new Hono()
      app.route('/', configOptionRoutes)

      const response = await app.request('/options/1', {
        method: 'DELETE',
      })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
      expect(json.error.message).toBe('Cannot delete system options')
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', configOptionRoutes)

      const response = await app.request('/options/1', {
        method: 'DELETE',
      })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })
  })
})
