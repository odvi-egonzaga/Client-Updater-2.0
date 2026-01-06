import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { branchRoutes } from '../branches'
import {
  listBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
  getBranchOptions,
  getBranchCategories,
} from '@/server/db/queries/branches'
import { hasPermission } from '@/lib/permissions'
import { getUserBranchFilter } from '@/lib/territories/filter'

// Mock database and query functions
vi.mock('@/server/db/queries/branches', () => ({
  listBranches: vi.fn(),
  getBranchById: vi.fn(),
  createBranch: vi.fn(),
  updateBranch: vi.fn(),
  deleteBranch: vi.fn(),
  getBranchOptions: vi.fn(),
  getBranchCategories: vi.fn(),
}))

vi.mock('@/lib/permissions', () => ({
  hasPermission: vi.fn(),
}))

vi.mock('@/lib/territories/filter', () => ({
  getUserBranchFilter: vi.fn(),
}))

describe('Branch Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/organization/branches', () => {
    it('should return paginated list of branches with permission', async () => {
      const mockBranches = [
        {
          id: '1',
          code: 'B001',
          name: 'Test Branch',
          location: 'Test Location',
          category: 'Test Category',
          isActive: true,
          sortOrder: 0,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          contacts: [],
          areas: [],
        },
      ]

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getUserBranchFilter).mockResolvedValue({
        scope: 'all',
        branchIds: [],
      })
      vi.mocked(listBranches).mockResolvedValue({
        data: mockBranches,
        meta: {
          total: 1,
          page: 1,
          pageSize: 25,
          totalPages: 1,
        },
      })

      const app = new Hono()
      app.route('/', branchRoutes)

      const response = await app.request('/?page=1&pageSize=25')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockBranches)
      expect(json.meta).toEqual({
        page: 1,
        pageSize: 25,
        total: 1,
        totalPages: 1,
      })
      expect(hasPermission).toHaveBeenCalledWith(expect.any(String), expect.any(String), 'branches', 'read')
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', branchRoutes)

      const response = await app.request('/')
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })

    it('should return empty list when user has no territory access', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getUserBranchFilter).mockResolvedValue({
        scope: 'none',
        branchIds: [],
      })

      const app = new Hono()
      app.route('/', branchRoutes)

      const response = await app.request('/')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual([])
      expect(json.meta.total).toBe(0)
    })

    it('should filter by territory when user has territory access', async () => {
      const mockBranches = [
        {
          id: '1',
          code: 'B001',
          name: 'Test Branch',
          location: 'Test Location',
          category: 'Test Category',
          isActive: true,
          sortOrder: 0,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          contacts: [],
          areas: [],
        },
      ]

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getUserBranchFilter).mockResolvedValue({
        scope: 'territory',
        branchIds: ['1'],
      })
      vi.mocked(listBranches).mockResolvedValue({
        data: mockBranches,
        meta: {
          total: 1,
          page: 1,
          pageSize: 25,
          totalPages: 1,
        },
      })

      const app = new Hono()
      app.route('/', branchRoutes)

      const response = await app.request('/')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockBranches)
    })

    it('should return 500 on error', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getUserBranchFilter).mockResolvedValue({
        scope: 'all',
        branchIds: [],
      })
      vi.mocked(listBranches).mockRejectedValue(new Error('Database error'))

      const app = new Hono()
      app.route('/', branchRoutes)

      const response = await app.request('/')
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.success).toBe(false)
      expect(json.error.message).toBe('Database error')
    })
  })

  describe('GET /api/organization/branches/options', () => {
    it('should return branch options with permission', async () => {
      const mockOptions = [
        {
          id: '1',
          code: 'B001',
          name: 'Test Branch',
          location: 'Test Location',
        },
      ]

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getUserBranchFilter).mockResolvedValue({
        scope: 'all',
        branchIds: [],
      })
      vi.mocked(getBranchOptions).mockResolvedValue(mockOptions)

      const app = new Hono()
      app.route('/', branchRoutes)

      const response = await app.request('/options')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockOptions)
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', branchRoutes)

      const response = await app.request('/options')
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })
  })

  describe('GET /api/organization/branches/categories', () => {
    it('should return branch categories with permission', async () => {
      const mockCategories = ['Category 1', 'Category 2']

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getBranchCategories).mockResolvedValue(mockCategories)

      const app = new Hono()
      app.route('/', branchRoutes)

      const response = await app.request('/categories')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockCategories)
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', branchRoutes)

      const response = await app.request('/categories')
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })
  })

  describe('GET /api/organization/branches/:id', () => {
    it('should return branch by ID with permission', async () => {
      const mockBranch = {
        id: '1',
        code: 'B001',
        name: 'Test Branch',
        location: 'Test Location',
        category: 'Test Category',
        isActive: true,
        sortOrder: 0,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        contacts: [],
        areas: [],
      }

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getUserBranchFilter).mockResolvedValue({
        scope: 'all',
        branchIds: [],
      })
      vi.mocked(getBranchById).mockResolvedValue(mockBranch)

      const app = new Hono()
      app.route('/', branchRoutes)

      const response = await app.request('/1')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockBranch)
    })

    it('should return 404 when branch not found', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getUserBranchFilter).mockResolvedValue({
        scope: 'all',
        branchIds: [],
      })
      vi.mocked(getBranchById).mockResolvedValue(null)

      const app = new Hono()
      app.route('/', branchRoutes)

      const response = await app.request('/1')
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('NOT_FOUND')
    })
  })

  describe('POST /api/organization/branches', () => {
    it('should create branch with permission', async () => {
      const mockBranch = {
        id: '1',
        code: 'B001',
        name: 'Test Branch',
        location: 'Test Location',
        category: 'Test Category',
        isActive: true,
        sortOrder: 0,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(createBranch).mockResolvedValue(mockBranch)

      const app = new Hono()
      app.route('/', branchRoutes)

      const response = await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: 'B001',
          name: 'Test Branch',
          location: 'Test Location',
          category: 'Test Category',
        }),
      })
      const json = await response.json()

      expect(response.status).toBe(201)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockBranch)
      expect(createBranch).toHaveBeenCalledWith({
        code: 'B001',
        name: 'Test Branch',
        location: 'Test Location',
        category: 'Test Category',
      })
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', branchRoutes)

      const response = await app.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: 'B001',
          name: 'Test Branch',
        }),
      })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })
  })

  describe('PATCH /api/organization/branches/:id', () => {
    it('should update branch with permission', async () => {
      const mockBranch = {
        id: '1',
        code: 'B001',
        name: 'Updated Branch',
        location: 'Test Location',
        category: 'Test Category',
        isActive: true,
        sortOrder: 0,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getUserBranchFilter).mockResolvedValue({
        scope: 'all',
        branchIds: [],
      })
      vi.mocked(updateBranch).mockResolvedValue(mockBranch)

      const app = new Hono()
      app.route('/', branchRoutes)

      const response = await app.request('/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Updated Branch',
        }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockBranch)
      expect(updateBranch).toHaveBeenCalledWith('1', { name: 'Updated Branch' })
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', branchRoutes)

      const response = await app.request('/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Updated Branch',
        }),
      })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })
  })

  describe('DELETE /api/organization/branches/:id', () => {
    it('should delete branch with permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getUserBranchFilter).mockResolvedValue({
        scope: 'all',
        branchIds: [],
      })
      vi.mocked(deleteBranch).mockResolvedValue(undefined)

      const app = new Hono()
      app.route('/', branchRoutes)

      const response = await app.request('/1', {
        method: 'DELETE',
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toBeNull()
      expect(deleteBranch).toHaveBeenCalledWith('1')
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', branchRoutes)

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
