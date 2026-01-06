import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as areaQueries from '../areas'
import { areas, areaBranches, branches, companies } from '../../schema/organization'
import { eq, and, isNull, desc, sql, or, like, inArray } from 'drizzle-orm'

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

describe('Area Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('listAreas', () => {
    it('should return paginated areas with default parameters', async () => {
      const mockAreas = [
        { id: '1', code: 'A001', name: 'Area 1', companyId: 'comp1', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() },
        { id: '2', code: 'A002', name: 'Area 2', companyId: 'comp1', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockLeftJoin = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockGroupBy = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockReturnThis()
      const mockOffset = vi.fn().mockResolvedValue(mockAreas)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        leftJoin: mockLeftJoin,
        where: mockWhere,
        groupBy: mockGroupBy,
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
      })

      const result = await areaQueries.listAreas({})

      expect(result.data).toHaveLength(2)
      expect(result.meta.total).toBeDefined()
      expect(result.meta.page).toBe(1)
      expect(result.meta.pageSize).toBe(25)
    })

    it('should apply search filter when provided', async () => {
      const mockAreas = [
        { id: '1', code: 'A001', name: 'Area 1', companyId: 'comp1', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockLeftJoin = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockGroupBy = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockReturnThis()
      const mockOffset = vi.fn().mockResolvedValue(mockAreas)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        leftJoin: mockLeftJoin,
        where: mockWhere,
        groupBy: mockGroupBy,
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
      })

      await areaQueries.listAreas({ search: 'Area 1' })

      expect(mockWhere).toHaveBeenCalled()
    })

    it('should apply companyId filter when provided', async () => {
      const mockAreas = [
        { id: '1', code: 'A001', name: 'Area 1', companyId: 'comp1', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockLeftJoin = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockGroupBy = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockReturnThis()
      const mockOffset = vi.fn().mockResolvedValue(mockAreas)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        leftJoin: mockLeftJoin,
        where: mockWhere,
        groupBy: mockGroupBy,
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
      })

      await areaQueries.listAreas({ companyId: 'comp1' })

      expect(mockWhere).toHaveBeenCalled()
    })

    it('should apply isActive filter when provided', async () => {
      const mockAreas = [
        { id: '1', code: 'A001', name: 'Area 1', companyId: 'comp1', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockLeftJoin = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockGroupBy = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockReturnThis()
      const mockOffset = vi.fn().mockResolvedValue(mockAreas)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        leftJoin: mockLeftJoin,
        where: mockWhere,
        groupBy: mockGroupBy,
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
      })

      await areaQueries.listAreas({ isActive: true })

      expect(mockWhere).toHaveBeenCalled()
    })
  })

  describe('getAreaById', () => {
    it('should return area by ID with branches', async () => {
      const mockArea = { id: '1', code: 'A001', name: 'Area 1', companyId: 'comp1', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() }
      const mockBranchAssignments = [
        { branch: { id: 'b1', code: 'B001', name: 'Branch 1', location: 'Location 1', category: 'Category 1', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() }, isPrimary: true, assignedAt: new Date() },
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

      const result = await areaQueries.getAreaById('1')

      expect(result).toBeDefined()
      expect(result?.id).toBe('1')
      expect(result?.branches).toHaveLength(1)
    })

    it('should return null if area not found', async () => {
      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const result = await areaQueries.getAreaById('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('createArea', () => {
    it('should create new area', async () => {
      const areaData = {
        code: 'A001',
        name: 'Area 1',
        companyId: 'comp1',
      }

      const mockArea = { id: '1', ...areaData, isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() }

      const mockValues = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue([mockArea])

      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
        returning: mockReturning,
      })

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const mockFrom2 = vi.fn().mockReturnThis()
      const mockWhere2 = vi.fn().mockReturnThis()
      const mockLimit2 = vi.fn().mockResolvedValue([{ id: 'comp1', code: 'COMP1', name: 'Company 1' }])

      vi.mocked(db.select).mockReturnValueOnce({
        from: mockFrom2,
        where: mockWhere2,
        limit: mockLimit2,
      })

      const result = await areaQueries.createArea(areaData)

      expect(result).toEqual(mockArea)
    })

    it('should throw error if area code already exists', async () => {
      const areaData = {
        code: 'A001',
        name: 'Area 1',
        companyId: 'comp1',
      }

      const mockArea = { id: '1', code: 'A001', name: 'Area 1', companyId: 'comp1', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() }

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([mockArea])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      await expect(areaQueries.createArea(areaData)).rejects.toThrow('Area with code "A001" already exists')
    })

    it('should throw error if company not found', async () => {
      const areaData = {
        code: 'A001',
        name: 'Area 1',
        companyId: 'comp1',
      }

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([])

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

      await expect(areaQueries.createArea(areaData)).rejects.toThrow('Company with ID "comp1" not found')
    })
  })

  describe('updateArea', () => {
    it('should update area', async () => {
      const updateData = {
        name: 'Updated Area 1',
      }

      const mockArea = { id: '1', code: 'A001', name: 'Updated Area 1', companyId: 'comp1', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() }

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([mockArea])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const mockSet = vi.fn().mockReturnThis()
      const mockWhere2 = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue([mockArea])

      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
        where: mockWhere2,
        returning: mockReturning,
      })

      const result = await areaQueries.updateArea('1', updateData)

      expect(result).toEqual(mockArea)
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

      await expect(areaQueries.updateArea('nonexistent', { name: 'Updated' })).rejects.toThrow('Area with ID "nonexistent" not found')
    })
  })

  describe('deleteArea', () => {
    it('should soft delete area', async () => {
      const mockArea = { id: '1', code: 'A001', name: 'Area 1', companyId: 'comp1', isActive: true, sortOrder: 0, deletedAt: new Date(), createdAt: new Date(), updatedAt: new Date() }

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([mockArea])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const mockSet = vi.fn().mockReturnThis()
      const mockWhere2 = vi.fn().mockResolvedValue([mockArea])

      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
        where: mockWhere2,
      })

      await expect(areaQueries.deleteArea('1')).resolves.not.toThrow()
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

      await expect(areaQueries.deleteArea('nonexistent')).rejects.toThrow('Area with ID "nonexistent" not found')
    })
  })

  describe('getAreaOptions', () => {
    it('should return minimal area data for dropdowns', async () => {
      const mockAreas = [
        { id: '1', code: 'A001', name: 'Area 1', companyId: 'comp1' },
        { id: '2', code: 'A002', name: 'Area 2', companyId: 'comp1' },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockResolvedValue(mockAreas)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
      })

      const result = await areaQueries.getAreaOptions()

      expect(result).toHaveLength(2)
      expect(result[0]).toHaveProperty('id')
      expect(result[0]).toHaveProperty('code')
      expect(result[0]).toHaveProperty('name')
    })

    it('should filter by companyId when provided', async () => {
      const mockAreas = [
        { id: '1', code: 'A001', name: 'Area 1', companyId: 'comp1' },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockResolvedValue(mockAreas)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
      })

      const result = await areaQueries.getAreaOptions({ companyId: 'comp1' })

      expect(result).toHaveLength(1)
    })

    it('should filter by isActive when provided', async () => {
      const mockAreas = [
        { id: '1', code: 'A001', name: 'Area 1', companyId: 'comp1' },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockResolvedValue(mockAreas)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
      })

      const result = await areaQueries.getAreaOptions({ isActive: true })

      expect(result).toHaveLength(1)
    })
  })
})
