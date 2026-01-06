/**
 * Export jobs API routes
 */

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { createExportJob, getExportJob, listExportJobs, getDownloadUrl } from '@/features/exports/services/export.service'
import { processExportJob } from '@/features/exports/handlers/process-export.handler'
import { hasPermission } from '@/lib/permissions'
import { rateLimitMiddleware } from '@/server/api/middleware/rate-limit'
import { logger } from '@/lib/logger'

export const exportsRoutes = new Hono()

// Validation schemas
const createExportSchema = z.object({
  type: z.enum(['clients', 'client_status', 'fcash_summary', 'pcni_summary', 'branch_performance', 'user_activity']),
  format: z.enum(['csv', 'xlsx']),
  name: z.string().min(1, 'Export name is required').max(200),
  description: z.string().optional(),
  parameters: z.object({
    companyId: z.string().optional(),
    branchIds: z.array(z.string()).optional(),
    periodYear: z.number().int().min(2000).max(2100).optional(),
    periodMonth: z.number().int().min(1).max(12).optional(),
    periodQuarter: z.number().int().min(1).max(4).optional(),
    columns: z.array(z.object({
      key: z.string(),
      label: z.string(),
      width: z.number().optional(),
      format: z.string().optional(),
    })).optional(),
    filters: z.record(z.any()).optional(),
  }).optional(),
})

const listExportsSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
})

/**
 * POST /api/reports/exports
 * Request new export job
 */
exportsRoutes.post(
  '/',
  rateLimitMiddleware('write'),
  zValidator('json', createExportSchema),
  async (c) => {
    const start = performance.now()
    const userId = c.get('userId') as string
    const orgId = c.get('orgId') as string
    const exportData = c.req.valid('json')

    try {
      // Check permission
      const hasExportPermission = await hasPermission(userId, orgId, 'reports', 'export')
      if (!hasExportPermission) {
        logger.warn('User does not have reports:export permission', {
          action: 'create_export',
          userId,
          orgId,
        })

        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to create exports',
            },
          },
          403
        )
      }

      // Create export job
      const job = await createExportJob({
        type: exportData.type,
        format: exportData.format,
        name: exportData.name,
        description: exportData.description,
        parameters: exportData.parameters,
        createdBy: userId,
        expiryHours: 24,
      })

      // Start async processing (using setTimeout as placeholder)
      // In production, use a proper queue system like Bull or SQS
      setTimeout(async () => {
        try {
          await processExportJob(job.id)
        } catch (error) {
          logger.error('Failed to process export job', error as Error, {
            action: 'process_export_job',
            jobId: job.id,
          })
        }
      }, 100)

      logger.info('Created export job', {
        action: 'create_export',
        userId,
        orgId,
        jobId: job.id,
        type: exportData.type,
        format: exportData.format,
        duration: performance.now() - start,
      })

      // Return 202 Accepted with job ID
      return c.json(
        {
          success: true,
          data: {
            id: job.id,
            status: job.status,
            message: 'Export job created and is being processed',
          },
        },
        202
      )
    } catch (error) {
      logger.error('Failed to create export job', error as Error, {
        action: 'create_export',
        userId,
        orgId,
        exportData,
      })

      return c.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to create export job',
            details: error instanceof Error ? error.message : undefined,
          },
        },
        500
      )
    }
  }
)

/**
 * GET /api/reports/exports
 * List user's export jobs (paginated)
 */
exportsRoutes.get(
  '/',
  rateLimitMiddleware('read'),
  zValidator('query', listExportsSchema),
  async (c) => {
    const start = performance.now()
    const userId = c.get('userId') as string
    const orgId = c.get('orgId') as string
    const { page, pageSize, status } = c.req.valid('query')

    try {
      // Check permission
      const hasReadPermission = await hasPermission(userId, orgId, 'reports', 'read')
      if (!hasReadPermission) {
        logger.warn('User does not have reports:read permission', {
          action: 'list_exports',
          userId,
          orgId,
        })

        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to view exports',
            },
          },
          403
        )
      }

      // List export jobs
      const result = await listExportJobs({
        userId,
        page,
        pageSize,
        status,
      })

      logger.info('Listed export jobs', {
        action: 'list_exports',
        userId,
        orgId,
        page,
        pageSize,
        status,
        total: result.total,
        duration: performance.now() - start,
      })

      return c.json({
        success: true,
        data: result.data,
        meta: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: result.totalPages,
        },
      })
    } catch (error) {
      logger.error('Failed to list export jobs', error as Error, {
        action: 'list_exports',
        userId,
        orgId,
        page,
        pageSize,
        status,
      })

      return c.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to list export jobs',
            details: error instanceof Error ? error.message : undefined,
          },
        },
        500
      )
    }
  }
)

