import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as activityLogger from '../activity-logger'

// Mock database
vi.mock('@/server/db/index', () => {
  const mockInsert = vi.fn()
  const mockValues = vi.fn()

  return {
    db: {
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

import { db } from '@/server/db/index'

describe('Activity Logger Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ACTION_TYPES', () => {
    it('should define all auth action types', () => {
      expect(activityLogger.ACTION_TYPES.LOGIN).toBe('LOGIN')
      expect(activityLogger.ACTION_TYPES.LOGOUT).toBe('LOGOUT')
      expect(activityLogger.ACTION_TYPES.REGISTER).toBe('REGISTER')
      expect(activityLogger.ACTION_TYPES.PASSWORD_CHANGE).toBe('PASSWORD_CHANGE')
    })

    it('should define all client action types', () => {
      expect(activityLogger.ACTION_TYPES.CLIENT_VIEW).toBe('CLIENT_VIEW')
      expect(activityLogger.ACTION_TYPES.CLIENT_CREATE).toBe('CLIENT_CREATE')
      expect(activityLogger.ACTION_TYPES.CLIENT_UPDATE).toBe('CLIENT_UPDATE')
      expect(activityLogger.ACTION_TYPES.CLIENT_DELETE).toBe('CLIENT_DELETE')
      expect(activityLogger.ACTION_TYPES.CLIENT_SEARCH).toBe('CLIENT_SEARCH')
    })

    it('should define all status action types', () => {
      expect(activityLogger.ACTION_TYPES.STATUS_VIEW).toBe('STATUS_VIEW')
      expect(activityLogger.ACTION_TYPES.STATUS_UPDATE).toBe('STATUS_UPDATE')
      expect(activityLogger.ACTION_TYPES.STATUS_BULK_UPDATE).toBe('STATUS_BULK_UPDATE')
      expect(activityLogger.ACTION_TYPES.STATUS_HISTORY_VIEW).toBe('STATUS_HISTORY_VIEW')
    })

    it('should define all sync action types', () => {
      expect(activityLogger.ACTION_TYPES.SYNC_START).toBe('SYNC_START')
      expect(activityLogger.ACTION_TYPES.SYNC_COMPLETE).toBe('SYNC_COMPLETE')
      expect(activityLogger.ACTION_TYPES.SYNC_FAIL).toBe('SYNC_FAIL')
    })

    it('should define all export action types', () => {
      expect(activityLogger.ACTION_TYPES.EXPORT_CREATE).toBe('EXPORT_CREATE')
      expect(activityLogger.ACTION_TYPES.EXPORT_DOWNLOAD).toBe('EXPORT_DOWNLOAD')
      expect(activityLogger.ACTION_TYPES.EXPORT_DELETE).toBe('EXPORT_DELETE')
    })

    it('should define all admin action types', () => {
      expect(activityLogger.ACTION_TYPES.CONFIG_UPDATE).toBe('CONFIG_UPDATE')
      expect(activityLogger.ACTION_TYPES.PERMISSION_UPDATE).toBe('PERMISSION_UPDATE')
      expect(activityLogger.ACTION_TYPES.USER_UPDATE).toBe('USER_UPDATE')
      expect(activityLogger.ACTION_TYPES.BRANCH_UPDATE).toBe('BRANCH_UPDATE')
      expect(activityLogger.ACTION_TYPES.AREA_UPDATE).toBe('AREA_UPDATE')
    })

    it('should define all organization action types', () => {
      expect(activityLogger.ACTION_TYPES.BRANCH_CREATE).toBe('BRANCH_CREATE')
      expect(activityLogger.ACTION_TYPES.BRANCH_DELETE).toBe('BRANCH_DELETE')
      expect(activityLogger.ACTION_TYPES.AREA_CREATE).toBe('AREA_CREATE')
      expect(activityLogger.ACTION_TYPES.AREA_DELETE).toBe('AREA_DELETE')
    })
  })

  describe('RESOURCE_TYPES', () => {
    it('should define all resource types', () => {
      expect(activityLogger.RESOURCE_TYPES.USER).toBe('user')
      expect(activityLogger.RESOURCE_TYPES.CLIENT).toBe('client')
      expect(activityLogger.RESOURCE_TYPES.STATUS).toBe('status')
      expect(activityLogger.RESOURCE_TYPES.BRANCH).toBe('branch')
      expect(activityLogger.RESOURCE_TYPES.AREA).toBe('area')
      expect(activityLogger.RESOURCE_TYPES.CONFIG).toBe('config')
      expect(activityLogger.RESOURCE_TYPES.PERMISSION).toBe('permission')
      expect(activityLogger.RESOURCE_TYPES.EXPORT).toBe('export')
      expect(activityLogger.RESOURCE_TYPES.SYNC).toBe('sync')
    })
  })

  describe('logActivity', () => {
    it('should log activity to database', async () => {
      const mockValues = vi.fn().mockResolvedValue([])
      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
      } as any)

      await activityLogger.logActivity({
        userId: 'user-1',
        action: 'TEST_ACTION',
        resource: 'test',
        resourceId: 'resource-1',
        details: { test: 'data' },
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla',
        durationMs: 100,
        statusCode: 200,
      })

      expect(db.insert).toHaveBeenCalled()
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'TEST_ACTION',
          resource: 'test',
          resourceId: 'resource-1',
          details: { test: 'data' },
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla',
          durationMs: 100,
          statusCode: 200,
        })
      )
    })

    it('should never throw errors', async () => {
      const mockValues = vi.fn().mockRejectedValue(new Error('Database error'))
      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
      } as any)

      // Should not throw
      await expect(
        activityLogger.logActivity({
          userId: 'user-1',
          action: 'TEST_ACTION',
        })
      ).resolves.not.toThrow()
    })

    it('should log to console on error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const mockValues = vi.fn().mockRejectedValue(new Error('Database error'))
      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
      } as any)

      await activityLogger.logActivity({
        userId: 'user-1',
        action: 'TEST_ACTION',
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        '[ActivityLogger] Failed to log activity:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })
  })

  describe('extractRequestMeta', () => {
    it('should extract IP address from x-forwarded-for header', () => {
      const request = new Request('http://example.com', {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        },
      })

      const meta = activityLogger.extractRequestMeta(request)

      expect(meta.ipAddress).toBe('192.168.1.1')
    })

    it('should extract IP address from x-real-ip header', () => {
      const request = new Request('http://example.com', {
        headers: {
          'x-real-ip': '192.168.1.1',
        },
      })

      const meta = activityLogger.extractRequestMeta(request)

      expect(meta.ipAddress).toBe('192.168.1.1')
    })

    it('should return unknown IP if no headers present', () => {
      const request = new Request('http://example.com')

      const meta = activityLogger.extractRequestMeta(request)

      expect(meta.ipAddress).toBe('unknown')
    })

    it('should extract user agent', () => {
      const request = new Request('http://example.com', {
        headers: {
          'user-agent': 'Mozilla/5.0',
        },
      })

      const meta = activityLogger.extractRequestMeta(request)

      expect(meta.userAgent).toBe('Mozilla/5.0')
    })

    it('should return unknown user agent if not present', () => {
      const request = new Request('http://example.com')

      const meta = activityLogger.extractRequestMeta(request)

      expect(meta.userAgent).toBe('unknown')
    })
  })

  describe('mapRouteToAction', () => {
    it('should map GET /api/clients to CLIENT_VIEW', () => {
      const { action, resource } = activityLogger.mapRouteToAction('GET', '/api/clients')

      expect(action).toBe('CLIENT_VIEW')
      expect(resource).toBe('client')
    })

    it('should map POST /api/clients to CLIENT_CREATE', () => {
      const { action, resource } = activityLogger.mapRouteToAction('POST', '/api/clients')

      expect(action).toBe('CLIENT_CREATE')
      expect(resource).toBe('client')
    })

    it('should map PATCH /api/clients/:id to CLIENT_UPDATE', () => {
      const { action, resource } = activityLogger.mapRouteToAction('PATCH', '/api/clients/123')

      expect(action).toBe('CLIENT_UPDATE')
      expect(resource).toBe('client')
    })

    it('should map DELETE /api/clients/:id to CLIENT_DELETE', () => {
      const { action, resource } = activityLogger.mapRouteToAction('DELETE', '/api/clients/123')

      expect(action).toBe('CLIENT_DELETE')
      expect(resource).toBe('client')
    })

    it('should map POST /api/status/update to STATUS_UPDATE', () => {
      const { action, resource } = activityLogger.mapRouteToAction('POST', '/api/status/update')

      expect(action).toBe('STATUS_UPDATE')
      expect(resource).toBe('status')
    })

    it('should map POST /api/reports/exports to EXPORT_CREATE', () => {
      const { action, resource } = activityLogger.mapRouteToAction('POST', '/api/reports/exports')

      expect(action).toBe('EXPORT_CREATE')
      expect(resource).toBe('export')
    })

    it('should return generic action for unknown routes', () => {
      const { action, resource } = activityLogger.mapRouteToAction('GET', '/api/unknown')

      expect(action).toBe('GET_api_unknown')
      expect(resource).toBeUndefined()
    })
  })

  describe('logAuthEvent', () => {
    it('should log auth events', async () => {
      const mockValues = vi.fn().mockResolvedValue([])
      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
      } as any)

      await activityLogger.logAuthEvent({
        userId: 'user-1',
        action: 'LOGIN',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla',
        details: { method: 'password' },
      })

      expect(db.insert).toHaveBeenCalled()
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'LOGIN',
          resource: 'user',
          resourceId: 'user-1',
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla',
          details: { method: 'password' },
        })
      )
    })
  })

  describe('logSyncEvent', () => {
    it('should log sync events', async () => {
      const mockValues = vi.fn().mockResolvedValue([])
      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
      } as any)

      await activityLogger.logSyncEvent({
        userId: 'user-1',
        action: 'SYNC_START',
        syncId: 'sync-1',
        details: { source: 'snowflake' },
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla',
        durationMs: 1000,
      })

      expect(db.insert).toHaveBeenCalled()
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'SYNC_START',
          resource: 'sync',
          resourceId: 'sync-1',
          details: { source: 'snowflake' },
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla',
          durationMs: 1000,
        })
      )
    })

    it('should log sync failures', async () => {
      const mockValues = vi.fn().mockResolvedValue([])
      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
      } as any)

      await activityLogger.logSyncEvent({
        userId: 'user-1',
        action: 'SYNC_FAIL',
        syncId: 'sync-1',
        errorMessage: 'Connection timeout',
        durationMs: 5000,
      })

      expect(db.insert).toHaveBeenCalled()
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SYNC_FAIL',
          errorMessage: 'Connection timeout',
          durationMs: 5000,
        })
      )
    })
  })
})
