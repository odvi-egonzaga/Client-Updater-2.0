import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { statusBulkUpdateRoutes } from '../bulk-update'
import { db } from '@/server/db'
import {
  getClientCurrentStatus,
  updateClientPeriodStatus,
  recordStatusEvent,
  createClientPeriodStatus,
} from '@/server/db/queries/status'
import { getUserBranchFilter } from '@/lib/territories/filter'
import { hasPermission } from '@/lib/permissions'
import { validateStatusUpdate } from '@/lib/status/validation'

// Mock database and query functions
vi.mock('@/server/db', () => ({
  db: vi.fn(),
}))

vi.mock('@/server/db/queries/status', () => ({
  getClientCurrentStatus: vi.fn(),
  updateClientPeriodStatus: vi.fn(),
  recordStatusEvent: vi.fn(),
  createClientPeriodStatus: vi.fn(),
}))

vi.mock('@/lib/territories/filter', () => ({
  getUserBranchFilter: vi.fn(),
}))

vi.mock('@/lib/permissions', () => ({
  hasPermission: vi.fn(),
}))

vi.mock('@/lib/status/validation', () => ({
  validateStatusUpdate: vi.fn(),
  isTerminalStatus: vi.fn(),
}))

describe('Status Bulk Update Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/status/bulk-update', () => {
    it('should bulk update client status with permission', async () => {
      const requestBody = {
        updates: [
          {
            clientId: 'client-1',
            periodType: 'monthly',
            periodYear: 2024,
            periodMonth: 1,
            statusId: 'status-2',
            reasonId: 'reason-1',
            remarks: 'Test remarks',
            hasPayment: false,
          },
          {
            clientId: 'client-2',
            periodType: 'monthly',
            periodYear: 2024,
            periodMonth: 1,
            statusId: 'status-2',
            reasonId: 'reason-1',
            remarks: 'Test remarks',
            hasPayment: false,
          },
        ],
      }

      const mockCurrentStatus = {
        id: 'status-1',
        clientId: 'client-1',
        statusTypeId: 'status-1',
        updateCount: 0,
      }

      const mockUpdatedStatus = {
        id: 'status-1',
        clientId: 'client-1',
        statusTypeId: 'status-2',
      }

      const mockEvent = {
        id: 'event-1',
        eventSequence: 1,
      }

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getUserBranchFilter).mockResolvedValue({
        scope: 'all',
        branchIds: [],
      })
      vi.mocked(getClientCurrentStatus).mockResolvedValue(mockCurrentStatus)
      vi.mocked(validateStatusUpdate).mockResolvedValue({ isValid: true })
      vi.mocked(updateClientPeriodStatus).mockResolvedValue(mockUpdatedStatus)
      vi.mocked(recordStatusEvent).mockResolvedValue(mockEvent)
      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          { id: 'client-1', branchId: 'branch-1', productId: 'product-1' },
          { companyId: 'company-1' },
          { id: 'client-2', branchId: 'branch-2', productId: 'product-2' },
          { companyId: 'company-1' },
        ]),
      })

      const app = new Hono()
      app.route('/', statusBulkUpdateRoutes)

      const response = await app.request('/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.successful).toBe(2)
      expect(json.data.failed).toBe(0)
      expect(json.data.results).toHaveLength(2)
      expect(json.data.results[0].success).toBe(true)
      expect(json.data.results[1].success).toBe(true)
      expect(hasPermission).toHaveBeenCalledWith(expect.any(String), expect.any(String), 'status', 'bulk_update')
    })

    it('should return 403 when user lacks permission', async () => {
      const requestBody = {
        updates: [
          {
            clientId: 'client-1',
            periodType: 'monthly',
            periodYear: 2024,
            statusId: 'status-2',
          },
        ],
      }

      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', statusBulkUpdateRoutes)

      const response = await app.request('/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })

    it('should return all failed when user has no territory access', async () => {
      const requestBody = {
        updates: [
          {
            clientId: 'client-1',
            periodType: 'monthly',
            periodYear: 2024,
            statusId: 'status-2',
          },
          {
            clientId: 'client-2',
            periodType: 'monthly',
            periodYear: 2024,
            statusId: 'status-2',
          },
        ],
      }

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getUserBranchFilter).mockResolvedValue({
        scope: 'none',
        branchIds: [],
      })

      const app = new Hono()
      app.route('/', statusBulkUpdateRoutes)

      const response = await app.request('/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.successful).toBe(0)
      expect(json.data.failed).toBe(2)
      expect(json.data.results[0].success).toBe(false)
      expect(json.data.results[1].success).toBe(false)
    })

    it('should handle mixed success and failure', async () => {
      const requestBody = {
        updates: [
          {
            clientId: 'client-1',
            periodType: 'monthly',
            periodYear: 2024,
            statusId: 'status-2',
          },
          {
            clientId: 'client-2',
            periodType: 'monthly',
            periodYear: 2024,
            statusId: 'status-2',
          },
        ],
      }

      const mockCurrentStatus = {
        id: 'status-1',
        clientId: 'client-1',
        statusTypeId: 'status-1',
        updateCount: 0,
      }

      const mockUpdatedStatus = {
        id: 'status-1',
        clientId: 'client-1',
        statusTypeId: 'status-2',
      }

      const mockEvent = {
        id: 'event-1',
        eventSequence: 1,
      }

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getUserBranchFilter).mockResolvedValue({
        scope: 'territory',
        branchIds: ['branch-1'],
      })
      vi.mocked(getClientCurrentStatus).mockResolvedValue(mockCurrentStatus)
      vi.mocked(validateStatusUpdate).mockResolvedValue({ isValid: true })
      vi.mocked(updateClientPeriodStatus).mockResolvedValue(mockUpdatedStatus)
      vi.mocked(recordStatusEvent).mockResolvedValue(mockEvent)
      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          { id: 'client-1', branchId: 'branch-1', productId: 'product-1' },
          { companyId: 'company-1' },
          { id: 'client-2', branchId: 'branch-2', productId: 'product-2' },
          { companyId: 'company-1' },
        ]),
      })

      const app = new Hono()
      app.route('/', statusBulkUpdateRoutes)

      const response = await app.request('/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.successful).toBe(1)
      expect(json.data.failed).toBe(1)
      expect(json.data.results[0].success).toBe(true)
      expect(json.data.results[1].success).toBe(false)
    })

    it('should validate updates array is not empty', async () => {
      const requestBody = {
        updates: [],
      }

      vi.mocked(hasPermission).mockResolvedValue(true)

      const app = new Hono()
      app.route('/', statusBulkUpdateRoutes)

      const response = await app.request('/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
    })

    it('should validate updates array maximum size', async () => {
      const requestBody = {
        updates: Array(101).fill({
          clientId: 'client-1',
          periodType: 'monthly',
          periodYear: 2024,
          statusId: 'status-2',
        }),
      }

      vi.mocked(hasPermission).mockResolvedValue(true)

      const app = new Hono()
      app.route('/', statusBulkUpdateRoutes)

      const response = await app.request('/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
    })

    it('should return 500 on error', async () => {
      const requestBody = {
        updates: [
          {
            clientId: 'client-1',
            periodType: 'monthly',
            periodYear: 2024,
            statusId: 'status-2',
          },
        ],
      }

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getUserBranchFilter).mockRejectedValue(new Error('Database error'))

      const app = new Hono()
      app.route('/', statusBulkUpdateRoutes)

      const response = await app.request('/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('INTERNAL_ERROR')
    })
  })
})
