import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as activityQueries from '../activity.queries'
import { activityLogs } from '@/server/db/schema/activity'
import { db } from '@/server/db/index'

// Mock database
vi.mock('@/server/db/index', () => {
  const mockSelect = vi.fn()
  const mockInsert = vi.fn()

  return {
    db: {
      select: mockSelect,
      insert: mockInsert,
    },
  }
})

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import { eq, and, gte, lte, or, like, desc, count } from 'drizzle-orm'

describe('Activity Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listActivityLogs', () => {
    it('should return paginated activity logs with default parameters', async () => {
      const mockLogs = [
        { id: '1', userId: 'user-1', action: 'LOGIN', createdAt: new Date() },
        { id: '2', userId: 'user-2', action: 'LOGOUT', createdAt: new Date() },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockReturnThis()
      const mockOffset = vi.fn().mockResolvedValue(mockLogs)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
      } as any)

      mockFrom.mockReturnValue({
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
      })

      const result = await activityQueries.listActivityLogs()

      expect(result.data).toEqual(mockLogs)
      expect(result.pagination.page).toBe(1)
      expect(result.pagination.pageSize).toBe(25)
    })

    it('should apply userId filter when provided', async () => {
      const mockLogs = [{ id: '1', userId: 'user-1', action: 'LOGIN' }]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockReturnThis()
      const mockOffset = vi.fn().mockResolvedValue(mockLogs)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
      } as any)

      mockFrom.mockReturnValue({
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
      })

      await activityQueries.listActivityLogs({ userId: 'user-1' })

      expect(mockWhere).toHaveBeenCalled()
    })

    it('should apply action filter when provided', async () => {
      const mockLogs = [{ id: '1', action: 'LOGIN' }]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockReturnThis()
      const mockOffset = vi.fn().mockResolvedValue(mockLogs)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
      } as any)

      mockFrom.mockReturnValue({
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
      })

      await activityQueries.listActivityLogs({ action: 'LOGIN' })

      expect(mockWhere).toHaveBeenCalled()
    })

    it('should apply date range filters when provided', async () => {
      const mockLogs = [{ id: '1', createdAt: new Date() }]
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-12-31')

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockReturnThis()
      const mockOffset = vi.fn().mockResolvedValue(mockLogs)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
      } as any)

      mockFrom.mockReturnValue({
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
      })

      await activityQueries.listActivityLogs({ startDate, endDate })

      expect(mockWhere).toHaveBeenCalled()
    })

    it('should limit pageSize to maximum of 100', async () => {
      const mockLogs: any[] = []

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockReturnThis()
      const mockOffset = vi.fn().mockResolvedValue(mockLogs)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
      } as any)

      mockFrom.mockReturnValue({
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
      })

      await activityQueries.listActivityLogs({ pageSize: 200 })

      expect(mockLimit).toHaveBeenCalledWith(100)
    })
  })

  describe('getActivityForResource', () => {
    it('should return activity history for specific resource', async () => {
      const mockLogs = [
        { id: '1', resource: 'client', resourceId: 'client-1', action: 'CLIENT_VIEW' },
        { id: '2', resource: 'client', resourceId: 'client-1', action: 'CLIENT_UPDATE' },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockResolvedValue(mockLogs)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
      } as any)

      mockFrom.mockReturnValue({
        where: mockWhere,
        orderBy: mockOrderBy,
      })

      const result = await activityQueries.getActivityForResource({
        resource: 'client',
        resourceId: 'client-1',
      })

      expect(result).toEqual(mockLogs)
      expect(mockWhere).toHaveBeenCalled()
    })
  })

  describe('getUserActivitySummary', () => {
    it('should return user activity summary', async () => {
      const mockLogs = [
        { id: '1', userId: 'user-1', action: 'LOGIN', durationMs: 100, errorMessage: null },
        { id: '2', userId: 'user-1', action: 'CLIENT_VIEW', durationMs: 200, errorMessage: null },
        { id: '3', userId: 'user-1', action: 'CLIENT_UPDATE', durationMs: 300, errorMessage: 'Error' },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockResolvedValue(mockLogs)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
      } as any)

      const result = await activityQueries.getUserActivitySummary({
        userId: 'user-1',
      })

      expect(result.totalActions).toBe(3)
      expect(result.actionsByType).toEqual({
        LOGIN: 1,
        CLIENT_VIEW: 1,
        CLIENT_UPDATE: 1,
      })
      expect(result.successRate).toBeCloseTo(66.67, 1)
      expect(result.averageDuration).toBeCloseTo(200, 1)
    })

    it('should calculate success rate correctly', async () => {
      const mockLogs = [
        { id: '1', userId: 'user-1', action: 'LOGIN', errorMessage: null },
        { id: '2', userId: 'user-1', action: 'CLIENT_VIEW', errorMessage: null },
        { id: '3', userId: 'user-1', action: 'CLIENT_UPDATE', errorMessage: 'Error' },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockResolvedValue(mockLogs)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
      } as any)

      const result = await activityQueries.getUserActivitySummary({
        userId: 'user-1',
      })

      expect(result.successRate).toBeCloseTo(66.67, 1)
    })

    it('should calculate average duration correctly', async () => {
      const mockLogs = [
        { id: '1', userId: 'user-1', action: 'LOGIN', durationMs: 100 },
        { id: '2', userId: 'user-1', action: 'CLIENT_VIEW', durationMs: 200 },
        { id: '3', userId: 'user-1', action: 'CLIENT_UPDATE', durationMs: 300 },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockResolvedValue(mockLogs)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
      } as any)

      const result = await activityQueries.getUserActivitySummary({
        userId: 'user-1',
      })

      expect(result.averageDuration).toBe(200)
    })
  })

  describe('getRecentActivityForUser', () => {
    it('should return recent activity for user', async () => {
      const mockLogs = [
        { id: '1', userId: 'user-1', action: 'LOGIN' },
        { id: '2', userId: 'user-1', action: 'CLIENT_VIEW' },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue(mockLogs)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
      } as any)

      mockFrom.mockReturnValue({
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
      })

      const result = await activityQueries.getRecentActivityForUser('user-1', 10)

      expect(result).toEqual(mockLogs)
      expect(mockLimit).toHaveBeenCalledWith(10)
    })

    it('should limit recent activity to 50', async () => {
      const mockLogs: any[] = []

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue(mockLogs)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
      } as any)

      mockFrom.mockReturnValue({
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
      })

      await activityQueries.getRecentActivityForUser('user-1', 100)

      expect(mockLimit).toHaveBeenCalledWith(50)
    })
  })

  describe('getActivityStats', () => {
    it('should return activity statistics', async () => {
      const mockStats = {
        total: 100,
        successful: 90,
        failed: 10,
        avgDuration: 200,
      }

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockResolvedValue([mockStats])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
      } as any)

      const result = await activityQueries.getActivityStats({})

      expect(result).toEqual(mockStats)
    })

    it('should apply filters to statistics', async () => {
      const mockStats = {
        total: 50,
        successful: 45,
        failed: 5,
        avgDuration: 150,
      }

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockResolvedValue([mockStats])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
      } as any)

      await activityQueries.getActivityStats({
        action: 'LOGIN',
        resource: 'client',
      })

      expect(mockWhere).toHaveBeenCalled()
    })
  })
})
