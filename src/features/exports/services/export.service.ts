/**
 * Export service for managing export jobs and file generation
 */

import { db } from '@/server/db'
import { exportJobs } from '@/server/db/schema'
import { eq, and, desc, lt } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import { supabaseAdmin } from '@/lib/supabase/admin'
import ExcelJS from 'exceljs'
import { stringify } from 'csv-stringify/sync'
import type {
  CreateExportJobParams,
  CompleteExportJobParams,
  GenerateXlsxParams,
  GenerateCsvParams,
  UploadExportFileParams,
  PaginatedResult,
  ExportParameters,
  ExportColumnConfig,
  ExportResult,
  ExportJob,
} from '../types'

/**
 * Create export job with expiry
 */
export async function createExportJob(params: CreateExportJobParams): Promise<ExportJob> {
  try {
    const expiryHours = params.expiryHours || 24
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000)

    const [job] = await db
      .insert(exportJobs)
      .values({
        type: params.type as any,
        format: params.format as any,
        name: params.name,
        description: params.description,
        parameters: params.parameters as any,
        createdBy: params.createdBy,
        expiresAt,
        status: 'pending',
      })
      .returning()

    logger.info('Created export job', {
      action: 'create_export_job',
      jobId: job.id,
      type: params.type,
      format: params.format,
      createdBy: params.createdBy,
    })

    return job
  } catch (error) {
    logger.error('Failed to create export job', error as Error, {
      action: 'create_export_job',
      params,
    })
    throw error
  }
}

/**
 * Get export job status
 */
export async function getExportJob(id: string): Promise<ExportJob | null> {
  try {
    const result = await db.select().from(exportJobs).where(eq(exportJobs.id, id)).limit(1)
    return result[0] ?? null
  } catch (error) {
    logger.error('Failed to get export job', error as Error, {
      action: 'get_export_job',
      jobId: id,
    })
    throw error
  }
}

/**
 * List user's export jobs with pagination
 */
export async function listExportJobs(params: {
  userId: string
  page?: number
  pageSize?: number
  status?: string
}): Promise<PaginatedResult<ExportJob>> {
  try {
    const page = params.page || 1
    const pageSize = Math.min(params.pageSize || 25, 100)
    const offset = (page - 1) * pageSize

    let query = db.select().from(exportJobs).where(eq(exportJobs.createdBy, params.userId))

    // Filter by status if provided
    if (params.status) {
      query = query.where(and(eq(exportJobs.createdBy, params.userId), eq(exportJobs.status, params.status as any)))
    }

    // Get total count
    const countResult = await db
      .select({ count: db.raw('COUNT(*)::int as count') })
      .from(exportJobs)
      .where(eq(exportJobs.createdBy, params.userId))

    const total = countResult[0]?.count || 0

    // Get paginated results
    const data = await query.orderBy(desc(exportJobs.createdAt)).limit(pageSize).offset(offset)

    logger.info('Listed export jobs', {
      action: 'list_export_jobs',
      userId: params.userId,
      page,
      pageSize,
      total,
    })

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  } catch (error) {
    logger.error('Failed to list export jobs', error as Error, {
      action: 'list_export_jobs',
      params,
    })
    throw error
  }
}

/**
 * Mark job as processing
 */
export async function startExportJob(id: string): Promise<void> {
  try {
    await db
      .update(exportJobs)
      .set({
        status: 'processing',
        startedAt: new Date(),
      })
      .where(eq(exportJobs.id, id))

    logger.info('Started export job', {
      action: 'start_export_job',
      jobId: id,
    })
  } catch (error) {
    logger.error('Failed to start export job', error as Error, {
      action: 'start_export_job',
      jobId: id,
    })
    throw error
  }
}

/**
 * Update job with results
 */
export async function completeExportJob(params: CompleteExportJobParams): Promise<void> {
  try {
    await db
      .update(exportJobs)
      .set({
        status: 'completed',
        filePath: params.filePath,
        fileName: params.fileName,
        fileSize: params.fileSize,
        rowCount: params.rowCount,
        completedAt: new Date(),
      })
      .where(eq(exportJobs.id, params.id))

    logger.info('Completed export job', {
      action: 'complete_export_job',
      jobId: params.id,
      fileName: params.fileName,
      fileSize: params.fileSize,
      rowCount: params.rowCount,
    })
  } catch (error) {
    logger.error('Failed to complete export job', error as Error, {
      action: 'complete_export_job',
      params,
    })
    throw error
  }
}

/**
 * Mark job as failed with error
 */
