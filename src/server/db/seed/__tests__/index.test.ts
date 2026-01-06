import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { seedDatabase } from '../index'

// Mock seed functions
vi.mock('../lookups', () => ({
  seedLookups: vi.fn(),
}))

vi.mock('../permissions', () => ({
  seedPermissions: vi.fn(),
}))

import { seedLookups } from '../lookups'
import { seedPermissions } from '../permissions'

describe('Seed Index', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('seedDatabase', () => {
    it('seeds lookups', async () => {
      ;(seedLookups as any).mockResolvedValueOnce(undefined)

      await seedDatabase()

      expect(seedLookups).toHaveBeenCalledTimes(1)
    })

    it('seeds permissions', async () => {
      ;(seedPermissions as any).mockResolvedValueOnce(undefined)

      await seedDatabase()

      expect(seedPermissions).toHaveBeenCalledTimes(1)
    })

    it('seeds both lookups and permissions', async () => {
      ;(seedLookups as any).mockResolvedValueOnce(undefined)
      ;(seedPermissions as any).mockResolvedValueOnce(undefined)

      await seedDatabase()

      expect(seedLookups).toHaveBeenCalledTimes(1)
      expect(seedPermissions).toHaveBeenCalledTimes(1)
    })

    it('handles lookup seed errors', async () => {
      const error = new Error('Failed to seed lookups')
      ;(seedLookups as any).mockRejectedValueOnce(error)

      await expect(seedDatabase()).rejects.toThrow(error)
    })

    it('handles permission seed errors', async () => {
      const error = new Error('Failed to seed permissions')
      ;(seedPermissions as any).mockRejectedValueOnce(error)

      await expect(seedDatabase()).rejects.toThrow(error)
    })
  })
})
