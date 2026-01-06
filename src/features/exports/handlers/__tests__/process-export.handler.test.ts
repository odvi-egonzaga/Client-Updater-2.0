/**
 * Tests for export queue handler
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { processExportJob, getExportTypes, isExportTypeAvailable } from '../process-export.handler'
import { getExportJob, startExportJob, completeExportJob, failExportJob, uploadExportFile } from '../../services/export.service'
import { processClientExport } from '../../processors/client-export.processor'
import { processStatusExport } from '../../processors/status-export.processor'
import { logger } from '@/lib/logger'

// Mock dependencies
vi.mock('../../services/export.service')
vi.mock('../../processors/client-export.processor')
vi.mock('../../processors/status-export.processor')
vi.mock('@/lib/logger')

describe('Export Queue Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('processExportJob', () => {
    it('should process a client export job successfully', async () => {
      const mockJob = {
        id: 'job-id',
        type: 'clients',
        format: 'xlsx',
        name: 'Test Export',
        status: 'pending',
        parameters: { branchIds: ['branch-1'] },
        createdBy: 'user-id',
        expiresAt: new Date(),
        createdAt: new Date(),
      }

      vi.mocked(getExportJob).mockResolvedValue(mockJob)
      vi.mocked(startExportJob).mockResolvedValue(undefined)
      vi.mocked(processClientExport).mockResolvedValue({
        buffer: Buffer.from('xlsx data'),
        fileName: 'clients-export.xlsx',
        rowCount: 100,
      })
      vi.mocked(uploadExportFile).mockResolvedValue('exports/user-id/clients-export.xlsx')
      vi.mocked(completeExportJob).mockResolvedValue(undefined)

      await processExportJob('job-id')

      expect(getExportJob).toHaveBeenCalledWith('job-id')
      expect(startExportJob).toHaveBeenCalledWith('job-id')
      expect(processClientExport).toHaveBeenCalledWith({
        jobId: 'job-id',
        parameters: { branchIds: ['branch-1'] },
      })
      expect(uploadExportFile).toHaveBeenCalledWith({
        buffer: Buffer.from('xlsx data'),
        fileName: 'clients-export.xlsx',
        userId: 'user-id',
      })
      expect(completeExportJob).toHaveBeenCalledWith({
        id: 'job-id',
        filePath: 'exports/user-id/clients-export.xlsx',
        fileName: 'clients-export.xlsx',
        fileSize: 9,
        rowCount: 100,
      })
      expect(logger.info).toHaveBeenCalledWith('Processing export job', expect.any(Object))
      expect(logger.info).toHaveBeenCalledWith('Export job processed successfully', expect.any(Object))
    })

    it('should process a status export job successfully', async () => {
      const mockJob = {
        id: 'job-id',
        type: 'client_status',
        format: 'csv',
        name: 'Test Export',
        status: 'pending',
        parameters: { periodYear: 2024, periodMonth: 1 },
        createdBy: 'user-id',
        expiresAt: new Date(),
        createdAt: new Date(),
      }

      vi.mocked(getExportJob).mockResolvedValue(mockJob)
      vi.mocked(startExportJob).mockResolvedValue(undefined)
      vi.mocked(processStatusExport).mockResolvedValue({
        buffer: Buffer.from('csv data'),
        fileName: 'status-export.csv',
        rowCount: 50,
      })
      vi.mocked(uploadExportFile).mockResolvedValue('exports/user-id/status-export.csv')
      vi.mocked(completeExportJob).mockResolvedValue(undefined)

      await processExportJob('job-id')

      expect(getExportJob).toHaveBeenCalledWith('job-id')
      expect(startExportJob).toHaveBeenCalledWith('job-id')
      expect(processStatusExport).toHaveBeenCalledWith({
        jobId: 'job-id',
        parameters: { periodYear: 2024, periodMonth: 1 },
      })
      expect(uploadExportFile).toHaveBeenCalledWith({
        buffer: Buffer.from('csv data'),
        fileName: 'status-export.csv',
        userId: 'user-id',
      })
      expect(completeExportJob).toHaveBeenCalledWith({
        id: 'job-id',
        filePath: 'exports/user-id/status-export.csv',
        fileName: 'status-export.csv',
        fileSize: 8,
        rowCount: 50,
      })
    })

    it('should not process job if not in pending status', async () => {
      const mockJob = {
        id: 'job-id',
        type: 'clients',
        format: 'xlsx',
        name: 'Test Export',
        status: 'processing',
        parameters: {},
        createdBy: 'user-id',
        expiresAt: new Date(),
        createdAt: new Date(),
      }

      vi.mocked(getExportJob).mockResolvedValue(mockJob)

      await processExportJob('job-id')

      expect(startExportJob).not.toHaveBeenCalled()
      expect(processClientExport).not.toHaveBeenCalled()
      expect(logger.warn).toHaveBeenCalledWith('Export job is not in pending status', expect.any(Object))
    })

    it('should fail job if export type not found', async () => {
      const mockJob = {
        id: 'job-id',
        type: 'unknown_type',
        format: 'xlsx',
        name: 'Test Export',
        status: 'pending',
        parameters: {},
        createdBy: 'user-id',
        expiresAt: new Date(),
        createdAt: new Date(),
      }

      vi.mocked(getExportJob).mockResolvedValue(mockJob)
      vi.mocked(startExportJob).mockResolvedValue(undefined)
      vi.mocked(failExportJob).mockResolvedValue(undefined)

      await expect(processExportJob('job-id')).rejects.toThrow('No processor found for export type: unknown_type')

      expect(failExportJob).toHaveBeenCalledWith('job-id', 'No processor found for export type: unknown_type')
      expect(logger.error).toHaveBeenCalledWith('Failed to process export job', expect.any(Error), expect.any(Object))
    })

    it('should fail job if processor throws error', async () => {
      const mockJob = {
        id: 'job-id',
        type: 'clients',
        format: 'xlsx',
        name: 'Test Export',
        status: 'pending',
        parameters: {},
        createdBy: 'user-id',
        expiresAt: new Date(),
        createdAt: new Date(),
      }

      vi.mocked(getExportJob).mockResolvedValue(mockJob)
      vi.mocked(startExportJob).mockResolvedValue(undefined)
      vi.mocked(processClientExport).mockRejectedValue(new Error('Processor error'))
      vi.mocked(failExportJob).mockResolvedValue(undefined)

      await expect(processExportJob('job-id')).rejects.toThrow('Processor error')

      expect(failExportJob).toHaveBeenCalledWith('job-id', 'Processor error')
      expect(logger.error).toHaveBeenCalledWith('Failed to process export job', expect.any(Error), expect.any(Object))
    })

    it('should fail job if job not found', async () => {
      vi.mocked(getExportJob).mockResolvedValue(null)

      await expect(processExportJob('non-existent-id')).rejects.toThrow('Export job not found: non-existent-id')
    })
  })

  describe('getExportTypes', () => {
    it('should return all available export types', () => {
      const types = getExportTypes()

      expect(types).toEqual([
        'clients',
        'client_status',
        'fcash_summary',
        'pcni_summary',
        'branch_performance',
        'user_activity',
      ])
    })
  })

  describe('isExportTypeAvailable', () => {
    it('should return true for available export types', () => {
      expect(isExportTypeAvailable('clients')).toBe(true)
      expect(isExportTypeAvailable('client_status')).toBe(true)
      expect(isExportTypeAvailable('fcash_summary')).toBe(true)
    })

    it('should return false for unavailable export types', () => {
      expect(isExportTypeAvailable('unknown_type')).toBe(false)
      expect(isExportTypeAvailable('')).toBe(false)
    })
  })
})