export async function failExportJob(id: string, error: string): Promise<void> {
  try {
    await db
      .update(exportJobs)
      .set({
        status: 'failed',
        error,
        completedAt: new Date(),
      })
      .where(eq(exportJobs.id, id))

    logger.error('Export job failed', new Error(error), {
      action: 'fail_export_job',
      jobId: id,
    })
  } catch (error) {
    logger.error('Failed to mark export job as failed', error as Error, {
      action: 'fail_export_job',
      jobId: id,
    })
    throw error
  }
}

/**
 * Generate Excel files with styling
 */
export async function generateXlsx(params: GenerateXlsxParams): Promise<Buffer> {
  try {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Export')

    // Set column widths
    worksheet.columns = params.columns.map((col) => ({
      header: col.label,
      key: col.key,
      width: col.width || 20,
    }))

    // Style header row
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true, size: 12 }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    }

    // Add data rows
    params.data.forEach((row) => {
      worksheet.addRow(row)
    })

    // Enable auto-filter
    worksheet.autoFilter = {
      from: 'A1',
      to: `${String.fromCharCode(65 + params.columns.length - 1)}${params.data.length + 1}`,
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer()

    logger.info('Generated XLSX file', {
      action: 'generate_xlsx',
      fileName: params.fileName,
      rowCount: params.data.length,
    })

    return buffer as Buffer
  } catch (error) {
    logger.error('Failed to generate XLSX file', error as Error, {
      action: 'generate_xlsx',
      params,
    })
    throw error
  }
}

/**
 * Generate CSV files
 */
export async function generateCsv(params: GenerateCsvParams): Promise<Buffer> {
  try {
    // Extract columns and data
    const columns = params.columns.map((col) => col.key)
    const header = params.columns.map((col) => col.label)

    // Format data for CSV
    const csvData = params.data.map((row) => {
      return columns.map((col) => {
        const value = row[col]
        // Handle null/undefined values
        if (value === null || value === undefined) {
          return ''
        }
        // Convert to string
        return String(value)
      })
    })

    // Generate CSV
    const csvOutput = stringify([header, ...csvData], {
      header: false,
      columns: header,
    })

    const buffer = Buffer.from(csvOutput)

    logger.info('Generated CSV file', {
      action: 'generate_csv',
      fileName: params.fileName,
      rowCount: params.data.length,
    })

    return buffer
  } catch (error) {
    logger.error('Failed to generate CSV file', error as Error, {
      action: 'generate_csv',
      params,
    })
    throw error
  }
}

/**
 * Upload to Supabase Storage
 */
export async function uploadExportFile(params: UploadExportFileParams): Promise<string> {
  try {
    const fileName = `${params.userId}/${Date.now()}-${params.fileName}`
    const filePath = `exports/${fileName}`

    const { data, error } = await supabaseAdmin.storage
      .from('exports')
      .upload(filePath, params.buffer, {
        contentType: params.fileName.endsWith('.xlsx') ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv',
        upsert: false,
      })

    if (error) {
      throw error
    }

    logger.info('Uploaded export file', {
      action: 'upload_export_file',
      filePath,
      fileName: params.fileName,
      userId: params.userId,
    })

    return filePath
  } catch (error) {
    logger.error('Failed to upload export file', error as Error, {
      action: 'upload_export_file',
      params,
    })
    throw error
  }
}

/**
 * Generate signed download URL (1 hour validity)
 */
export async function getDownloadUrl(filePath: string): Promise<string> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from('exports')
      .createSignedUrl(filePath, 3600) // 1 hour validity

    if (error) {
      throw error
    }

    logger.info('Generated download URL', {
      action: 'get_download_url',
      filePath,
    })

    return data.signedUrl
  } catch (error) {
    logger.error('Failed to generate download URL', error as Error, {
      action: 'get_download_url',
      filePath,
    })
    throw error
  }
}

/**
 * Delete expired jobs and files
 */
export async function cleanupExpiredExports(): Promise<number> {
  try {
    const now = new Date()

    // Find expired jobs
    const expiredJobs = await db
      .select()
      .from(exportJobs)
      .where(and(lt(exportJobs.expiresAt, now)))

    let deletedCount = 0

    for (const job of expiredJobs) {
      try {
        // Delete file from storage if it exists
        if (job.filePath) {
          await supabaseAdmin.storage.from('exports').remove([job.filePath])
        }

        // Delete job from database
        await db.delete(exportJobs).where(eq(exportJobs.id, job.id))
        deletedCount++
      } catch (error) {
        logger.error('Failed to delete expired export job', error as Error, {
          action: 'cleanup_expired_exports',
          jobId: job.id,
        })
      }
    }

    logger.info('Cleaned up expired exports', {
      action: 'cleanup_expired_exports',
      deletedCount,
    })

    return deletedCount
  } catch (error) {
    logger.error('Failed to cleanup expired exports', error as Error, {
      action: 'cleanup_expired_exports',
    })
    throw error
  }
}
