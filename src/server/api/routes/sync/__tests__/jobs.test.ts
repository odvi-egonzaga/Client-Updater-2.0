import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { syncJobsRoutes } from '../jobs'
import { db } from '@/server/db'
import { getRecentSyncJobs, getSyncJob, createSyncJob } from '@/server/db/queries/sync'
import { snowflakeSyncService } from '@/lib/sync/snowflake-sync'
import { hasPermission } from '@/lib/permissions'

// Mock database and query functions
vi.mock('@/server/db', () => ({
  db: vi.fn(),
}))

vi.mock('@/server/db/queries/sync', () => ({
  getRecentSyncJobs: vi.fn(),
  getSyncJob: vi.fn(),
  createSyncJob: vi.fn(),
}))

vi.mock('@/lib/sync/snowflake-sync', () => ({
  snowflakeSyncService: {
    sync: vi.fn(),
    fetchPreview: vi.fn(),
  },
}))

vi.mock('@/lib/permissions', () => ({
  hasPermission: vi.fn(),
}))

describe('Sync Jobs Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/sync/jobs', () => {
    it('should return recent sync jobs with permission', async () => {
      const mockJobs = [
        {
          id: '1',
          type: 'snowflake',
          status: 'completed',
          recordsProcessed: 100,
          recordsCreated: 50,
          recordsUpdated: 50,
          createdAt: new Date(),
        },
      ]

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getRecentSyncJobs).mockResolvedValue(mockJobs as any)

      const app = new Hono()
      app.route('/', syncJobsRoutes)

      const response = await app.request('/jobs')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockJobs)
      expect(hasPermission).toHaveBeenCalledWith(expect.any(String), expect.any(String), 'sync', 'execute')
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', syncJobsRoutes)

      const response = await app.request('/jobs')
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })

    it('should return 500 on error', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getRecentSyncJobs).mockRejectedValue(new Error('Database error'))

      const app = new Hono()
      app.route('/', syncJobsRoutes)

      const response = await app.request('/jobs')
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.success).toBe(false)
      expect(json.error.message).toBe('Database error')
    })
  })

  describe('GET /api/sync/jobs/:id', () => {
    it('should return sync job details with permission', async () => {
      const mockJob = {
        id: '1',
        type: 'snowflake',
        status: 'completed',
        recordsProcessed: 100,
        recordsCreated: 50,
        recordsUpdated: 50,
        createdAt: new Date(),
      }

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getSyncJob).mockResolvedValue(mockJob as any)

      const app = new Hono()
      app.route('/', syncJobsRoutes)

      const response = await app.request('/jobs/1')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockJob)
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', syncJobsRoutes)

      const response = await app.request('/jobs/1')
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })

    it('should return 404 when job not found', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getSyncJob).mockResolvedValue(null)

      const app = new Hono()
      app.route('/', syncJobsRoutes)

      const response = await app.request('/jobs/1')
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('NOT_FOUND')
    })

    it('should return 500 on error', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getSyncJob).mockRejectedValue(new Error('Database error'))

      const app = new Hono()
      app.route('/', syncJobsRoutes)

      const response = await app.request('/jobs/1')
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.success).toBe(false)
      expect(json.error.message).toBe('Database error')
    })
  })

  describe('POST /api/sync/jobs', () => {
    it('should trigger snowflake sync with permission', async () => {
      const syncResult = {
        totalProcessed: 100,
        created: 50,
        updated: 50,
        skipped: 0,
        failed: 0,
        syncJobId: 'job1',
        processingTimeMs: 1000,
      }

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(snowflakeSyncService.sync).mockResolvedValue(syncResult as any)

      const app = new Hono()
      app.route('/', syncJobsRoutes)

      const response = await app.request('/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'snowflake',
          options: {
            branchCodes: ['branch1', 'branch2'],
            dryRun: false,
          },
        }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(syncResult)
      expect(snowflakeSyncService.sync).toHaveBeenCalledWith({
        branchCodes: ['branch1', 'branch2'],
        recordChanges: true,
      })
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', syncJobsRoutes)

      const response = await app.request('/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'snowflake',
        }),
      })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })

    it('should return 501 for nextbank sync (not implemented)', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true)

      const app = new Hono()
      app.route('/', syncJobsRoutes)

      const response = await app.request('/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'nextbank',
        }),
      })
      const json = await response.json()

      expect(response.status).toBe(501)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('NOT_IMPLEMENTED')
    })

    it('should return 400 for invalid sync type', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true)

      const app = new Hono()
      app.route('/', syncJobsRoutes)

      const response = await app.request('/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'invalid',
        }),
      })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
    })

    it('should return 500 on error', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(snowflakeSyncService.sync).mockRejectedValue(new Error('Sync error'))

      const app = new Hono()
      app.route('/', syncJobsRoutes)

      const response = await app.request('/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'snowflake',
        }),
      })
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.success).toBe(false)
      expect(json.error.message).toBe('Sync error')
    })
  })

  describe('POST /api/sync/jobs/preview', () => {
    it('should return snowflake preview with permission', async () => {
      const mockPreview = [
        {
          CLIENT_CODE: 'C001',
          FULL_NAME: 'Test Client',
          PENSION_NUMBER: 'P001',
        },
      ]

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(snowflakeSyncService.fetchPreview).mockResolvedValue(mockPreview as any)

      const app = new Hono()
      app.route('/', syncJobsRoutes)

      const response = await app.request('/jobs/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'snowflake',
          options: {
            branchCodes: ['branch1'],
          },
        }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockPreview)
      expect(snowflakeSyncService.fetchPreview).toHaveBeenCalledWith(['branch1'], 100)
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', syncJobsRoutes)

      const response = await app.request('/jobs/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'snowflake',
        }),
      })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })

    it('should return 501 for nextbank preview (not implemented)', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true)

      const app = new Hono()
      app.route('/', syncJobsRoutes)

      const response = await app.request('/jobs/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'nextbank',
        }),
      })
      const json = await response.json()

      expect(response.status).toBe(501)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('NOT_IMPLEMENTED')
    })

    it('should return 500 on error', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(snowflakeSyncService.fetchPreview).mockRejectedValue(new Error('Preview error'))

      const app = new Hono()
      app.route('/', syncJobsRoutes)

      const response = await app.request('/jobs/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'snowflake',
        }),
      })
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.success).toBe(false)
      expect(json.error.message).toBe('Preview error')
    })
  })
})