/**
 * GET /api/reports/exports/:id
 * Get export job status
 */
exportsRoutes.get(
  '/:id',
  rateLimitMiddleware('read'),
  async (c) => {
    const start = performance.now()
    const userId = c.get('userId') as string
    const orgId = c.get('orgId') as string
    const exportId = c.req.param('id')

    try {
      // Check permission
      const hasReadPermission = await hasPermission(userId, orgId, 'reports', 'read')
      if (!hasReadPermission) {
        logger.warn('User does not have reports:read permission', {
          action: 'get_export',
          userId,
          orgId,
          exportId,
        })

        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to view exports',
            },
          },
          403
        )
      }

      // Get export job
      const job = await getExportJob(exportId)

      if (!job) {
        return c.json(
          {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Export job not found',
            },
          },
          404
        )
      }

      // Check if user owns this export
      if (job.createdBy !== userId) {
        logger.warn('User attempted to access another user\'s export', {
          action: 'get_export',
          userId,
          orgId,
          exportId,
          jobOwnerId: job.createdBy,
        })

        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to view this export',
            },
          },
          403
        )
      }

      logger.info('Retrieved export job', {
        action: 'get_export',
        userId,
        orgId,
        exportId,
        duration: performance.now() - start,
      })

      return c.json({
        success: true,
        data: job,
      })
    } catch (error) {
      logger.error('Failed to retrieve export job', error as Error, {
        action: 'get_export',
        userId,
        orgId,
        exportId,
      })

      return c.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to retrieve export job',
            details: error instanceof Error ? error.message : undefined,
          },
        },
        500
      )
    }
  }
)

/**
 * GET /api/reports/exports/:id/download
 * Get download URL for completed exports
 */
exportsRoutes.get(
  '/:id/download',
  rateLimitMiddleware('read'),
  async (c) => {
    const start = performance.now()
    const userId = c.get('userId') as string
    const orgId = c.get('orgId') as string
    const exportId = c.req.param('id')

    try {
      // Check permission
      const hasExportPermission = await hasPermission(userId, orgId, 'reports', 'export')
      if (!hasExportPermission) {
        logger.warn('User does not have reports:export permission', {
          action: 'get_download_url',
          userId,
          orgId,
          exportId,
        })

        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to download exports',
            },
          },
          403
        )
      }

      // Get export job
      const job = await getExportJob(exportId)

      if (!job) {
        return c.json(
          {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Export job not found',
            },
          },
          404
        )
      }

      // Check if user owns this export
      if (job.createdBy !== userId) {
        logger.warn('User attempted to download another user\'s export', {
          action: 'get_download_url',
          userId,
          orgId,
          exportId,
          jobOwnerId: job.createdBy,
        })

        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to download this export',
            },
          },
          403
        )
      }

      // Check if export is completed
      if (job.status !== 'completed') {
        return c.json(
          {
            success: false,
            error: {
              code: 'INVALID_STATE',
              message: `Export is not ready for download. Current status: ${job.status}`,
            },
          },
          400
        )
      }

      // Check if export has expired
      if (job.expiresAt && new Date(job.expiresAt) < new Date()) {
        return c.json(
          {
            success: false,
            error: {
              code: 'EXPIRED',
              message: 'Export has expired and is no longer available for download',
            },
          },
          410
        )
      }

      // Check if file path exists
      if (!job.filePath) {
        return c.json(
          {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Export file not found',
            },
          },
          404
        )
      }

      // Generate download URL
      const downloadUrl = await getDownloadUrl(job.filePath)

      logger.info('Generated download URL', {
        action: 'get_download_url',
        userId,
        orgId,
        exportId,
        duration: performance.now() - start,
      })

      return c.json({
        success: true,
        data: {
          downloadUrl,
          fileName: job.fileName,
          fileSize: job.fileSize,
          expiresAt: job.expiresAt,
        },
      })
    } catch (error) {
      logger.error('Failed to generate download URL', error as Error, {
        action: 'get_download_url',
        userId,
        orgId,
        exportId,
      })

      return c.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to generate download URL',
            details: error instanceof Error ? error.message : undefined,
          },
        },
        500
      )
    }
  }
)
