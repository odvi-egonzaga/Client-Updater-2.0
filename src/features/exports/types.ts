/**
 * Type definitions for export functionality
 */

import type { ExportJob } from '@/server/db/schema'

export interface ExportParameters {
  companyId?: string
  branchIds?: string[]
  periodYear?: number
  periodMonth?: number
  periodQuarter?: number
  columns?: ExportColumnConfig[]
  filters?: Record<string, any>
}

export interface ExportColumnConfig {
  key: string
  label: string
  width?: number
  format?: string
}

export interface ExportResult {
  buffer: Buffer
  fileName: string
  rowCount: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface CreateExportJobParams {
  type: string
  format: string
  name: string
  description?: string
  parameters?: ExportParameters
  createdBy: string
  expiryHours?: number
}

export interface CompleteExportJobParams {
  id: string
  filePath: string
  fileName: string
  fileSize: number
  rowCount: number
}

export interface GenerateXlsxParams {
  data: any[]
  columns: ExportColumnConfig[]
  fileName: string
}

export interface GenerateCsvParams {
  data: any[]
  columns: ExportColumnConfig[]
  fileName: string
}

export interface UploadExportFileParams {
  buffer: Buffer
  fileName: string
  userId: string
}

export type ExportProcessor = (params: {
  jobId: string
  parameters: ExportParameters
}) => Promise<ExportResult>

export interface ExportJobWithDetails extends ExportJob {
  downloadUrl?: string
  isExpired?: boolean
}
