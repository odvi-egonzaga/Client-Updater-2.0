import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { configAuditRoutes } from '../config-audit'
import { getConfigAuditLog } from '@/server/db/queries/config'
import { hasPermission } from '@/lib/permissions'

// Mock database and query functions
vi.mock('@/server/db/queries/config', () => ({
  getConfigAuditLog: vi.fn(),
}))

vi.mock('@/lib/permissions', () => ({
  hasPermission: vi.fn(),
}))

describe('Config Audit Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/admin/config/audit-log', () => {
    it('should return audit log with permission', async () => {
      const mockAuditLog = [
        {
          id: '1',
          tableName: 'config_options',
          recordId: 'option1',
          action: 'create',
          oldValues: null,
          newValues: {
            id: 'option1',
            code: 'test_option',
            label: 'Test Option',
          },
          changedBy: 'user1',
          ipAddress: '192.168.1.1',
          createdAt: new Date(),
        },
      ]

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getConfigAuditLog).mockResolvedValue(mockAuditLog)

      const app = new Hono()
      app.route('/', configAuditRoutes)

      const response = await app.request('/audit-log')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockAuditLog)
      expect(hasPermission).toHaveBeenCalledWith(expect.any(String), expect.any(String), 'config', 'read')
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', configAuditRoutes)

      const response = await app.request('/audit-log')
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })

    it('should filter by tableName', async () => {
      const mockAuditLog = []

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getConfigAuditLog).mockResolvedValue(mockAuditLog)

      const app = new Hono()
      app.route('/', configAuditRoutes)

      const response = await app.request('/audit-log?tableName=config_options')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockAuditLog)
      expect(getConfigAuditLog).toHaveBeenCalledWith({
        tableName: 'config_options',
        recordId: undefined,
        limit: 50,
      })
    })

    it('should filter by recordId', async () => {
      const mockAuditLog = []

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getConfigAuditLog).mockResolvedValue(mockAuditLog)

      const app = new Hono()
      app.route('/', configAuditRoutes)

      const response = await app.request('/audit-log?recordId=option1')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockAuditLog)
      expect(getConfigAuditLog).toHaveBeenCalledWith({
        tableName: undefined,
        recordId: 'option1',
        limit: 50,
      })
    })

    it('should limit results', async () => {
      const mockAuditLog = []

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getConfigAuditLog).mockResolvedValue(mockAuditLog)

      const app = new Hono()
      app.route('/', configAuditRoutes)

      const response = await app.request('/audit-log?limit=10')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockAuditLog)
      expect(getConfigAuditLog).toHaveBeenCalledWith({
        tableName: undefined,
        recordId: undefined,
        limit: 10,
      })
    })

    it('should combine filters', async () => {
      const mockAuditLog = []

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getConfigAuditLog).mockResolvedValue(mockAuditLog)

      const app = new Hono()
      app.route('/', configAuditRoutes)

      const response = await app.request('/audit-log?tableName=config_options&recordId=option1&limit=25')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockAuditLog)
      expect(getConfigAuditLog).toHaveBeenCalledWith({
        tableName: 'config_options',
        recordId: 'option1',
        limit: 25,
      })
    })
  })
})
