/**
 * Export queue handler for processing export jobs
 */

import { getExportJob, startExportJob, completeExportJob, failExportJob, uploadExportFile } from '../services/export.service'
import { processClientExport } from '../processors/client-export.processor'
import { processStatusExport } from '../processors/status-export.processor'
import { logger } from '@/lib/logger'
import type { ExportProcessor } from '../types'

// Placeholder processors for future implementation
const processFcashSummaryExport: ExportProcessor = async (params) => {
  throw new Error('FCash summary export not yet implemented')
}

const processPcniSummaryExport: ExportProcessor = async (params) => {
  throw new Error('PCNI summary export not yet implemented')
}

const processBranchPerformanceExport: ExportProcessor = async (params) => {
  throw new Error('Branch performance export not yet implemented')
}

const processUserActivityExport: ExportProcessor = async (params) => {
  throw new Error('User activity export not yet implemented')
}

// Processor mapping
const processors: Record<string, ExportProcessor> = {
  clients: processClientExport,
  client_status: processStatusExport,
  fcash_summary: processFcashSummaryExport,
  pcni_summary: processPcniSummaryExport,
  branch_performance: processBranchPerformanceExport,
  user_activity: processUserActivityExport,
}

/**
 * Process export job
 */
export async function processExportJob(jobId: string): Promise<void> {
  try {
    logger.info('Processing export job', {
      action: 'process_export_job',
      jobId,
    })

    // Get job details
    const job = await getExportJob(jobId)
    if (!job) {
      throw new Error(`Export job not found: ${jobId}`)
    }

    // Check job status (only processes pending jobs)
    if (job.status !== 'pending') {
      logger.warn('Export job is not in pending status', {
        action: 'process_export_job',
        jobId,
        status: job.status,
      })
      return
    }

    // Mark job as processing
    await startExportJob(jobId)

    // Get processor for job type
    const processor = processors[job.type]
    if (!processor) {
      throw new Error(`No processor found for export type: ${job.type}`)
    }

    // Process export
    const result = await processor({
      jobId,
      parameters: (job.parameters as any) || {},
    })

    // Upload file to storage
    const filePath = await uploadExportFile({
      buffer: result.buffer,
      fileName: result.fileName,
      userId: job.createdBy,
    })

    // Update job with results
    await completeExportJob({
      id: jobId,
      filePath,
      fileName: result.fileName,
      fileSize: result.buffer.length,
      rowCount: result.rowCount,
    })

    logger.info('Export job processed successfully', {
      action: 'process_export_job',
      jobId,
      fileName: result.fileName,
      rowCount: result.rowCount,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    logger.error('Failed to process export job', error as Error, {
      action: 'process_export_job',
      jobId,
    })

    // Mark job as failed
    await failExportJob(jobId, errorMessage)
    
    throw error
  }
}

/**
 * Get available export types
 */
export function getExportTypes(): string[] {
  return Object.keys(processors)
}

/**
 * Check if export type is available
 */
export function isExportTypeAvailable(type: string): boolean {
  return type in processors
}
