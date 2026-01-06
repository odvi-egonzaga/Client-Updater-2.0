import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as territoryFilter from '../filter'
import { userBranches, userAreas } from '../../server/db/schema/users'
import { areaBranches } from '../../server/db/schema/organization'
import { eq } from 'drizzle-orm'

// Mock database
vi.mock('../../server/db/index', () => {
  const mockSelect = vi.fn()

  return {
    db: {
      select: mockSelect,
    },
  }
})

// Mock cache
vi.mock('@/lib/cache/redis', () => ({
  cache: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    delPattern: vi.fn(),
    isAvailable: vi.fn(() => true),
  },
  cacheKeys: {
    userBranches: (userId: string) => `user:${userId}:branches`,
  },
  CACHE_TTL: {
    USER_PERMISSIONS: 300,
  },
}))

// Mock permissions
vi.mock('@/lib/permissions', () => ({
  hasPermission: vi.fn(),
}))

// Mock logger
vi.mock('@/lib/logger/index', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import { db } from '../../server/db/index'
import { cache } from '../../lib/cache/redis'
import { hasPermission } from '../../lib/permissions'

describe('Territory Filter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getUserBranchIds', () => {
    it('should return cached branch IDs', async () => {
      const mockBranchIds = ['branch1', 'branch2', 'branch3']

      vi.mocked(cache.get).mockResolvedValue(mockBranchIds)

      const result = await territoryFilter.getUserBranchIds('user1', 'company1')

      expect(result).toEqual(mockBranchIds)
      expect(cache.get).toHaveBeenCalledWith('user:user1:branches')
    })

    it('should fetch from database on cache miss', async () => {
      const mockDirectBranches = [
        { branchId: 'branch1' },
        { branchId: 'branch2' },
      ]
      const mockAreaBranches = [
        { branchId: 'branch3' },
      ]

      vi.mocked(cache.get).mockResolvedValue(null)

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockResolvedValue(mockDirectBranches)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
      })

      const mockFrom2 = vi.fn().mockReturnThis()
      const mockInnerJoin = vi.fn().mockReturnThis()
      const mockWhere2 = vi.fn().mockResolvedValue(mockAreaBranches)

      vi.mocked(db.select).mockReturnValueOnce({
        from: mockFrom2,
        innerJoin: mockInnerJoin,
        where: mockWhere2,
      })

      const result = await territoryFilter.getUserBranchIds('user1', 'company1')

      expect(result).toEqual(['branch1', 'branch2', 'branch3'])
      expect(cache.set).toHaveBeenCalledWith(
        'user:user1:branches',
        ['branch1', 'branch2', 'branch3'],
        300
      )
    })

    it('should deduplicate branch IDs', async () => {
      const mockDirectBranches = [
        { branchId: 'branch1' },
        { branchId: 'branch2' },
      ]
      const mockAreaBranches = [
        { branchId: 'branch1' }, // Duplicate
        { branchId: 'branch3' },
      ]

      vi.mocked(cache.get).mockResolvedValue(null)

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockResolvedValue(mockDirectBranches)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
      })

      const mockFrom2 = vi.fn().mockReturnThis()
      const mockInnerJoin = vi.fn().mockReturnThis()
      const mockWhere2 = vi.fn().mockResolvedValue(mockAreaBranches)

      vi.mocked(db.select).mockReturnValueOnce({
        from: mockFrom2,
        innerJoin: mockInnerJoin,
        where: mockWhere2,
      })

      const result = await territoryFilter.getUserBranchIds('user1', 'company1')

      expect(result).toEqual(['branch1', 'branch2', 'branch3'])
    })
  })

  describe('getUserBranchFilter', () => {
    it('should return all scope if user has all access', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true)

      const result = await territoryFilter.getUserBranchFilter('user1', 'company1')

      expect(result).toEqual({
        scope: 'all',
        branchIds: [],
      })
      expect(hasPermission).toHaveBeenCalledWith('user1', 'company1', 'clients', 'read')
    })

    it('should return territory scope with branch IDs', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)
      vi.mocked(cache.get).mockResolvedValue(['branch1', 'branch2'])

      const result = await territoryFilter.getUserBranchFilter('user1', 'company1')

      expect(result).toEqual({
        scope: 'territory',
        branchIds: ['branch1', 'branch2'],
      })
    })

    it('should return none scope if user has no branches', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)
      vi.mocked(cache.get).mockResolvedValue([])

      const result = await territoryFilter.getUserBranchFilter('user1', 'company1')

      expect(result).toEqual({
        scope: 'none',
        branchIds: [],
      })
    })
  })

  describe('canAccessBranch', () => {
    it('should return true if user has all scope', async () => {
      vi.mocked(cache.get).mockResolvedValue(['branch1', 'branch2'])
      vi.mocked(hasPermission).mockResolvedValue(true)

      const result = await territoryFilter.canAccessBranch('user1', 'company1', 'branch3')

      expect(result).toBe(true)
    })

    it('should return true if branch is in user territory', async () => {
      vi.mocked(cache.get).mockResolvedValue(['branch1', 'branch2'])
      vi.mocked(hasPermission).mockResolvedValue(false)

      const result = await territoryFilter.canAccessBranch('user1', 'company1', 'branch1')

      expect(result).toBe(true)
    })

    it('should return false if branch is not in user territory', async () => {
      vi.mocked(cache.get).mockResolvedValue(['branch1', 'branch2'])
      vi.mocked(hasPermission).mockResolvedValue(false)

      const result = await territoryFilter.canAccessBranch('user1', 'company1', 'branch3')

      expect(result).toBe(false)
    })

    it('should return false if user has none scope', async () => {
      vi.mocked(cache.get).mockResolvedValue([])
      vi.mocked(hasPermission).mockResolvedValue(false)

      const result = await territoryFilter.canAccessBranch('user1', 'company1', 'branch1')

      expect(result).toBe(false)
    })
  })

  describe('invalidateUserBranchCache', () => {
    it('should invalidate cache for user', async () => {
      await territoryFilter.invalidateUserBranchCache('user1')

      expect(cache.del).toHaveBeenCalledWith('user:user1:branches')
    })
  })

  describe('invalidateAllUserBranchCache', () => {
    it('should invalidate all user branch caches', async () => {
      await territoryFilter.invalidateAllUserBranchCache()

      expect(cache.delPattern).toHaveBeenCalledWith('user:*:branches')
    })
  })

  describe('filterClientsByTerritory', () => {
    it('should return all branch IDs if user has all scope', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true)

      const clientBranchIds = ['branch1', 'branch2', 'branch3']
      const result = await territoryFilter.filterClientsByTerritory(
        'user1',
        'company1',
        clientBranchIds
      )

      expect(result).toEqual(clientBranchIds)
    })

    it('should return empty array if user has none scope', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)
      vi.mocked(cache.get).mockResolvedValue([])

      const clientBranchIds = ['branch1', 'branch2', 'branch3']
      const result = await territoryFilter.filterClientsByTerritory(
        'user1',
        'company1',
        clientBranchIds
      )

      expect(result).toEqual([])
    })

    it('should filter branch IDs by user territory', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)
      vi.mocked(cache.get).mockResolvedValue(['branch1', 'branch3'])

      const clientBranchIds = ['branch1', 'branch2', 'branch3', 'branch4']
      const result = await territoryFilter.filterClientsByTerritory(
        'user1',
        'company1',
        clientBranchIds
      )

      expect(result).toEqual(['branch1', 'branch3'])
    })
  })
})
