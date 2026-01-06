import { describe, it, expect, vi, beforeEach } from 'vitest'
import { clientListRoutes } from '../list'
import { db } from '@/server/db'
import { getClients, countClients } from '@/server/db/queries/clients'
import { getUserBranchFilter } from '@/lib/territories/filter'
import { hasPermission } from '@/lib/permissions'
import { createTestApp } from '@/test/utils/test-helpers'

// Mock database and query functions
vi.mock('@/server/db', () => ({
  db: vi.fn(),
}))

vi.mock('@/server/db/queries/clients', () => ({
  getClients: vi.fn(),
  countClients: vi.fn(),
}))

vi.mock('@/lib/territories/filter', () => ({
  getUserBranchFilter: vi.fn(),
}))

vi.mock('@/lib/permissions', () => ({
  hasPermission: vi.fn(),
}))

describe('Client List Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/clients', () => {
    it('should return paginated list of clients with permission', async () => {
      const mockClients = [
        {
          id: '1',
          clientCode: 'C001',
          fullName: 'Test Client',
          pensionNumber: 'P001',
          isActive: true,
          createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
        },
      ]

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getUserBranchFilter).mockResolvedValue({
        scope: 'all',
        branchIds: [],
      })
      vi.mocked(getClients).mockResolvedValue(mockClients)
      vi.mocked(countClients).mockResolvedValue(1)
 
      const app = createTestApp()
      app.route('/', clientListRoutes)

      const response = await app.request('/?page=1&pageSize=25')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockClients)
      expect(json.meta).toEqual({
        page: 1,
        pageSize: 25,
        total: 1,
        totalPages: 1,
      })
      expect(hasPermission).toHaveBeenCalledWith(expect.any(String), expect.any(String), 'clients', 'read')
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)
 
      const app = createTestApp()
      app.route('/', clientListRoutes)

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
 
      const app = createTestApp()
      app.route('/', clientListRoutes)

      const response = await app.request('/')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual([])
      expect(json.meta.total).toBe(0)
    })

    it('should filter by territory when user has territory access', async () => {
      const mockClients = [
        {
          id: '1',
          clientCode: 'C001',
          fullName: 'Test Client',
          pensionNumber: 'P001',
          isActive: true,
          createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
        },
      ]

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getUserBranchFilter).mockResolvedValue({
        scope: 'territory',
        branchIds: ['branch1', 'branch2'],
      })
      vi.mocked(getClients).mockResolvedValue(mockClients)
      vi.mocked(countClients).mockResolvedValue(1)
 
      const app = createTestApp()
      app.route('/', clientListRoutes)

      const response = await app.request('/')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(getClients).toHaveBeenCalledWith(
        db,
        1,
        25,
        expect.objectContaining({
          branchIds: ['branch1', 'branch2'],
        })
      )
    })

    it('should filter by pension type', async () => {
      const mockClients = []

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getUserBranchFilter).mockResolvedValue({
        scope: 'all',
        branchIds: [],
      })
      vi.mocked(getClients).mockResolvedValue(mockClients)
      vi.mocked(countClients).mockResolvedValue(0)
 
      const app = createTestApp()
      app.route('/', clientListRoutes)

      const response = await app.request('/?pensionTypeId=pt1')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(getClients).toHaveBeenCalledWith(
        db,
        1,
        25,
        expect.objectContaining({
          pensionTypeId: 'pt1',
        })
      )
    })

    it('should filter by active status', async () => {
      const mockClients = []

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getUserBranchFilter).mockResolvedValue({
        scope: 'all',
        branchIds: [],
      })
      vi.mocked(getClients).mockResolvedValue(mockClients)
      vi.mocked(countClients).mockResolvedValue(0)
 
      const app = createTestApp()
      app.route('/', clientListRoutes)

      const response = await app.request('/?isActive=true')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(getClients).toHaveBeenCalledWith(
        db,
        1,
        25,
        expect.objectContaining({
          isActive: true,
        })
      )
    })

    it('should search clients by code, name, or pension number', async () => {
      const mockClients = []

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getUserBranchFilter).mockResolvedValue({
        scope: 'all',
        branchIds: [],
      })
      vi.mocked(getClients).mockResolvedValue(mockClients)
      vi.mocked(countClients).mockResolvedValue(0)
 
      const app = createTestApp()
      app.route('/', clientListRoutes)

      const response = await app.request('/?search=test')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(getClients).toHaveBeenCalledWith(
        db,
        1,
        25,
        expect.objectContaining({
          search: 'test',
        })
      )
    })

    it('should return 500 on error', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getUserBranchFilter).mockResolvedValue({
        scope: 'all',
        branchIds: [],
      })
      vi.mocked(getClients).mockRejectedValue(new Error('Database error'))
 
      const app = createTestApp()
      app.route('/', clientListRoutes)

      const response = await app.request('/')
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.success).toBe(false)
      expect(json.error.message).toBe('Database error')
    })
  })
})
