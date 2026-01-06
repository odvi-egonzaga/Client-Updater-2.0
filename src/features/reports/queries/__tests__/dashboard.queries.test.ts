/**
 * Tests for dashboard summary queries
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getStatusSummary,
  getPensionTypeSummary,
  getBranchPerformanceSummary,
  getStatusTrends,
} from '../dashboard.queries'
import { db } from '@/server/db'

// Mock database
vi.mock('@/server/db', () => ({
  db: vi.fn(),
}))

describe('Dashboard Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getStatusSummary', () => {
    it('should return status summary with counts and percentages', async () => {
      const mockDbResult = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockResolvedValue([
          { statusTypeName: 'PENDING', count: 10 },
          { statusTypeName: 'DONE', count: 5 },
        ]),
      }

      vi.mocked(db).mockReturnValue(mockDbResult as any)

      const result = await getStatusSummary({
        companyId: 'company1',
        periodYear: 2024,
        periodMonth: 1,
      })

      expect(result.totalClients).toBeDefined()
      expect(result.statusCounts).toBeDefined()
      expect(result.statusPercentages).toBeDefined()
      expect(result.paymentCount).toBeDefined()
      expect(result.terminalCount).toBeDefined()
    })

    it('should calculate percentages correctly', async () => {
      const mockDbResult = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockResolvedValue([
          { statusTypeName: 'PENDING', count: 5 },
          { statusTypeName: 'DONE', count: 5 },
        ]),
      }

      vi.mocked(db).mockReturnValue(mockDbResult as any)

      const result = await getStatusSummary({
        companyId: 'company1',
        periodYear: 2024,
        periodMonth: 1,
      })

      expect(result.statusPercentages['PENDING']).toBe(50)
      expect(result.statusPercentages['DONE']).toBe(50)
    })

    it('should filter by branch IDs when provided', async () => {
      const mockDbResult = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockResolvedValue([]),
      }

      vi.mocked(db).mockReturnValue(mockDbResult as any)

      await getStatusSummary({
        companyId: 'company1',
        branchIds: ['branch1', 'branch2'],
        periodYear: 2024,
        periodMonth: 1,
      })

      expect(mockDbResult.where).toHaveBeenCalled()
    })

    it('should handle quarterly periods', async () => {
      const mockDbResult = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockResolvedValue([]),
      }

      vi.mocked(db).mockReturnValue(mockDbResult as any)

      await getStatusSummary({
        companyId: 'company1',
        periodYear: 2024,
        periodQuarter: 1,
      })

      expect(mockDbResult.where).toHaveBeenCalled()
    })
  })

  describe('getPensionTypeSummary', () => {
    it('should return pension type breakdown with status counts', async () => {
      const mockDbResult = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockResolvedValue([
          { pensionTypeName: 'SSS', statusTypeName: 'PENDING', count: 10 },
          { pensionTypeName: 'SSS', statusTypeName: 'DONE', count: 5 },
          { pensionTypeName: 'GSIS', statusTypeName: 'PENDING', count: 8 },
        ]),
      }

      vi.mocked(db).mockReturnValue(mockDbResult as any)

      const result = await getPensionTypeSummary({
        companyId: 'company1',
        periodYear: 2024,
        periodMonth: 1,
      })

      expect(result).toHaveLength(2)
      expect(result[0].pensionType).toBe('SSS')
      expect(result[0].totalClients).toBe(15)
      expect(result[0].statusCounts['PENDING']).toBe(10)
      expect(result[0].statusCounts['DONE']).toBe(5)
    })

    it('should group status counts by pension type', async () => {
      const mockDbResult = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockResolvedValue([
          { pensionTypeName: 'SSS', statusTypeName: 'PENDING', count: 10 },
          { pensionTypeName: 'SSS', statusTypeName: 'DONE', count: 5 },
        ]),
      }

      vi.mocked(db).mockReturnValue(mockDbResult as any)

      const result = await getPensionTypeSummary({
        companyId: 'company1',
        periodYear: 2024,
        periodMonth: 1,
      })

      expect(result[0].statusCounts).toEqual({
        PENDING: 10,
        DONE: 5,
      })
    })
  })

  describe('getBranchPerformanceSummary', () => {
    it('should return branch performance metrics', async () => {
      const mockDbResult = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockResolvedValue([
          {
            branchId: 'branch1',
            branchName: 'Branch 1',
            branchCode: 'B001',
            areaName: 'Area 1',
            statusTypeName: 'DONE',
            count: 5,
          },
          {
            branchId: 'branch1',
            branchName: 'Branch 1',
            branchCode: 'B001',
            areaName: 'Area 1',
            statusTypeName: 'PENDING',
            count: 3,
          },
        ]),
      }

      vi.mocked(db).mockReturnValue(mockDbResult as any)

      const result = await getBranchPerformanceSummary({
        companyId: 'company1',
        periodYear: 2024,
        periodMonth: 1,
      })

      expect(result).toHaveLength(1)
      expect(result[0].branchId).toBe('branch1')
      expect(result[0].branchName).toBe('Branch 1')
      expect(result[0].totalClients).toBe(8)
      expect(result[0].completedCount).toBe(5)
      expect(result[0].pendingCount).toBe(3)
    })

    it('should calculate completion rate correctly', async () => {
      const mockDbResult = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockResolvedValue([
          {
            branchId: 'branch1',
            branchName: 'Branch 1',
            branchCode: 'B001',
            areaName: 'Area 1',
            statusTypeName: 'DONE',
            count: 5,
          },
          {
            branchId: 'branch1',
            branchName: 'Branch 1',
            branchCode: 'B001',
            areaName: 'Area 1',
            statusTypeName: 'PENDING',
            count: 5,
          },
        ]),
      }

      vi.mocked(db).mockReturnValue(mockDbResult as any)

      const result = await getBranchPerformanceSummary({
        companyId: 'company1',
        periodYear: 2024,
        periodMonth: 1,
      })

      expect(result[0].completionRate).toBe(50)
    })

    it('should categorize statuses correctly', async () => {
      const mockDbResult = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockResolvedValue([
          {
            branchId: 'branch1',
            branchName: 'Branch 1',
            branchCode: 'B001',
            areaName: 'Area 1',
            statusTypeName: 'DONE',
            count: 2,
          },
          {
            branchId: 'branch1',
            branchName: 'Branch 1',
            branchCode: 'B001',
            areaName: 'Area 1',
            statusTypeName: 'TO_FOLLOW',
            count: 1,
          },
          {
            branchId: 'branch1',
            branchName: 'Branch 1',
            branchCode: 'B001',
            areaName: 'Area 1',
            statusTypeName: 'PENDING',
            count: 1,
          },
        ]),
      }

      vi.mocked(db).mockReturnValue(mockDbResult as any)

      const result = await getBranchPerformanceSummary({
        companyId: 'company1',
        periodYear: 2024,
        periodMonth: 1,
      })

      expect(result[0].completedCount).toBe(2)
      expect(result[0].inProgressCount).toBe(1)
      expect(result[0].pendingCount).toBe(1)
    })
  })

  describe('getStatusTrends', () => {
    it('should return status trends over time', async () => {
      const mockDbResult = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([
          {
            date: '2024-01-01',
            statusTypeName: 'PENDING',
            count: 10,
          },
          {
            date: '2024-01-02',
            statusTypeName: 'DONE',
            count: 5,
          },
        ]),
      }

      vi.mocked(db).mockReturnValue(mockDbResult as any)

      const result = await getStatusTrends({
        companyId: 'company1',
        periodYear: 2024,
        periodMonth: 1,
        days: 30,
      })

      expect(result).toHaveLength(2)
      expect(result[0].date).toBe('2024-01-01')
      expect(result[0].status).toBe('PENDING')
      expect(result[0].count).toBe(10)
    })

    it('should use default days parameter when not provided', async () => {
      const mockDbResult = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([]),
      }

      vi.mocked(db).mockReturnValue(mockDbResult as any)

      await getStatusTrends({
        companyId: 'company1',
        periodYear: 2024,
        periodMonth: 1,
      })

      expect(mockDbResult.where).toHaveBeenCalled()
    })

    it('should filter by branch IDs when provided', async () => {
      const mockDbResult = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([]),
      }

      vi.mocked(db).mockReturnValue(mockDbResult as any)

      await getStatusTrends({
        companyId: 'company1',
        branchIds: ['branch1', 'branch2'],
        periodYear: 2024,
        periodMonth: 1,
      })

      expect(mockDbResult.where).toHaveBeenCalled()
    })
  })
})
