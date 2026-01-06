import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { statusHistoryRoutes } from '../history'
import { db } from '@/server/db'
import { hasPermission } from '@/lib/permissions'

// Mock database and query functions
vi.mock('@/server/db', () => ({
  db: vi.fn(),
}))

vi.mock('@/lib/permissions', () => ({
  hasPermission: vi.fn(),
}))

describe('Status History Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/status/history/:id', () => {
    it('should return status history record with permission', async () => {
      const mockEvent = {
        id: 'event-1',
        eventSequence: 1,
        statusTypeId: 'status-1',
        statusTypeName: 'PENDING',
        reasonId: 'reason-1',
        reasonName: 'No response',
        remarks: 'Test remarks',
        hasPayment: false,
        createdBy: 'user-1',
        createdAt: new Date(),
      }

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockEvent]),
      })

      const app = new Hono()
      app.route('/', statusHistoryRoutes)

      const response = await app.request('/history/event-1')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.id).toBe('event-1')
      expect(json.data.status.name).toBe('PENDING')
      expect(json.data.hasPayment).toBe(false)
      expect(hasPermission).toHaveBeenCalledWith(expect.any(String), expect.any(String), 'status', 'read')
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', statusHistoryRoutes)

      const response = await app.request('/history/event-1')
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })

    it('should return 404 when history record not found', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      const app = new Hono()
      app.route('/', statusHistoryRoutes)

      const response = await app.request('/history/event-1')
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('NOT_FOUND')
    })

    it('should return 500 on error', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(db).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockRejectedValue(new Error('Database error')),
      })

      const app = new Hono()
      app.route('/', statusHistoryRoutes)

      const response = await app.request('/history/event-1')
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('INTERNAL_ERROR')
    })
  })
})
