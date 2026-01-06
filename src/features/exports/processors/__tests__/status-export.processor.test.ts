/**
 * Tests for status export processor
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { processStatusExport } from '../status-export.processor'
import { db } from '@/server/db'
import { logger } from '@/lib/logger'
import { generateXlsx, generateCsv } from '../../services/export.service'
import type { ExportParameters } from '../../types'

// Mock dependencies
vi.mock('@/server/db')
vi.mock('@/lib/logger')
vi.mock('../../services/export.service')

describe('Status Export Processor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('processStatusExport', () => {
    it('should process status export with XLSX format', async () => {
      const mockStatusData = [
        {
          id: 'status-1',
          clientId: 'client-1',
          clientCode: 'C001',
          clientName: 'John Doe',
          periodType: 'monthly',
          periodMonth: 1,
          periodYear: 2024,
          statusTypeName: 'Active',
          reasonName: 'Regular',
          remarks: 'No issues',
          hasPayment: true,
          updateCount: 1,
          isTerminal: false,
          updatedAt: new Date(),
          branchName: 'Branch 1',
          productName: 'Product A',
        },
      ]

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockStatusData),
      } as any)

      vi.mocked(generateXlsx).mockResolvedValue(Buffer.from('xlsx data'))

      const params = {
        jobId: 'job-id',
        parameters: {
          periodYear: 2024,
          periodMonth: 1,
          filters: { format: 'xlsx' },
        } as ExportParameters,
      }

      const result = await processStatusExport(params)

      expect(result.buffer).toBeInstanceOf(Buffer)
      expect(result.fileName).toMatch(/status-export-.*\.xlsx$/)
      expect(result.rowCount).toBe(1)
      expect(generateXlsx).toHaveBeenCalled()
      expect(logger.info).toHaveBeenCalledWith('Processing status export', expect.any(Object))
      expect(logger.info).toHaveBeenCalledWith('Status export completed', expect.any(Object))
    })

    it('should process status export with CSV format', async () => {
      const mockStatusData = [
        {
          id: 'status-1',
          clientId: 'client-1',
          clientCode: 'C001',
          clientName: 'John Doe',
          periodType: 'monthly',
          periodMonth: 1,
          periodYear: 2024,
          statusTypeName: 'Active',
          reasonName: 'Regular',
          remarks: 'No issues',
          hasPayment: true,
          updateCount: 1,
          isTerminal: false,
          updatedAt: new Date(),
          branchName: 'Branch 1',
          productName: 'Product A',
        },
      ]

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockStatusData),
      } as any)

      vi.mocked(generateCsv).mockResolvedValue(Buffer.from('csv data'))

      const params = {
        jobId: 'job-id',
        parameters: {
          periodYear: 2024,
          periodMonth: 1,
          filters: { format: 'csv' },
        } as ExportParameters,
      }

      const result = await processStatusExport(params)

      expect(result.buffer).toBeInstanceOf(Buffer)
      expect(result.fileName).toMatch(/status-export-.*\.csv$/)
      expect(result.rowCount).toBe(1)
      expect(generateCsv).toHaveBeenCalled()
    })

    it('should filter by branch IDs', async () => {
      const mockStatusData = [
        {
          id: 'status-1',
          clientId: 'client-1',
          clientCode: 'C001',
          clientName: 'John Doe',
          periodType: 'monthly',
          periodMonth: 1,
          periodYear: 2024,
          statusTypeName: 'Active',
          reasonName: 'Regular',
          remarks: 'No issues',
          hasPayment: true,
          updateCount: 1,
          isTerminal: false,
          updatedAt: new Date(),
          branchName: 'Branch 1',
          productName: 'Product A',
        },
      ]

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockStatusData),
      } as any)

      vi.mocked(generateXlsx).mockResolvedValue(Buffer.from('xlsx data'))

      const params = {
        jobId: 'job-id',
        parameters: {
          branchIds: ['branch-1'],
          periodYear: 2024,
          filters: { format: 'xlsx' },
        } as ExportParameters,
      }

      const result = await processStatusExport(params)

      expect(result.rowCount).toBe(1)
    })

    it('should handle empty status data', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([]),
      } as any)

      vi.mocked(generateXlsx).mockResolvedValue(Buffer.from('xlsx data'))

      const params = {
        jobId: 'job-id',
        parameters: {} as ExportParameters,
      }

      const result = await processStatusExport(params)

      expect(result.rowCount).toBe(0)
    })

    it('should handle errors gracefully', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockRejectedValue(new Error('Database error')),
      } as any)

      const params = {
        jobId: 'job-id',
        parameters: {} as ExportParameters,
      }

      await expect(processStatusExport(params)).rejects.toThrow('Database error')
      expect(logger.error).toHaveBeenCalledWith('Failed to process status export', expect.any(Error), expect.any(Object))
    })
  })
})
