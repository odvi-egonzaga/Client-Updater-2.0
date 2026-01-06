import { describe, it, expect, vi, beforeEach } from 'vitest'
import { seedPermissions } from '../permissions'

// Mock database
vi.mock('@/server/db/index', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
  },
}))

import { db } from '@/server/db/index'

describe('Seed Permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('seedPermissions', () => {
    it('seeds permissions', async () => {
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        onConflictDoNothing: vi.fn().mockReturnThis(),
      }

      const mockPermissions = [
        { id: 'perm-1', code: 'clients:read', resource: 'clients', action: 'read', description: 'View client list and details' },
        { id: 'perm-2', code: 'clients:update', resource: 'clients', action: 'update', description: 'Update client information' },
      ]

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
      }

      const mockExistingPermissions = [
        { id: 'perm-1', code: 'clients:read', resource: 'clients', action: 'read', description: 'View client list and details' },
        { id: 'perm-2', code: 'clients:update', resource: 'clients', action: 'update', description: 'Update client information' },
      ]

      ;(db.insert as any).mockReturnValueOnce(mockInsert)
      ;(db.select as any).mockReturnValueOnce(mockSelect)
        .mockResolvedValueOnce(mockExistingPermissions)

      await seedPermissions()

      expect(mockInsert.values).toHaveBeenCalledWith(expect.any(Array))
      expect(mockInsert.onConflictDoNothing).toHaveBeenCalled()
      expect(mockSelect.from).toHaveBeenCalled()
    })

    it('handles existing permissions', async () => {
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        onConflictDoNothing: vi.fn().mockReturnThis(),
      }

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
      }

      const mockExistingPermissions = [
        { id: 'perm-1', code: 'clients:read', resource: 'clients', action: 'read', description: 'View client list and details' },
        { id: 'perm-2', code: 'clients:update', resource: 'clients', action: 'update', description: 'Update client information' },
      ]

      ;(db.insert as any).mockReturnValueOnce(mockInsert)
      ;(db.select as any).mockReturnValueOnce(mockSelect)
        .mockResolvedValueOnce(mockExistingPermissions)

      await seedPermissions()

      expect(mockInsert.values).toHaveBeenCalled()
      expect(mockInsert.onConflictDoNothing).toHaveBeenCalled()
      expect(mockSelect.from).toHaveBeenCalled()
    })

    it('verifies seeded permissions', async () => {
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        onConflictDoNothing: vi.fn().mockReturnThis(),
      }

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
      }

      const mockExistingPermissions = [
        { id: 'perm-1', code: 'clients:read', resource: 'clients', action: 'read', description: 'View client list and details' },
        { id: 'perm-2', code: 'clients:update', resource: 'clients', action: 'update', description: 'Update client information' },
      ]

      ;(db.insert as any).mockReturnValueOnce(mockInsert)
      ;(db.select as any).mockReturnValueOnce(mockSelect)
        .mockResolvedValueOnce(mockExistingPermissions)

      await seedPermissions()

      expect(mockSelect.from).toHaveBeenCalledWith(expect.anything())
    })
  })
})
