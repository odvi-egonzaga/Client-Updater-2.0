import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as branchQueries from '../branches'
import { branches, branchContacts, areaBranches, areas } from '../../schema/organization'
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

describe('Branch Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('listBranches', () => {
    it('should return paginated branches with default parameters', async () => {
      const mockBranches = [
        { id: '1', code: 'B001', name: 'Branch 1', location: 'Location 1', category: 'Category 1', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() },
        { id: '2', code: 'B002', name: 'Branch 2', location: 'Location 2', category: 'Category 2', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockReturnThis()
      const mockOffset = vi.fn().mockResolvedValue(mockBranches)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
      })

      const result = await branchQueries.listBranches({})

      expect(result.data).toHaveLength(2)
      expect(result.meta.total).toBeDefined()
      expect(result.meta.page).toBe(1)
      expect(result.meta.pageSize).toBe(25)
    })

    it('should apply search filter when provided', async () => {
      const mockBranches = [
        { id: '1', code: 'B001', name: 'Branch 1', location: 'Location 1', category: 'Category 1', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockReturnThis()
      const mockOffset = vi.fn().mockResolvedValue(mockBranches)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
      })

      await branchQueries.listBranches({ search: 'Branch 1' })

      expect(mockWhere).toHaveBeenCalled()
    })

    it('should apply category filter when provided', async () => {
      const mockBranches = [
        { id: '1', code: 'B001', name: 'Branch 1', location: 'Location 1', category: 'Category 1', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockReturnThis()
      const mockOffset = vi.fn().mockResolvedValue(mockBranches)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
      })

      await branchQueries.listBranches({ category: 'Category 1' })

      expect(mockWhere).toHaveBeenCalled()
    })

    it('should apply isActive filter when provided', async () => {
      const mockBranches = [
        { id: '1', code: 'B001', name: 'Branch 1', location: 'Location 1', category: 'Category 1', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockReturnThis()
      const mockOffset = vi.fn().mockResolvedValue(mockBranches)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
      })

      await branchQueries.listBranches({ isActive: true })

      expect(mockWhere).toHaveBeenCalled()
    })
  })

  describe('getBranchById', () => {
    it('should return branch by ID with contacts and areas', async () => {
      const mockBranch = { id: '1', code: 'B001', name: 'Branch 1', location: 'Location 1', category: 'Category 1', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() }
      const mockContacts = [
        { id: 'c1', branchId: '1', type: 'phone', label: 'Office', value: '123-456-7890', isPrimary: true, createdAt: new Date(), updatedAt: new Date() },
      ]
      const mockAreaAssignments = [
        { area: { id: 'a1', code: 'A001', name: 'Area 1', companyId: 'comp1', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() } },
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
      const mockWhere2 = vi.fn().mockResolvedValue(mockContacts)

      vi.mocked(db.select).mockReturnValueOnce({
        from: mockFrom2,
        where: mockWhere2,
      })

      const mockFrom3 = vi.fn().mockReturnThis()
      const mockInnerJoin = vi.fn().mockReturnThis()
      const mockWhere3 = vi.fn().mockResolvedValue(mockAreaAssignments)

      vi.mocked(db.select).mockReturnValueOnce({
        from: mockFrom3,
        innerJoin: mockInnerJoin,
        where: mockWhere3,
      })

      const result = await branchQueries.getBranchById('1')

      expect(result).toBeDefined()
      expect(result?.id).toBe('1')
      expect(result?.contacts).toHaveLength(1)
      expect(result?.areas).toHaveLength(1)
    })

    it('should return null if branch not found', async () => {
      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const result = await branchQueries.getBranchById('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('getBranchByCode', () => {
    it('should return branch by code', async () => {
      const mockBranch = { id: '1', code: 'B001', name: 'Branch 1', location: 'Location 1', category: 'Category 1', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() }

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([mockBranch])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const result = await branchQueries.getBranchByCode('B001')

      expect(result).toEqual(mockBranch)
    })

    it('should return null if branch code not found', async () => {
      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const result = await branchQueries.getBranchByCode('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('createBranch', () => {
    it('should create new branch', async () => {
      const branchData = {
        code: 'B001',
        name: 'Branch 1',
        location: 'Location 1',
        category: 'Category 1',
      }

      const mockBranch = { id: '1', ...branchData, isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() }

      const mockValues = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue([mockBranch])

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

      const result = await branchQueries.createBranch(branchData)

      expect(result).toEqual(mockBranch)
    })

    it('should throw error if branch code already exists', async () => {
      const branchData = {
        code: 'B001',
        name: 'Branch 1',
      }

      const mockBranch = { id: '1', code: 'B001', name: 'Branch 1', location: null, category: null, isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() }

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([mockBranch])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      await expect(branchQueries.createBranch(branchData)).rejects.toThrow('Branch with code "B001" already exists')
    })
  })

  describe('updateBranch', () => {
    it('should update branch', async () => {
      const updateData = {
        name: 'Updated Branch 1',
      }

      const mockBranch = { id: '1', code: 'B001', name: 'Updated Branch 1', location: 'Location 1', category: 'Category 1', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() }

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([mockBranch])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const mockSet = vi.fn().mockReturnThis()
      const mockWhere2 = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue([mockBranch])

      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
        where: mockWhere2,
        returning: mockReturning,
      })

      const result = await branchQueries.updateBranch('1', updateData)

      expect(result).toEqual(mockBranch)
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

      await expect(branchQueries.updateBranch('nonexistent', { name: 'Updated' })).rejects.toThrow('Branch with ID "nonexistent" not found')
    })
  })

  describe('deleteBranch', () => {
    it('should soft delete branch', async () => {
      const mockBranch = { id: '1', code: 'B001', name: 'Branch 1', location: 'Location 1', category: 'Category 1', isActive: true, sortOrder: 0, deletedAt: new Date(), createdAt: new Date(), updatedAt: new Date() }

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([mockBranch])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const mockSet = vi.fn().mockReturnThis()
      const mockWhere2 = vi.fn().mockResolvedValue([mockBranch])

      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
        where: mockWhere2,
      })

      await expect(branchQueries.deleteBranch('1')).resolves.not.toThrow()
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

      await expect(branchQueries.deleteBranch('nonexistent')).rejects.toThrow('Branch with ID "nonexistent" not found')
    })
  })

  describe('getBranchOptions', () => {
    it('should return minimal branch data for dropdowns', async () => {
      const mockBranches = [
        { id: '1', code: 'B001', name: 'Branch 1', location: 'Location 1' },
        { id: '2', code: 'B002', name: 'Branch 2', location: 'Location 2' },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockResolvedValue(mockBranches)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
      })

      const result = await branchQueries.getBranchOptions()

      expect(result).toHaveLength(2)
      expect(result[0]).toHaveProperty('id')
      expect(result[0]).toHaveProperty('code')
      expect(result[0]).toHaveProperty('name')
    })

    it('should filter by areaId when provided', async () => {
      const mockBranches = [
        { id: '1', code: 'B001', name: 'Branch 1', location: 'Location 1' },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockInnerJoin = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockResolvedValue(mockBranches)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        innerJoin: mockInnerJoin,
        where: mockWhere,
        orderBy: mockOrderBy,
      })

      const result = await branchQueries.getBranchOptions({ areaId: 'area1' })

      expect(result).toHaveLength(1)
      expect(mockInnerJoin).toHaveBeenCalled()
    })
  })

  describe('getBranchCategories', () => {
    it('should return distinct categories', async () => {
      const mockCategories = [
        { category: 'Category 1' },
        { category: 'Category 2' },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockResolvedValue(mockCategories)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
      })

      const result = await branchQueries.getBranchCategories()

      expect(result).toHaveLength(2)
      expect(result).toContain('Category 1')
      expect(result).toContain('Category 2')
    })
  })
})
