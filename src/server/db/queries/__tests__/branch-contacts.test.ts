import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as branchContactQueries from '../branch-contacts'
import { branches, branchContacts } from '../../schema/organization'
import { eq, and, isNull } from 'drizzle-orm'

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

describe('Branch Contact Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getContactsForBranch', () => {
    it('should return all contacts for a branch', async () => {
      const mockBranch = { id: 'b1', code: 'B001', name: 'Branch 1', location: 'Location 1', category: 'Category 1', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() }
      const mockContacts = [
        { id: 'c1', branchId: 'b1', type: 'phone', label: 'Office', value: '123-456-7890', isPrimary: true, createdAt: new Date(), updatedAt: new Date() },
        { id: 'c2', branchId: 'b1', type: 'email', label: 'Work', value: 'test@example.com', isPrimary: true, createdAt: new Date(), updatedAt: new Date() },
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

      const result = await branchContactQueries.getContactsForBranch('b1')

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('c1')
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

      await expect(branchContactQueries.getContactsForBranch('nonexistent')).rejects.toThrow('Branch with ID "nonexistent" not found')
    })
  })

  describe('addBranchContact', () => {
    it('should add contact to branch', async () => {
      const mockBranch = { id: 'b1', code: 'B001', name: 'Branch 1', location: 'Location 1', category: 'Category 1', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() }
      const contactData = {
        branchId: 'b1',
        type: 'phone',
        label: 'Office',
        value: '123-456-7890',
        isPrimary: false,
      }

      const mockContact = { id: 'c1', ...contactData, createdAt: new Date(), updatedAt: new Date() }

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([mockBranch])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const mockValues = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue([mockContact])

      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
        returning: mockReturning,
      })

      const result = await branchContactQueries.addBranchContact(contactData)

      expect(result).toEqual(mockContact)
    })

    it('should clear existing primary of same type when setting as primary', async () => {
      const mockBranch = { id: 'b1', code: 'B001', name: 'Branch 1', location: 'Location 1', category: 'Category 1', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() }
      const contactData = {
        branchId: 'b1',
        type: 'phone',
        label: 'Office',
        value: '123-456-7890',
        isPrimary: true,
      }

      const mockContact = { id: 'c1', ...contactData, createdAt: new Date(), updatedAt: new Date() }

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([mockBranch])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const mockSet = vi.fn().mockReturnThis()
      const mockWhere2 = vi.fn().mockResolvedValue()

      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
        where: mockWhere2,
      })

      const mockValues = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue([mockContact])

      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
        returning: mockReturning,
      })

      const result = await branchContactQueries.addBranchContact(contactData)

      expect(result).toEqual(mockContact)
      expect(mockSet).toHaveBeenCalled()
    })

    it('should throw error if branch not found', async () => {
      const contactData = {
        branchId: 'nonexistent',
        type: 'phone',
        label: 'Office',
        value: '123-456-7890',
      }

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      await expect(branchContactQueries.addBranchContact(contactData)).rejects.toThrow('Branch with ID "nonexistent" not found')
    })
  })

  describe('updateBranchContact', () => {
    it('should update contact', async () => {
      const mockContact = { id: 'c1', branchId: 'b1', type: 'phone', label: 'Office', value: '123-456-7890', isPrimary: false, createdAt: new Date(), updatedAt: new Date() }
      const updateData = {
        value: '987-654-3210',
      }

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([mockContact])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const mockSet = vi.fn().mockReturnThis()
      const mockWhere2 = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue([{ ...mockContact, ...updateData }])

      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
        where: mockWhere2,
        returning: mockReturning,
      })

      const result = await branchContactQueries.updateBranchContact('c1', updateData)

      expect(result.value).toBe('987-654-3210')
    })

    it('should clear existing primary of same type when setting as primary', async () => {
      const mockContact = { id: 'c1', branchId: 'b1', type: 'phone', label: 'Office', value: '123-456-7890', isPrimary: false, createdAt: new Date(), updatedAt: new Date() }
      const updateData = {
        isPrimary: true,
      }

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([mockContact])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const mockSet = vi.fn().mockReturnThis()
      const mockWhere2 = vi.fn().mockResolvedValue()

      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
        where: mockWhere2,
      })

      const mockSet2 = vi.fn().mockReturnThis()
      const mockWhere3 = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue([{ ...mockContact, ...updateData }])

      vi.mocked(db.update).mockReturnValueOnce({
        set: mockSet2,
        where: mockWhere3,
        returning: mockReturning,
      })

      const result = await branchContactQueries.updateBranchContact('c1', updateData)

      expect(result.isPrimary).toBe(true)
      expect(mockSet).toHaveBeenCalled()
    })

    it('should throw error if contact not found', async () => {
      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      await expect(branchContactQueries.updateBranchContact('nonexistent', { value: '123' })).rejects.toThrow('Contact with ID "nonexistent" not found')
    })
  })

  describe('deleteBranchContact', () => {
    it('should delete contact', async () => {
      const mockContact = { id: 'c1', branchId: 'b1', type: 'phone', label: 'Office', value: '123-456-7890', isPrimary: false, createdAt: new Date(), updatedAt: new Date() }

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([mockContact])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const mockWhere2 = vi.fn().mockResolvedValue()

      vi.mocked(db.delete).mockReturnValue({
        where: mockWhere2,
      })

      await expect(branchContactQueries.deleteBranchContact('c1')).resolves.not.toThrow()
    })

    it('should throw error if contact not found', async () => {
      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      await expect(branchContactQueries.deleteBranchContact('nonexistent')).rejects.toThrow('Contact with ID "nonexistent" not found')
    })
  })

  describe('setPrimaryContact', () => {
    it('should set primary contact for branch', async () => {
      const mockBranch = { id: 'b1', code: 'B001', name: 'Branch 1', location: 'Location 1', category: 'Category 1', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() }
      const mockContact = { id: 'c1', branchId: 'b1', type: 'phone', label: 'Office', value: '123-456-7890', isPrimary: false, createdAt: new Date(), updatedAt: new Date() }

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([mockBranch])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const mockFrom2 = vi.fn().mockReturnThis()
      const mockWhere2 = vi.fn().mockReturnThis()
      const mockLimit2 = vi.fn().mockResolvedValue([mockContact])

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

      await expect(branchContactQueries.setPrimaryContact({
        branchId: 'b1',
        contactId: 'c1',
      })).resolves.not.toThrow()
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

      await expect(branchContactQueries.setPrimaryContact({
        branchId: 'nonexistent',
        contactId: 'c1',
      })).rejects.toThrow('Branch with ID "nonexistent" not found')
    })

    it('should throw error if contact not found for branch', async () => {
      const mockBranch = { id: 'b1', code: 'B001', name: 'Branch 1', location: 'Location 1', category: 'Category 1', isActive: true, sortOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() }

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([mockBranch])

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

      await expect(branchContactQueries.setPrimaryContact({
        branchId: 'b1',
        contactId: 'nonexistent',
      })).rejects.toThrow('Contact with ID "nonexistent" not found for branch "b1"')
    })
  })
})
