import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { areaBranchRoutes } from '../area-branches'
import {
  getBranchesForArea,
  assignBranchesToArea,
  removeBranchFromArea,
  setPrimaryBranch,
} from '@/server/db/queries/area-branches'
import { hasPermission } from '@/lib/permissions'

// Mock database and query functions
vi.mock('@/server/db/queries/area-branches', () => ({
  getBranchesForArea: vi.fn(),
  assignBranchesToArea: vi.fn(),
  removeBranchFromArea: vi.fn(),
  setPrimaryBranch: vi.fn(),
}))

vi.mock('@/lib/permissions', () => ({
  hasPermission: vi.fn(),
}))

describe('Area-Branch Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/organization/areas/:areaId/branches', () => {
    it('should return branches for area with permission', async () => {
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
        },
      ]

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getBranchesForArea).mockResolvedValue(mockBranches)

      const app = new Hono()
      app.route('/', areaBranchRoutes)

      const response = await app.request('/area1/branches')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockBranches)
      expect(hasPermission).toHaveBeenCalledWith(expect.any(String), expect.any(String), 'areas', 'read')
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', areaBranchRoutes)

      const response = await app.request('/area1/branches')
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })

    it('should return 404 when area not found', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getBranchesForArea).mockRejectedValue(new Error('Area not found'))

      const app = new Hono()
      app.route('/', areaBranchRoutes)

      const response = await app.request('/area1/branches')
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('NOT_FOUND')
    })
  })

  describe('POST /api/organization/areas/:areaId/branches', () => {
    it('should assign branches to area with permission', async () => {
      const mockAssignments = [
        {
          id: '1',
          areaId: 'area1',
          branchId: 'branch1',
          isPrimary: false,
          assignedAt: new Date(),
        },
      ]

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(assignBranchesToArea).mockResolvedValue(mockAssignments)

      const app = new Hono()
      app.route('/', areaBranchRoutes)

      const response = await app.request('/area1/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchIds: ['branch1', 'branch2'],
          replaceExisting: false,
        }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockAssignments)
      expect(assignBranchesToArea).toHaveBeenCalledWith({
        areaId: 'area1',
        branchIds: ['branch1', 'branch2'],
        replaceExisting: false,
      })
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', areaBranchRoutes)

      const response = await app.request('/area1/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchIds: ['branch1'],
        }),
      })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })
  })

  describe('DELETE /api/organization/areas/:areaId/branches/:branchId', () => {
    it('should remove branch from area with permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(removeBranchFromArea).mockResolvedValue(undefined)

      const app = new Hono()
      app.route('/', areaBranchRoutes)

      const response = await app.request('/area1/branches/branch1', {
        method: 'DELETE',
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toBeNull()
      expect(removeBranchFromArea).toHaveBeenCalledWith({
        areaId: 'area1',
        branchId: 'branch1',
      })
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', areaBranchRoutes)

      const response = await app.request('/area1/branches/branch1', {
        method: 'DELETE',
      })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })
  })

  describe('POST /api/organization/areas/:areaId/branches/:branchId/primary', () => {
    it('should set primary branch with permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(setPrimaryBranch).mockResolvedValue(undefined)

      const app = new Hono()
      app.route('/', areaBranchRoutes)

      const response = await app.request('/area1/branches/branch1/primary', {
        method: 'POST',
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toBeNull()
      expect(setPrimaryBranch).toHaveBeenCalledWith({
        areaId: 'area1',
        branchId: 'branch1',
      })
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', areaBranchRoutes)

      const response = await app.request('/area1/branches/branch1/primary', {
        method: 'POST',
      })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })
  })
})
