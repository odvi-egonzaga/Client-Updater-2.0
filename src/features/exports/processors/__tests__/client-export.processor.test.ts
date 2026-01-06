/**
 * Tests for client export processor
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { processClientExport } from '../client-export.processor'
import { db } from '@/server/db'
import { logger } from '@/lib/logger'
import { generateXlsx, generateCsv } from '../../services/export.service'
import type { ExportParameters } from '../../types'

// Mock dependencies
vi.mock('@/server/db')
vi.mock('@/lib/logger')
vi.mock('../../services/export.service')

describe('Client Export Processor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('processClientExport', () => {
    it('should process client export with XLSX format', async () => {
      const mockClientData = [
        {
          id: 'client-1',
          clientCode: 'C001',
          fullName: 'John Doe',
          pensionNumber: 'P001',
          pensionType: 'Old Age',
          pensionerType: 'Regular',
          product: 'Product A',
          branchCode: 'B001',
          branchName: 'Branch 1',
          areaName: 'Area 1',
          parStatus: 'Active',
          accountType: 'Savings',
          pastDueAmount: '1000.00',
          loanStatus: 'Current',
          contactNumber: '1234567890',
          isActive: true,
          lastSyncedAt: new Date(),
        },
      ]

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockClientData),
      } as any)

      vi.mocked(generateXlsx).mockResolvedValue(Buffer.from('xlsx data'))

      const params = {
        jobId: 'job-id',
        parameters: {
          branchIds: ['branch-1'],
          filters: { format: 'xlsx' },
        } as ExportParameters,
      }

      const result = await processClientExport(params)

      expect(result.buffer).toBeInstanceOf(Buffer)
      expect(result.fileName).toMatch(/clients-export-.*\.xlsx$/)
      expect(result.rowCount).toBe(1)
      expect(generateXlsx).toHaveBeenCalled()
      expect(logger.info).toHaveBeenCalledWith('Processing client export', expect.any(Object))
      expect(logger.info).toHaveBeenCalledWith('Client export completed', expect.any(Object))
    })

    it('should process client export with CSV format', async () => {
      const mockClientData = [
        {
          id: 'client-1',
          clientCode: 'C001',
          fullName: 'John Doe',
          pensionNumber: 'P001',
          pensionType: 'Old Age',
          pensionerType: 'Regular',
          product: 'Product A',
          branchCode: 'B001',
          branchName: 'Branch 1',
          areaName: 'Area 1',
          parStatus: 'Active',
          accountType: 'Savings',
          pastDueAmount: '1000.00',
          loanStatus: 'Current',
          contactNumber: '1234567890',
          isActive: true,
          lastSyncedAt: new Date(),
        },
      ]

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockClientData),
      } as any)

      vi.mocked(generateCsv).mockResolvedValue(Buffer.from('csv data'))

      const params = {
        jobId: 'job-id',
        parameters: {
          branchIds: ['branch-1'],
          filters: { format: 'csv' },
        } as ExportParameters,
      }

      const result = await processClientExport(params)

      expect(result.buffer).toBeInstanceOf(Buffer)
      expect(result.fileName).toMatch(/clients-export-.*\.csv$/)
      expect(result.rowCount).toBe(1)
      expect(generateCsv).toHaveBeenCalled()
    })

    it('should handle empty client data', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([]),
      } as any)

      vi.mocked(generateXlsx).mockResolvedValue(Buffer.from('xlsx data'))

      const params = {
        jobId: 'job-id',
        parameters: {} as ExportParameters,
      }

      const result = await processClientExport(params)

      expect(result.rowCount).toBe(0)
    })

    it('should handle errors gracefully', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockRejectedValue(new Error('Database error')),
      } as any)

      const params = {
        jobId: 'job-id',
        parameters: {} as ExportParameters,
      }

      await expect(processClientExport(params)).rejects.toThrow('Database error')
      expect(logger.error).toHaveBeenCalledWith('Failed to process client export', expect.any(Error), expect.any(Object))
    })
  })
})
