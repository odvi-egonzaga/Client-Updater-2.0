import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as areaBranchQueries from '../area-branches'
import { areas, branches, areaBranches } from '../../schema/organization'
import { eq, and, isNull, inArray, not } from 'drizzle-orm'

// Mock database
vi.mock('../../index', () => {
  const mockSelect = vi.fn()
  const mockInsert = vi.fn()
  const mockUpdate = vi.fn()
  const mockDelete = vi.fn()

  return {
    db: {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    },
  }
})

// Mock logger
vi.mock('@/lib/logger/index', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import { db } from '../../index'

describe('Area-Branch Assignment Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getBranchesForArea', () => {
    it('should return all branches for an area', async () => {
      const mockArea = { id: '1', code: 'A001', name: 'Area 1', companyId: 'comp1', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() }
      const mockBranchAssignments = [
        { branch: { id: 'b1', code: 'B001', name: 'Branch 1', location: 'Location 1', category: 'Category 1', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() }, isPrimary: true, assignedAt: new Date() },
        { branch: { id: 'b2', code: 'B002', name: 'Branch 2', location: 'Location 2', category: 'Category 2', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() }, isPrimary: false, assignedAt: new Date() },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([mockArea])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const mockFrom2 = vi.fn().mockReturnThis()
      const mockInnerJoin = vi.fn().mockReturnThis()
      const mockWhere2 = vi.fn().mockResolvedValue(mockBranchAssignments)

      vi.mocked(db.select).mockReturnValueOnce({
        from: mockFrom2,
        innerJoin: mockInnerJoin,
        where: mockWhere2,
      })

      const result = await areaBranchQueries.getBranchesForArea('1')

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('b1')
    })

    it('should throw error if area not found', async () => {
      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      await expect(areaBranchQueries.getBranchesForArea('nonexistent')).rejects.toThrow('Area with ID "nonexistent" not found')
    })
  })

  describe('getAreasForBranch', () => {
    it('should return all areas for a branch', async () => {
      const mockBranch = { id: 'b1', code: 'B001', name: 'Branch 1', location: 'Location 1', category: 'Category 1', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() }
      const mockAreaAssignments = [
        { area: { id: '1', code: 'A001', name: 'Area 1', companyId: 'comp1', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() }, isPrimary: true, assignedAt: new Date() },
        { area: { id: '2', code: 'A002', name: 'Area 2', companyId: 'comp1', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() }, isPrimary: false, assignedAt: new Date() },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([mockBranch])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const mockFrom2 = vi.fn().mockReturnThis()
      const mockInnerJoin = vi.fn().mockReturnThis()
      const mockWhere2 = vi.fn().mockResolvedValue(mockAreaAssignments)

      vi.mocked(db.select).mockReturnValueOnce({
        from: mockFrom2,
        innerJoin: mockInnerJoin,
        where: mockWhere2,
      })

      const result = await areaBranchQueries.getAreasForBranch('b1')

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('1')
    })

    it('should throw error if branch not found', async () => {
      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      await expect(areaBranchQueries.getAreasForBranch('nonexistent')).rejects.toThrow('Branch with ID "nonexistent" not found')
    })
  })

  describe('assignBranchesToArea', () => {
    it('should assign branches to area', async () => {
      const mockArea = { id: '1', code: 'A001', name: 'Area 1', companyId: 'comp1', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() }
      const mockBranches = [
        { id: 'b1', code: 'B001', name: 'Branch 1', location: 'Location 1', category: 'Category 1', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 'b2', code: 'B002', name: 'Branch 2', location: 'Location 2', category: 'Category 2', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([mockArea])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const mockFrom2 = vi.fn().mockReturnThis()
      const mockWhere2 = vi.fn().mockResolvedValue(mockBranches)

      vi.mocked(db.select).mockReturnValueOnce({
        from: mockFrom2,
        where: mockWhere2,
      })

      const mockFrom3 = vi.fn().mockReturnThis()
      const mockWhere3 = vi.fn().mockReturnThis()
      const mockLimit3 = vi.fn().mockResolvedValue([])

      vi.mocked(db.select).mockReturnValueOnce({
        from: mockFrom3,
        where: mockWhere3,
        limit: mockLimit3,
      })

      const mockValues = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue([{ id: 'ab1', areaId: '1', branchId: 'b1', isPrimary: false, assignedAt: new Date() }])

      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
        returning: mockReturning,
      })

      const result = await areaBranchQueries.assignBranchesToArea({
        areaId: '1',
        branchIds: ['b1', 'b2'],
      })

      expect(result).toHaveLength(2)
    })

    it('should replace existing assignments when replaceExisting is true', async () => {
      const mockArea = { id: '1', code: 'A001', name: 'Area 1', companyId: 'comp1', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() }
      const mockBranches = [
        { id: 'b1', code: 'B001', name: 'Branch 1', location: 'Location 1', category: 'Category 1', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([mockArea])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const mockFrom2 = vi.fn().mockReturnThis()
      const mockWhere2 = vi.fn().mockResolvedValue(mockBranches)

      vi.mocked(db.select).mockReturnValueOnce({
        from: mockFrom2,
        where: mockWhere2,
      })

      const mockWhere3 = vi.fn().mockResolvedValue()

      vi.mocked(db.delete).mockReturnValue({
        where: mockWhere3,
      })

      const mockFrom4 = vi.fn().mockReturnThis()
      const mockWhere4 = vi.fn().mockReturnThis()
      const mockLimit4 = vi.fn().mockResolvedValue([])

      vi.mocked(db.select).mockReturnValueOnce({
        from: mockFrom4,
        where: mockWhere4,
        limit: mockLimit4,
      })

      const mockValues = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue([{ id: 'ab1', areaId: '1', branchId: 'b1', isPrimary: false, assignedAt: new Date() }])

      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
        returning: mockReturning,
      })

      const result = await areaBranchQueries.assignBranchesToArea({
        areaId: '1',
        branchIds: ['b1'],
        replaceExisting: true,
      })

      expect(result).toHaveLength(1)
      expect(mockWhere3).toHaveBeenCalled()
    })

    it('should throw error if area not found', async () => {
      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      await expect(areaBranchQueries.assignBranchesToArea({
        areaId: 'nonexistent',
        branchIds: ['b1'],
      })).rejects.toThrow('Area with ID "nonexistent" not found')
    })

    it('should throw error if one or more branches not found', async () => {
      const mockArea = { id: '1', code: 'A001', name: 'Area 1', companyId: 'comp1', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() }
      const mockBranches = [
        { id: 'b1', code: 'B001', name: 'Branch 1', location: 'Location 1', category: 'Category 1', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([mockArea])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const mockFrom2 = vi.fn().mockReturnThis()
      const mockWhere2 = vi.fn().mockResolvedValue(mockBranches)

      vi.mocked(db.select).mockReturnValueOnce({
        from: mockFrom2,
        where: mockWhere2,
      })

      await expect(areaBranchQueries.assignBranchesToArea({
        areaId: '1',
        branchIds: ['b1', 'b2'],
      })).rejects.toThrow('One or more branches not found or deleted')
    })
  })

  describe('removeBranchFromArea', () => {
    it('should remove branch from area', async () => {
      const mockAssignment = { id: 'ab1', areaId: '1', branchId: 'b1', isPrimary: false, assignedAt: new Date() }

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([mockAssignment])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const mockWhere2 = vi.fn().mockResolvedValue()

      vi.mocked(db.delete).mockReturnValue({
        where: mockWhere2,
      })

      await expect(areaBranchQueries.removeBranchFromArea({
        areaId: '1',
        branchId: 'b1',
      })).resolves.not.toThrow()
    })

    it('should throw error if assignment not found', async () => {
      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      await expect(areaBranchQueries.removeBranchFromArea({
        areaId: '1',
        branchId: 'b1',
      })).rejects.toThrow('Assignment not found for area "1" and branch "b1"')
    })
  })

  describe('setPrimaryBranch', () => {
    it('should set primary branch for area', async () => {
      const mockArea = { id: '1', code: 'A001', name: 'Area 1', companyId: 'comp1', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() }
      const mockAssignment = { id: 'ab1', areaId: '1', branchId: 'b1', isPrimary: false, assignedAt: new Date() }

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([mockArea])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const mockFrom2 = vi.fn().mockReturnThis()
      const mockWhere2 = vi.fn().mockReturnThis()
      const mockLimit2 = vi.fn().mockResolvedValue([mockAssignment])

      vi.mocked(db.select).mockReturnValueOnce({
        from: mockFrom2,
        where: mockWhere2,
        limit: mockLimit2,
      })

      const mockSet = vi.fn().mockReturnThis()
      const mockWhere3 = vi.fn().mockResolvedValue()

      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
        where: mockWhere3,
      })

      await expect(areaBranchQueries.setPrimaryBranch({
        areaId: '1',
        branchId: 'b1',
      })).resolves.not.toThrow()
    })

    it('should throw error if area not found', async () => {
      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      await expect(areaBranchQueries.setPrimaryBranch({
        areaId: 'nonexistent',
        branchId: 'b1',
      })).rejects.toThrow('Area with ID "nonexistent" not found')
    })

    it('should throw error if branch not assigned to area', async () => {
      const mockArea = { id: '1', code: 'A001', name: 'Area 1', companyId: 'comp1', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() }

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([mockArea])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const mockFrom2 = vi.fn().mockReturnThis()
      const mockWhere2 = vi.fn().mockReturnThis()
      const mockLimit2 = vi.fn().mockResolvedValue([])

      vi.mocked(db.select).mockReturnValueOnce({
        from: mockFrom2,
        where: mockWhere2,
        limit: mockLimit2,
      })

      await expect(areaBranchQueries.setPrimaryBranch({
        areaId: '1',
        branchId: 'b1',
      })).rejects.toThrow('Branch "b1" is not assigned to area "1"')
    })
  })

  describe('getUnassignedBranches', () => {
    it('should return branches not in any area', async () => {
      const mockAllBranches = [
        { id: 'b1', code: 'B001', name: 'Branch 1', location: 'Location 1', category: 'Category 1', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 'b2', code: 'B002', name: 'Branch 2', location: 'Location 2', category: 'Category 2', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() },
      ]

      const mockAssignedBranches = [
        { branchId: 'b1' },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockResolvedValue(mockAllBranches)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
      })

      const mockFrom2 = vi.fn().mockReturnThis()
      const mockDistinct = vi.fn().mockReturnThis()
      const mockWhere2 = vi.fn().mockResolvedValue(mockAssignedBranches)

      vi.mocked(db.select).mockReturnValueOnce({
        from: mockFrom2,
        distinct: mockDistinct,
        where: mockWhere2,
      })

      const result = await areaBranchQueries.getUnassignedBranches()

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('b2')
    })

    it('should filter by company when provided', async () => {
      const mockAllBranches = [
        { id: 'b1', code: 'B001', name: 'Branch 1', location: 'Location 1', category: 'Category 1', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() },
      { id: 'b2', code: 'B002', name: 'Branch 2', location: 'Location 2', category: 'Category 2', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() },
      ]

      const mockAssignedBranches = [
        { branchId: 'b1' },
      ]

      const mockBranchIdsInCompany = [
        { branchId: 'b1' },
        { branchId: 'b2' },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockResolvedValue(mockAllBranches)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
      })

      const mockFrom2 = vi.fn().mockReturnThis()
      const mockDistinct = vi.fn().mockReturnThis()
      const mockWhere2 = vi.fn().mockResolvedValue(mockAssignedBranches)

      vi.mocked(db.select).mockReturnValueOnce({
        from: mockFrom2,
        distinct: mockDistinct,
        where: mockWhere2,
      })

      const mockFrom3 = vi.fn().mockReturnThis()
      const mockDistinct2 = vi.fn().mockReturnThis()
      const mockInnerJoin = vi.fn().mockReturnThis()
      const mockWhere3 = vi.fn().mockResolvedValue(mockBranchIdsInCompany)

      vi.mocked(db.select).mockReturnValueOnce({
        from: mockFrom3,
        distinct: mockDistinct2,
        innerJoin: mockInnerJoin,
        where: mockWhere3,
      })

      const result = await areaBranchQueries.getUnassignedBranches('comp1')

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('b2')
    })
  })
})
