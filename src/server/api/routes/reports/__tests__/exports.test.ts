/**
 * Tests for export jobs API routes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Hono } from 'hono'
import { exportsRoutes } from '../exports'
import { createExportJob, getExportJob, listExportJobs, getDownloadUrl } from '@/features/exports/services/export.service'
import { processExportJob } from '@/features/exports/handlers/process-export.handler'
import { hasPermission } from '@/lib/permissions'

// Mock export service functions
vi.mock('@/features/exports/services/export.service', () => ({
  createExportJob: vi.fn(),
  getExportJob: vi.fn(),
  listExportJobs: vi.fn(),
  getDownloadUrl: vi.fn(),
}))

vi.mock('@/features/exports/handlers/process-export.handler', () => ({
  processExportJob: vi.fn(),
}))

vi.mock('@/lib/permissions', () => ({
  hasPermission: vi.fn(),
}))

describe('Export Jobs Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('POST /api/reports/exports', () => {
    it('should create export job with permission', async () => {
      const mockJob = {
        id: 'job1',
        type: 'clients',
        format: 'csv',
        name: 'Test Export',
        status: 'pending',
        createdBy: 'user1',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(createExportJob).mockResolvedValue(mockJob)
      vi.mocked(processExportJob).mockResolvedValue(undefined)

      const app = new Hono()
      app.route('/', exportsRoutes)

      const response = await app.request('/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'clients',
          format: 'csv',
          name: 'Test Export',
          parameters: {
            companyId: 'company1',
            periodYear: 2024,
            periodMonth: 1,
          },
        }),
      })
      const json = await response.json()

      expect(response.status).toBe(202)
      expect(json.success).toBe(true)
      expect(json.data.id).toBe('job1')
      expect(json.data.status).toBe('pending')
      expect(createExportJob).toHaveBeenCalled()
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', exportsRoutes)

      const response = await app.request('/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'clients',
          format: 'csv',
          name: 'Test Export',
        }),
      })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })

    it('should validate export type', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true)

      const app = new Hono()
      app.route('/', exportsRoutes)

      const response = await app.request('/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'invalid_type',
          format: 'csv',
          name: 'Test Export',
        }),
      })
      const json = await response.json()

      expect(response.status).toBe(400)
    })

    it('should validate export format', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true)

      const app = new Hono()
      app.route('/', exportsRoutes)

      const response = await app.request('/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'clients',
          format: 'invalid_format',
          name: 'Test Export',
        }),
      })
      const json = await response.json()

      expect(response.status).toBe(400)
    })

    it('should start async processing', async () => {
      const mockJob = {
        id: 'job1',
        type: 'clients',
        format: 'csv',
        name: 'Test Export',
        status: 'pending',
        createdBy: 'user1',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(createExportJob).mockResolvedValue(mockJob)
      vi.mocked(processExportJob).mockResolvedValue(undefined)

      const app = new Hono()
      app.route('/', exportsRoutes)

      const response = await app.request('/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'clients',
          format: 'csv',
          name: 'Test Export',
        }),
      })

      expect(response.status).toBe(202)
      
      // Advance timers to trigger setTimeout
      vi.advanceTimersByTime(100)
      
      expect(processExportJob).toHaveBeenCalledWith('job1')
    })
  })

  describe('GET /api/reports/exports', () => {
    it('should list user exports with permission', async () => {
      const mockExports = [
        {
          id: 'job1',
          type: 'clients',
          format: 'csv',
          name: 'Test Export 1',
          status: 'completed',
          createdBy: 'user1',
          createdAt: new Date(),
        },
        {
          id: 'job2',
          type: 'client_status',
          format: 'xlsx',
          name: 'Test Export 2',
          status: 'pending',
          createdBy: 'user1',
          createdAt: new Date(),
        },
      ]

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(listExportJobs).mockResolvedValue({
        data: mockExports,
        total: 2,
        page: 1,
        pageSize: 25,
        totalPages: 1,
      })

      const app = new Hono()
      app.route('/', exportsRoutes)

      const response = await app.request('/?page=1&pageSize=25')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockExports)
      expect(json.meta).toEqual({
        page: 1,
        pageSize: 25,
        total: 2,
        totalPages: 1,
      })
    })

    it('should filter by status when provided', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(listExportJobs).mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        pageSize: 25,
        totalPages: 0,
      })

      const app = new Hono()
      app.route('/', exportsRoutes)

      const response = await app.request('/?status=completed')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(listExportJobs).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
        })
      )
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', exportsRoutes)

      const response = await app.request('/')
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })
  })

  describe('GET /api/reports/exports/:id', () => {
    it('should get export job with permission', async () => {
      const mockJob = {
        id: 'job1',
        type: 'clients',
        format: 'csv',
        name: 'Test Export',
        status: 'completed',
        createdBy: 'user1',
        createdAt: new Date(),
      }

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getExportJob).mockResolvedValue(mockJob)

      const app = new Hono()
      app.route('/', exportsRoutes)

      const response = await app.request('/job1')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockJob)
    })

    it('should return 404 when export not found', async () => {
      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getExportJob).mockResolvedValue(null)

      const app = new Hono()
      app.route('/', exportsRoutes)

      const response = await app.request('/nonexistent')
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('NOT_FOUND')
    })

    it('should return 403 when user does not own the export', async () => {
      const mockJob = {
        id: 'job1',
        type: 'clients',
        format: 'csv',
        name: 'Test Export',
        status: 'completed',
        createdBy: 'other_user',
        createdAt: new Date(),
      }

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getExportJob).mockResolvedValue(mockJob)

      const app = new Hono()
      app.route('/', exportsRoutes)

      const response = await app.request('/job1')
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', exportsRoutes)

      const response = await app.request('/job1')
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })
  })

  describe('GET /api/reports/exports/:id/download', () => {
    it('should generate download URL for completed export', async () => {
      const mockJob = {
        id: 'job1',
        type: 'clients',
        format: 'csv',
        name: 'Test Export',
        status: 'completed',
        filePath: 'exports/user1/test.csv',
        fileName: 'test.csv',
        fileSize: 1024,
        createdBy: 'user1',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }

      const mockDownloadUrl = 'https://example.com/signed-url'

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getExportJob).mockResolvedValue(mockJob)
      vi.mocked(getDownloadUrl).mockResolvedValue(mockDownloadUrl)

      const app = new Hono()
      app.route('/', exportsRoutes)

      const response = await app.request('/job1/download')
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.downloadUrl).toBe(mockDownloadUrl)
      expect(json.data.fileName).toBe('test.csv')
      expect(json.data.fileSize).toBe(1024)
    })

    it('should return 400 when export is not completed', async () => {
      const mockJob = {
        id: 'job1',
        type: 'clients',
        format: 'csv',
        name: 'Test Export',
        status: 'pending',
        createdBy: 'user1',
        createdAt: new Date(),
      }

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getExportJob).mockResolvedValue(mockJob)

      const app = new Hono()
      app.route('/', exportsRoutes)

      const response = await app.request('/job1/download')
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('INVALID_STATE')
    })

    it('should return 410 when export has expired', async () => {
      const mockJob = {
        id: 'job1',
        type: 'clients',
        format: 'csv',
        name: 'Test Export',
        status: 'completed',
        filePath: 'exports/user1/test.csv',
        fileName: 'test.csv',
        fileSize: 1024,
        createdBy: 'user1',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired
      }

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getExportJob).mockResolvedValue(mockJob)

      const app = new Hono()
      app.route('/', exportsRoutes)

      const response = await app.request('/job1/download')
      const json = await response.json()

      expect(response.status).toBe(410)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('EXPIRED')
    })

    it('should return 404 when export file not found', async () => {
      const mockJob = {
        id: 'job1',
        type: 'clients',
        format: 'csv',
        name: 'Test Export',
        status: 'completed',
        createdBy: 'user1',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getExportJob).mockResolvedValue(mockJob)

      const app = new Hono()
      app.route('/', exportsRoutes)

      const response = await app.request('/job1/download')
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('NOT_FOUND')
    })

    it('should return 403 when user does not own the export', async () => {
      const mockJob = {
        id: 'job1',
        type: 'clients',
        format: 'csv',
        name: 'Test Export',
        status: 'completed',
        filePath: 'exports/user1/test.csv',
        fileName: 'test.csv',
        fileSize: 1024,
        createdBy: 'other_user',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }

      vi.mocked(hasPermission).mockResolvedValue(true)
      vi.mocked(getExportJob).mockResolvedValue(mockJob)

      const app = new Hono()
      app.route('/', exportsRoutes)

      const response = await app.request('/job1/download')
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })

    it('should return 403 when user lacks permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      const app = new Hono()
      app.route('/', exportsRoutes)

      const response = await app.request('/job1/download')
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
    })
  })
})
