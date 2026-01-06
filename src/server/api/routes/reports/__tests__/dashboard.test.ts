/**
 * Tests for dashboard reports API routes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { dashboardRoutes } from '../dashboard'
import {
  getStatusSummary,
  getPensionTypeSummary,
  getBranchPerformanceSummary,
  getStatusTrends,
} from '@/features/reports/queries/dashboard.queries'
import { getUserBranchFilter } from '@/lib/territories/filter'
import { hasPermission } from '@/lib/permissions'

// Mock query functions
vi.mock('@/features/reports/queries/dashboard.queries', () => ({
  getStatusSummary: vi.fn(),
  getPensionTypeSummary: vi.fn(),
  getBranchPerformanceSummary: vi.fn(),
  getStatusTrends: vi.fn(),
}))

vi.mock('@/lib/territories/filter', () => ({
  getUserBranchFilter: vi.fn(),
}))

vi.mock('@/lib/permissions', () => ({
  hasPermission: vi.fn(),
}))

describe('Dashboard Reports Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/reports/dashboard/status-summary', () => {
    it('should return status summary with permission', async () => {
      const mockSummary = {
        totalClients: 100,
        statusCounts: {
          PENDING: 30,
          DONE: 70,
        },
        statusPercentages: {
          PENDING: 30,
          DONE: 70,
        },
        paymentCount: 50,
        terminalCount: 20,
      }

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getUserBranchFilter).mockResolvedValue({
        scope: 'all',
        branchIds: [],
      })
      vi.mocked(getStatusSummary).mockResolvedValue(mockSummary)

      const app = new Hono()
      app.route('/', dashboardRoutes)

      const response = await app.request(
        '/dashboard/status-summary?companyId=company1&periodYear=2024&periodMonth=1'
      )
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockSummary)
      expect(json.meta).toEqual({
        companyId: 'company1',
        periodYear: 2024,
        periodMonth: 1,
        periodQuarter: undefined,
      })
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', dashboardRoutes)

      const response = await app.request(
        '/dashboard/status-summary?companyId=company1&periodYear=2024&periodMonth=1'
      )
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })

    it('should filter by territory when user has territory access', async () => {
      const mockSummary = {
        totalClients: 50,
        statusCounts: {},
        statusPercentages: {},
        paymentCount: 0,
        terminalCount: 0,
      }

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getUserBranchFilter).mockResolvedValue({
        scope: 'territory',
        branchIds: ['branch1', 'branch2'],
      })
      vi.mocked(getStatusSummary).mockResolvedValue(mockSummary)

      const app = new Hono()
      app.route('/', dashboardRoutes)

      const response = await app.request(
        '/dashboard/status-summary?companyId=company1&periodYear=2024&periodMonth=1'
      )
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(getStatusSummary).toHaveBeenCalledWith(
        expect.objectContaining({
          branchIds: ['branch1', 'branch2'],
        })
      )
    })

    it('should return 500 on error', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getUserBranchFilter).mockResolvedValue({
        scope: 'all',
        branchIds: [],
      })
      vi.mocked(getStatusSummary).mockRejectedValue(new Error('Database error'))

      const app = new Hono()
      app.route('/', dashboardRoutes)

      const response = await app.request(
        '/dashboard/status-summary?companyId=company1&periodYear=2024&periodMonth=1'
      )
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('INTERNAL_ERROR')
    })
  })

  describe('GET /api/reports/dashboard/pension-type-summary', () => {
    it('should return pension type summary with permission', async () => {
      const mockSummary = [
        {
          pensionType: 'SSS',
          totalClients: 60,
          statusCounts: {
            PENDING: 20,
            DONE: 40,
          },
        },
        {
          pensionType: 'GSIS',
          totalClients: 40,
          statusCounts: {
            PENDING: 10,
            DONE: 30,
          },
        },
      ]

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getUserBranchFilter).mockResolvedValue({
        scope: 'all',
        branchIds: [],
      })
      vi.mocked(getPensionTypeSummary).mockResolvedValue(mockSummary)

      const app = new Hono()
      app.route('/', dashboardRoutes)

      const response = await app.request(
        '/dashboard/pension-type-summary?companyId=company1&periodYear=2024&periodMonth=1'
      )
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockSummary)
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', dashboardRoutes)

      const response = await app.request(
        '/dashboard/pension-type-summary?companyId=company1&periodYear=2024&periodMonth=1'
      )
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })
  })

  describe('GET /api/reports/dashboard/branch-performance', () => {
    it('should return branch performance summary with permission', async () => {
      const mockSummary = [
        {
          branchId: 'branch1',
          branchName: 'Branch 1',
          branchCode: 'B001',
          areaName: 'Area 1',
          totalClients: 50,
          completedCount: 30,
          inProgressCount: 15,
          pendingCount: 5,
          completionRate: 60,
        },
      ]

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getUserBranchFilter).mockResolvedValue({
        scope: 'all',
        branchIds: [],
      })
      vi.mocked(getBranchPerformanceSummary).mockResolvedValue(mockSummary)

      const app = new Hono()
      app.route('/', dashboardRoutes)

      const response = await app.request(
        '/dashboard/branch-performance?companyId=company1&periodYear=2024&periodMonth=1'
      )
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockSummary)
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', dashboardRoutes)

      const response = await app.request(
        '/dashboard/branch-performance?companyId=company1&periodYear=2024&periodMonth=1'
      )
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })
  })

  describe('GET /api/reports/dashboard/trends', () => {
    it('should return status trends with permission', async () => {
      const mockTrends = [
        {
          date: '2024-01-01',
          status: 'PENDING',
          count: 10,
        },
        {
          date: '2024-01-02',
          status: 'DONE',
          count: 5,
        },
      ]

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getUserBranchFilter).mockResolvedValue({
        scope: 'all',
        branchIds: [],
      })
      vi.mocked(getStatusTrends).mockResolvedValue(mockTrends)

      const app = new Hono()
      app.route('/', dashboardRoutes)

      const response = await app.request(
        '/dashboard/trends?companyId=company1&periodYear=2024&periodMonth=1&days=30'
      )
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockTrends)
      expect(json.meta).toEqual({
        companyId: 'company1',
        periodYear: 2024,
        periodMonth: 1,
        periodQuarter: undefined,
        days: 30,
      })
    })

    it('should use default days parameter when not provided', async () => {
      const mockTrends = []

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getUserBranchFilter).mockResolvedValue({
        scope: 'all',
        branchIds: [],
      })
      vi.mocked(getStatusTrends).mockResolvedValue(mockTrends)

      const app = new Hono()
      app.route('/', dashboardRoutes)

      const response = await app.request(
        '/dashboard/trends?companyId=company1&periodYear=2024&periodMonth=1'
      )
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(getStatusTrends).toHaveBeenCalledWith(
        expect.objectContaining({
          days: 30,
        })
      )
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', dashboardRoutes)

      const response = await app.request(
        '/dashboard/trends?companyId=company1&periodYear=2024&periodMonth=1'
      )
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })
  })
})
