/**
 * Tests for export service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createExportJob,
  getExportJob,
  listExportJobs,
  startExportJob,
  completeExportJob,
  failExportJob,
  generateXlsx,
  generateCsv,
  uploadExportFile,
  getDownloadUrl,
  cleanupExpiredExports,
} from '../export.service'
import { db } from '@/server/db'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import type { ExportParameters, ExportColumnConfig } from '../../types'

// Mock dependencies
vi.mock('@/server/db')
vi.mock('@/lib/supabase/admin')
vi.mock('@/lib/logger')

describe('Export Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createExportJob', () => {
    it('should create an export job with default expiry', async () => {
      const mockJob = {
        id: 'test-job-id',
        type: 'clients',
        format: 'xlsx',
        name: 'Test Export',
        status: 'pending',
        createdBy: 'user-id',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      }

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockJob]),
      } as any)

      const params = {
        type: 'clients',
        format: 'xlsx',
        name: 'Test Export',
        createdBy: 'user-id',
      }

      const result = await createExportJob(params)

      expect(result).toEqual(mockJob)
      expect(db.insert).toHaveBeenCalled()
      expect(logger.info).toHaveBeenCalledWith('Created export job', expect.any(Object))
    })

    it('should create an export job with custom expiry', async () => {
      const mockJob = {
        id: 'test-job-id',
        type: 'clients',
        format: 'xlsx',
        name: 'Test Export',
        status: 'pending',
        createdBy: 'user-id',
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        createdAt: new Date(),
      }

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockJob]),
      } as any)

      const params = {
        type: 'clients',
        format: 'xlsx',
        name: 'Test Export',
        createdBy: 'user-id',
        expiryHours: 48,
      }

      const result = await createExportJob(params)

      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now() + 47 * 60 * 60 * 1000)
      expect(result.expiresAt.getTime()).toBeLessThan(Date.now() + 49 * 60 * 60 * 1000)
    })
  })

  describe('getExportJob', () => {
    it('should return export job by id', async () => {
      const mockJob = {
        id: 'test-job-id',
        type: 'clients',
        format: 'xlsx',
        name: 'Test Export',
        status: 'pending',
        createdBy: 'user-id',
        expiresAt: new Date(),
        createdAt: new Date(),
      }

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockJob]),
      } as any)

      const result = await getExportJob('test-job-id')

      expect(result).toEqual(mockJob)
      expect(db.select).toHaveBeenCalled()
    })

    it('should return null if job not found', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      } as any)

      const result = await getExportJob('non-existent-id')

      expect(result).toBeNull()
    })
  })

  describe('listExportJobs', () => {
    it('should return paginated export jobs for user', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          type: 'clients',
          format: 'xlsx',
          name: 'Export 1',
          status: 'completed',
          createdBy: 'user-id',
          expiresAt: new Date(),
          createdAt: new Date(),
        },
        {
          id: 'job-2',
          type: 'client_status',
          format: 'csv',
          name: 'Export 2',
          status: 'pending',
          createdBy: 'user-id',
          expiresAt: new Date(),
          createdAt: new Date(),
        },
      ]

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockJobs),
      } as any)

      const result = await listExportJobs({
        userId: 'user-id',
        page: 1,
        pageSize: 25,
      })

      expect(result.data).toEqual(mockJobs)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(25)
      expect(result.total).toBeDefined()
      expect(result.totalPages).toBeDefined()
    })

    it('should filter by status if provided', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          type: 'clients',
          format: 'xlsx',
          name: 'Export 1',
          status: 'completed',
          createdBy: 'user-id',
          expiresAt: new Date(),
          createdAt: new Date(),
        },
      ]

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockJobs),
      } as any)

      const result = await listExportJobs({
        userId: 'user-id',
        status: 'completed',
      })

      expect(result.data).toEqual(mockJobs)
    })
  })

  describe('startExportJob', () => {
    it('should mark job as processing', async () => {
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      } as any)

      await startExportJob('job-id')

      expect(db.update).toHaveBeenCalled()
      expect(logger.info).toHaveBeenCalledWith('Started export job', expect.any(Object))
    })
  })

  describe('completeExportJob', () => {
    it('should update job with completion details', async () => {
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      } as any)

      const params = {
        id: 'job-id',
        filePath: 'exports/user-id/file.xlsx',
        fileName: 'file.xlsx',
        fileSize: 1024,
        rowCount: 100,
      }

      await completeExportJob(params)

      expect(db.update).toHaveBeenCalled()
      expect(logger.info).toHaveBeenCalledWith('Completed export job', expect.any(Object))
    })
  })

  describe('failExportJob', () => {
    it('should mark job as failed with error message', async () => {
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      } as any)

      await failExportJob('job-id', 'Test error')

      expect(db.update).toHaveBeenCalled()
      expect(logger.error).toHaveBeenCalled()
    })
  })

  describe('generateXlsx', () => {
    it('should generate XLSX buffer with data', async () => {
      const columns: ExportColumnConfig[] = [
        { key: 'name', label: 'Name', width: 20 },
        { key: 'age', label: 'Age', width: 10 },
      ]

      const data = [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 },
      ]

      const result = await generateXlsx({
        data,
        columns,
        fileName: 'test.xlsx',
      })

      expect(result).toBeInstanceOf(Buffer)
      expect(result.length).toBeGreaterThan(0)
      expect(logger.info).toHaveBeenCalledWith('Generated XLSX file', expect.any(Object))
    })
  })

  describe('generateCsv', () => {
    it('should generate CSV buffer with data', async () => {
      const columns: ExportColumnConfig[] = [
        { key: 'name', label: 'Name', width: 20 },
        { key: 'age', label: 'Age', width: 10 },
      ]

      const data = [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 },
      ]

      const result = await generateCsv({
        data,
        columns,
        fileName: 'test.csv',
      })

      expect(result).toBeInstanceOf(Buffer)
      expect(result.length).toBeGreaterThan(0)
      expect(result.toString()).toContain('Name,Age')
      expect(result.toString()).toContain('John,30')
      expect(logger.info).toHaveBeenCalledWith('Generated CSV file', expect.any(Object))
    })
  })

  describe('uploadExportFile', () => {
    it('should upload file to Supabase storage', async () => {
      const mockUploadData = {
        path: 'exports/user-id/1234567890-file.xlsx',
      }

      vi.mocked(supabaseAdmin.storage.from().upload).mockResolvedValue({
        data: mockUploadData,
        error: null,
      } as any)

      const buffer = Buffer.from('test data')
      const result = await uploadExportFile({
        buffer,
        fileName: 'file.xlsx',
        userId: 'user-id',
      })

      expect(result).toBe('exports/user-id/1234567890-file.xlsx')
      expect(supabaseAdmin.storage.from().upload).toHaveBeenCalled()
      expect(logger.info).toHaveBeenCalledWith('Uploaded export file', expect.any(Object))
    })

    it('should throw error if upload fails', async () => {
      vi.mocked(supabaseAdmin.storage.from().upload).mockResolvedValue({
        data: null,
        error: new Error('Upload failed'),
      } as any)

      const buffer = Buffer.from('test data')

      await expect(
        uploadExportFile({
          buffer,
          fileName: 'file.xlsx',
          userId: 'user-id',
        })
      ).rejects.toThrow('Upload failed')
    })
  })

  describe('getDownloadUrl', () => {
    it('should generate signed download URL', async () => {
      const mockSignedUrl = 'https://example.com/signed-url'

      vi.mocked(supabaseAdmin.storage.from().createSignedUrl).mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null,
      } as any)

      const result = await getDownloadUrl('exports/user-id/file.xlsx')

      expect(result).toBe(mockSignedUrl)
      expect(supabaseAdmin.storage.from().createSignedUrl).toHaveBeenCalledWith('exports/user-id/file.xlsx', 3600)
      expect(logger.info).toHaveBeenCalledWith('Generated download URL', expect.any(Object))
    })

    it('should throw error if URL generation fails', async () => {
      vi.mocked(supabaseAdmin.storage.from().createSignedUrl).mockResolvedValue({
        data: null,
        error: new Error('Failed to generate URL'),
      } as any)

      await expect(getDownloadUrl('exports/user-id/file.xlsx')).rejects.toThrow('Failed to generate URL')
    })
  })

  describe('cleanupExpiredExports', () => {
    it('should delete expired jobs and files', async () => {
      const expiredJobs = [
        {
          id: 'expired-job-1',
          type: 'clients',
          format: 'xlsx',
          name: 'Expired Export 1',
          status: 'completed',
          filePath: 'exports/user-id/file1.xlsx',
          createdBy: 'user-id',
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
        },
      ]

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(expiredJobs),
      } as any)

      vi.mocked(db.delete).mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      } as any)

      vi.mocked(supabaseAdmin.storage.from().remove).mockResolvedValue({
        data: null,
        error: null,
      } as any)

      const result = await cleanupExpiredExports()

      expect(result).toBe(1)
      expect(supabaseAdmin.storage.from().remove).toHaveBeenCalled()
      expect(db.delete).toHaveBeenCalled()
      expect(logger.info).toHaveBeenCalledWith('Cleaned up expired exports', expect.any(Object))
    })

    it('should return 0 if no expired jobs found', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      } as any)

      const result = await cleanupExpiredExports()

      expect(result).toBe(0)
    })
  })
})
