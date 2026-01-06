import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { clientStatusRoutes } from '../client-status'
import { db } from '@/server/db'
import {
  getClientCurrentStatus,
  getClientStatusHistory,
} from '@/server/db/queries/status'
import { hasPermission } from '@/lib/permissions'

// Mock database and query functions
vi.mock('@/server/db', () => ({
  db: vi.fn(),
}))

vi.mock('@/server/db/queries/status', () => ({
  getClientCurrentStatus: vi.fn(),
  getClientStatusHistory: vi.fn(),
}))

vi.mock('@/lib/permissions', () => ({
  hasPermission: vi.fn(),
}))

describe('Client Status Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/status/:clientId', () => {
    it('should return client status with permission', async () => {
      const mockStatus = {
        id: 'status-1',
        clientId: 'client-1',
        periodType: 'monthly',
        periodYear: 2024,
        periodMonth: 1,
        periodQuarter: null,
        statusTypeId: 'status-1',
        statusTypeName: 'PENDING',
        reasonId: 'reason-1',
        reasonName: 'No response',
        remarks: 'Test remarks',
        hasPayment: false,
        updateCount: 0,
        isTerminal: false,
        updatedBy: 'user-1',
        updatedAt: new Date(),
        createdAt: new Date(),
      }

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getClientCurrentStatus).mockResolvedValue(mockStatus)
      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: 'user-1', name: 'Test User' }]),
      })

      const app = new Hono()
      app.route('/', clientStatusRoutes)

      const response = await app.request('/client-1?periodType=monthly&periodYear=2024&periodMonth=1')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.clientId).toBe('client-1')
      expect(json.data.status.name).toBe('PENDING')
      expect(json.data.hasPayment).toBe(false)
      expect(hasPermission).toHaveBeenCalledWith(expect.any(String), expect.any(String), 'status', 'read')
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', clientStatusRoutes)

      const response = await app.request('/client-1?periodType=monthly&periodYear=2024')
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })

    it('should return 404 when client status not found', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getClientCurrentStatus).mockResolvedValue(null)

      const app = new Hono()
      app.route('/', clientStatusRoutes)

      const response = await app.request('/client-1?periodType=monthly&periodYear=2024')
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('NOT_FOUND')
    })

    it('should validate required query parameters', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true)

      const app = new Hono()
      app.route('/', clientStatusRoutes)

      // Missing periodType
      const response1 = await app.request('/client-1?periodYear=2024')
      const json1 = await response1.json()

      expect(response1.status).toBe(400)
      expect(json1.success).toBe(false)

      // Missing periodYear
      const response2 = await app.request('/client-1?periodType=monthly')
      const json2 = await response2.json()

      expect(response2.status).toBe(400)
      expect(json2.success).toBe(false)
    })

    it('should return 500 on error', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getClientCurrentStatus).mockRejectedValue(new Error('Database error'))

      const app = new Hono()
      app.route('/', clientStatusRoutes)

      const response = await app.request('/client-1?periodType=monthly&periodYear=2024')
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('INTERNAL_ERROR')
    })
  })

  describe('GET /api/status/:clientId/history', () => {
    it('should return client status history with permission', async () => {
      const mockHistory = [
        {
          id: 'event-1',
          clientPeriodStatusId: 'status-1',
          statusTypeId: 'status-1',
          statusTypeName: 'PENDING',
          reasonId: 'reason-1',
          reasonName: 'No response',
          remarks: 'Test remarks',
          hasPayment: false,
          eventSequence: 1,
          createdBy: 'user-1',
          createdAt: new Date(),
        },
        {
          id: 'event-2',
          clientPeriodStatusId: 'status-1',
          statusTypeId: 'status-2',
          statusTypeName: 'TO_FOLLOW',
          reasonId: 'reason-2',
          reasonName: 'Followed up',
          remarks: 'Followed up',
          hasPayment: true,
          eventSequence: 2,
          createdBy: 'user-2',
          createdAt: new Date(),
        },
      ]

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getClientStatusHistory).mockResolvedValue(mockHistory)
      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          { id: 'user-1', name: 'Test User 1' },
          { id: 'user-2', name: 'Test User 2' },
        ]),
      })

      const app = new Hono()
      app.route('/', clientStatusRoutes)

      const response = await app.request('/client-1/history?limit=50')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toHaveLength(2)
      expect(json.data[0].status.name).toBe('PENDING')
      expect(json.data[1].status.name).toBe('TO_FOLLOW')
      expect(json.meta.total).toBe(2)
      expect(json.meta.limit).toBe(50)
      expect(hasPermission).toHaveBeenCalledWith(expect.any(String), expect.any(String), 'status', 'read')
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', clientStatusRoutes)

      const response = await app.request('/client-1/history')
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })

    it('should use default limit when not provided', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getClientStatusHistory).mockResolvedValue([])

      const app = new Hono()
      app.route('/', clientStatusRoutes)

      const response = await app.request('/client-1/history')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.meta.limit).toBe(50)
      expect(getClientStatusHistory).toHaveBeenCalledWith(db, 'client-1', 50)
    })

    it('should validate limit range', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true)

      const app = new Hono()
      app.route('/', clientStatusRoutes)

      // Invalid limit (0)
      const response1 = await app.request('/client-1/history?limit=0')
      const json1 = await response1.json()

      expect(response1.status).toBe(400)
      expect(json1.success).toBe(false)

      // Invalid limit (101)
      const response2 = await app.request('/client-1/history?limit=101')
      const json2 = await response2.json()

      expect(response2.status).toBe(400)
      expect(json2.success).toBe(false)
    })

    it('should return 500 on error', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getClientStatusHistory).mockRejectedValue(new Error('Database error'))

      const app = new Hono()
      app.route('/', clientStatusRoutes)

      const response = await app.request('/client-1/history')
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('INTERNAL_ERROR')
    })
  })
})
