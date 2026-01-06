import { describe, it, expect, vi, beforeEach } from 'vitest'
import { seedLookups } from '../lookups'

// Mock database
vi.mock('@/server/db/index', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
  },
}))

import { db } from '@/server/db/index'

describe('Seed Lookups', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('seedLookups', () => {
    it('seeds companies', async () => {
      const mockCompanies = [
        { id: 'fcash-id', code: 'FCASH', name: 'FCASH', isSystem: true },
        { id: 'pcni-id', code: 'PCNI', name: 'PCNI', isSystem: true },
      ]

      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        onConflictDoNothing: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue(mockCompanies),
      }

      ;(db.insert as any).mockReturnValue(mockInsert)

      await seedLookups()

      expect(db.insert).toHaveBeenCalledWith(expect.anything())
      expect(mockInsert.values).toHaveBeenCalledWith([
        { code: 'FCASH', name: 'FCASH', isSystem: true },
        { code: 'PCNI', name: 'PCNI', isSystem: true },
      ])
      expect(mockInsert.onConflictDoNothing).toHaveBeenCalled()
      expect(mockInsert.returning).toHaveBeenCalled()
    })

    it('seeds pension types', async () => {
      const mockCompanies = [
        { id: 'fcash-id', code: 'FCASH', name: 'FCASH', isSystem: true },
        { id: 'pcni-id', code: 'PCNI', name: 'PCNI', isSystem: true },
      ]

      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        onConflictDoNothing: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue(mockCompanies),
      }

      const mockInsertPension = {
        values: vi.fn().mockReturnThis(),
        onConflictDoNothing: vi.fn().mockReturnThis(),
      }

      ;(db.insert as any)
        .mockReturnValueOnce(mockInsert)
        .mockReturnValueOnce(mockInsertPension)

      await seedLookups()

      expect(mockInsertPension.values).toHaveBeenCalledWith([
        { code: 'SSS', name: 'SSS', companyId: 'fcash-id', isSystem: true },
        { code: 'GSIS', name: 'GSIS', companyId: 'fcash-id', isSystem: true },
        { code: 'PVAO', name: 'PVAO', companyId: 'fcash-id', isSystem: true },
        { code: 'NON_PNP', name: 'Non-PNP', companyId: 'pcni-id', isSystem: true },
        { code: 'PNP', name: 'PNP', companyId: 'pcni-id', isSystem: true },
      ])
      expect(mockInsertPension.onConflictDoNothing).toHaveBeenCalled()
    })

    it('seeds pensioner types', async () => {
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        onConflictDoNothing: vi.fn().mockReturnThis(),
      }

      ;(db.insert as any).mockReturnValue(mockInsert)

      await seedLookups()

      expect(mockInsert.values).toHaveBeenCalledWith([
        { code: 'DEPENDENT', name: 'Dependent', isSystem: true },
        { code: 'DISABILITY', name: 'Disability', isSystem: true },
        { code: 'RETIREE', name: 'Retiree', isSystem: true },
        { code: 'ITF', name: 'ITF', isSystem: true },
      ])
      expect(mockInsert.onConflictDoNothing).toHaveBeenCalled()
    })

    it('seeds account types', async () => {
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        onConflictDoNothing: vi.fn().mockReturnThis(),
      }

      ;(db.insert as any).mockReturnValue(mockInsert)

      await seedLookups()

      expect(mockInsert.values).toHaveBeenCalledWith([
        { code: 'PASSBOOK', name: 'Passbook', isSystem: true, sortOrder: 1 },
        { code: 'ATM', name: 'ATM', isSystem: true, sortOrder: 2 },
        { code: 'BOTH', name: 'Both', isSystem: true, sortOrder: 3 },
        { code: 'NONE', name: 'None', isSystem: true, sortOrder: 4 },
      ])
      expect(mockInsert.onConflictDoNothing).toHaveBeenCalled()
    })

    it('seeds PAR statuses', async () => {
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        onConflictDoNothing: vi.fn().mockReturnThis(),
      }

      ;(db.insert as any).mockReturnValue(mockInsert)

      await seedLookups()

      expect(mockInsert.values).toHaveBeenCalledWith([
        { code: 'do_not_show', name: 'Current', isTrackable: true, isSystem: true, sortOrder: 1 },
        { code: 'tele_130', name: '30+ Days', isTrackable: true, isSystem: true, sortOrder: 2 },
        { code: 'tele_hardcore', name: '60+ Days', isTrackable: false, isSystem: true, sortOrder: 3 },
      ])
      expect(mockInsert.onConflictDoNothing).toHaveBeenCalled()
    })

    it('seeds status types', async () => {
      const mockCompanies = [
        { id: 'fcash-id', code: 'FCASH', name: 'FCASH', isSystem: true },
        { id: 'pcni-id', code: 'PCNI', name: 'PCNI', isSystem: true },
      ]

      const mockStatusTypes = [
        { id: 'status-id', code: 'DONE', name: 'Done', sequence: 6, isSystem: true },
      ]

      const mockInsertCompanies = {
        values: vi.fn().mockReturnThis(),
        onConflictDoNothing: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue(mockCompanies),
      }

      const mockInsertStatusTypes = {
        values: vi.fn().mockReturnThis(),
        onConflictDoNothing: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue(mockStatusTypes),
      }

      ;(db.insert as any)
        .mockReturnValueOnce(mockInsertCompanies)
        .mockReturnValueOnce(mockInsertStatusTypes)

      await seedLookups()

      expect(mockInsertStatusTypes.values).toHaveBeenCalledWith([
        { code: 'PENDING', name: 'Pending', sequence: 1, isSystem: true },
        { code: 'TO_FOLLOW', name: 'To Follow', sequence: 2, isSystem: true },
        { code: 'CALLED', name: 'Called', sequence: 3, isSystem: true },
        { code: 'VISITED', name: 'Visited', sequence: 4, companyId: 'fcash-id', isSystem: true },
        { code: 'UPDATED', name: 'Updated', sequence: 5, isSystem: true },
        { code: 'DONE', name: 'Done', sequence: 6, isSystem: true },
      ])
      expect(mockInsertStatusTypes.onConflictDoNothing).toHaveBeenCalled()
    })

    it('seeds status reasons', async () => {
      const mockCompanies = [
        { id: 'fcash-id', code: 'FCASH', name: 'FCASH', isSystem: true },
        { id: 'pcni-id', code: 'PCNI', name: 'PCNI', isSystem: true },
      ]

      const mockStatusTypes = [
        { id: 'done-id', code: 'DONE', name: 'Done', sequence: 6, isSystem: true },
      ]

      const mockInsertCompanies = {
        values: vi.fn().mockReturnThis(),
        onConflictDoNothing: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue(mockCompanies),
      }

      const mockInsertStatusTypes = {
        values: vi.fn().mockReturnThis(),
        onConflictDoNothing: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue(mockStatusTypes),
      }

      const mockInsertStatusReasons = {
        values: vi.fn().mockReturnThis(),
        onConflictDoNothing: vi.fn().mockReturnThis(),
      }

      ;(db.insert as any)
        .mockReturnValueOnce(mockInsertCompanies)
        .mockReturnValueOnce(mockInsertStatusTypes)
        .mockReturnValueOnce(mockInsertStatusReasons)

      await seedLookups()

      expect(mockInsertStatusReasons.values).toHaveBeenCalledWith([
        { code: 'DECEASED', name: 'Deceased', statusTypeId: 'done-id', isTerminal: true, isSystem: true },
        { code: 'FULLY_PAID', name: 'Fully Paid', statusTypeId: 'done-id', isTerminal: true, isSystem: true },
        { code: 'CONFIRMED', name: 'Confirmed', statusTypeId: 'done-id', isTerminal: false, isSystem: true },
        { code: 'NOT_REACHABLE', name: 'Not Reachable', statusTypeId: 'done-id', requiresRemarks: true, isSystem: true },
      ])
      expect(mockInsertStatusReasons.onConflictDoNothing).toHaveBeenCalled()
    })

    it('seeds products', async () => {
      const mockCompanies = [
        { id: 'fcash-id', code: 'FCASH', name: 'FCASH', isSystem: true },
        { id: 'pcni-id', code: 'PCNI', name: 'PCNI', isSystem: true },
      ]

      const mockInsertCompanies = {
        values: vi.fn().mockReturnThis(),
        onConflictDoNothing: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue(mockCompanies),
      }

      const mockInsertProducts = {
        values: vi.fn().mockReturnThis(),
        onConflictDoNothing: vi.fn().mockReturnThis(),
      }

      ;(db.insert as any)
        .mockReturnValueOnce(mockInsertCompanies)
        .mockReturnValueOnce(mockInsertProducts)

      await seedLookups()

      expect(mockInsertProducts.values).toHaveBeenCalledWith([
        { code: 'FCASH_SSS', name: 'FCASH SSS', companyId: 'fcash-id', trackingCycle: 'monthly', isSystem: true },
        { code: 'FCASH_GSIS', name: 'FCASH GSIS', companyId: 'fcash-id', trackingCycle: 'monthly', isSystem: true },
        { code: 'PCNI_NON_PNP', name: 'PCNI Non-PNP', companyId: 'pcni-id', trackingCycle: 'monthly', isSystem: true },
        { code: 'PCNI_PNP', name: 'PCNI PNP', companyId: 'pcni-id', trackingCycle: 'quarterly', isSystem: true },
      ])
      expect(mockInsertProducts.onConflictDoNothing).toHaveBeenCalled()
    })

    it('handles existing companies', async () => {
      const mockCompanies = [] // Simulate onConflictDoNothing returning empty

      const mockInsertCompanies = {
        values: vi.fn().mockReturnThis(),
        onConflictDoNothing: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue(mockCompanies),
      }

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
      }

      const mockExistingCompanies = [
        { id: 'fcash-id', code: 'FCASH', name: 'FCASH', isSystem: true },
        { id: 'pcni-id', code: 'PCNI', name: 'PCNI', isSystem: true },
      ]

      ;(db.insert as any).mockReturnValueOnce(mockInsertCompanies)
      ;(db.select as any).mockReturnValue(mockSelect)

      await seedLookups()

      expect(mockInsertCompanies.values).toHaveBeenCalled()
      expect(mockInsertCompanies.onConflictDoNothing).toHaveBeenCalled()
      expect(mockInsertCompanies.returning).toHaveBeenCalled()
    })

    it('throws error when companies cannot be seeded or retrieved', async () => {
      const mockCompanies = [] // Simulate onConflictDoNothing returning empty

      const mockInsertCompanies = {
        values: vi.fn().mockReturnThis(),
        onConflictDoNothing: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue(mockCompanies),
      }

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
      }

      ;(db.insert as any).mockReturnValueOnce(mockInsertCompanies)
      ;(db.select as any).mockReturnValue(mockSelect)

      await expect(seedLookups()).rejects.toThrow('Failed to seed or retrieve companies')
    })
  })
})
