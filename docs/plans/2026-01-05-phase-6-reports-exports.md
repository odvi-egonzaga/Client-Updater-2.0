# Phase 6: Reports & Exports

**Date:** 2026-01-05
**Phase:** 6 of 7
**Status:** Planning
**Depends on:** Phase 3 (Client Management), Phase 4 (Status Tracking)

---

## Overview

This phase implements reporting and data export functionality. The system needs to generate reports on client status, branch performance, and export data to various formats (CSV, XLSX) for offline analysis.

### Goals

1. **Export Queue** - Async file generation for large datasets
2. **Export Templates** - Predefined export configurations (clients, status, reports)
3. **Dashboard Reports** - Summary statistics and charts
4. **Export API** - Request, monitor, and download exports
5. **File Management** - Storage, expiry, and cleanup

---

## Prerequisites

Before starting this phase, ensure:

- [x] Phase 3 completed (client queries)
- [x] Phase 4 completed (status queries)
- [x] Database schema includes: `export_jobs`
- [x] Supabase Storage configured for exports bucket
- [x] Queue system ready (from Phase 0)

---

## Tasks

### Task 1: Export Jobs Schema

**File:** `src/lib/db/schema/export.ts`

```typescript
import { pgTable, uuid, varchar, text, timestamp, integer, jsonb, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { users } from './users'

export const exportStatusEnum = pgEnum('export_status', [
  'pending',
  'processing',
  'completed',
  'failed',
])

export const exportTypeEnum = pgEnum('export_type', [
  'clients',
  'client_status',
  'fcash_summary',
  'pcni_summary',
  'branch_performance',
  'user_activity',
])

export const exportFormatEnum = pgEnum('export_format', ['csv', 'xlsx'])

export const exportJobs = pgTable('export_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: exportTypeEnum('type').notNull(),
  format: exportFormatEnum('format').notNull().default('xlsx'),
  status: exportStatusEnum('status').notNull().default('pending'),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  parameters: jsonb('parameters'), // filters, columns, options
  filePath: varchar('file_path', { length: 500 }),
  fileName: varchar('file_name', { length: 255 }),
  fileSize: integer('file_size'),
  rowCount: integer('row_count'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  error: text('error'),
  expiresAt: timestamp('expires_at'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const exportJobsRelations = relations(exportJobs, ({ one }) => ({
  createdByUser: one(users, {
    fields: [exportJobs.createdBy],
    references: [users.id],
  }),
}))

// Export templates (predefined export configurations)
export const exportTemplates = pgTable('export_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: exportTypeEnum('type').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  columns: jsonb('columns').notNull(), // array of column configs
  defaultFilters: jsonb('default_filters'),
  isSystem: boolean('is_system').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Type definitions for parameters
export interface ExportParameters {
  filters?: Record<string, unknown>
  columns?: string[]
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  dateRange?: {
    from: string
    to: string
  }
  companyId?: string
  branchIds?: string[]
  periodYear?: number
  periodMonth?: number
  periodQuarter?: number
}

export interface ExportColumnConfig {
  key: string
  label: string
  width?: number
  format?: 'text' | 'number' | 'date' | 'currency' | 'percentage'
  transform?: string // function name for transformation
}
```

**Acceptance Criteria:**
- [ ] Export jobs table created
- [ ] Export templates table created
- [ ] Status enum defined
- [ ] Type definitions for parameters

---

### Task 2: Export Service

**File:** `src/features/exports/services/export.service.ts`

```typescript
import { db } from '@/lib/db'
import { exportJobs, ExportParameters } from '@/lib/db/schema'
import { eq, and, lt, desc } from 'drizzle-orm'
import { createClient } from '@supabase/supabase-js'
import ExcelJS from 'exceljs'
import { stringify } from 'csv-stringify/sync'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const EXPORTS_BUCKET = 'exports'
const DEFAULT_EXPIRY_HOURS = 24

export interface ExportJobResult {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  filePath?: string
  fileName?: string
  fileSize?: number
  rowCount?: number
  error?: string
}

// Create export job
export async function createExportJob(
  type: string,
  name: string,
  parameters: ExportParameters,
  format: 'csv' | 'xlsx',
  userId: string
): Promise<string> {
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + DEFAULT_EXPIRY_HOURS)

  const [job] = await db
    .insert(exportJobs)
    .values({
      type: type as any,
      name,
      format,
      parameters,
      status: 'pending',
      expiresAt,
      createdBy: userId,
    })
    .returning()

  return job.id
}

// Get export job status
export async function getExportJob(id: string): Promise<ExportJobResult | null> {
  const job = await db.query.exportJobs.findFirst({
    where: eq(exportJobs.id, id),
  })

  if (!job) return null

  return {
    id: job.id,
    status: job.status,
    filePath: job.filePath ?? undefined,
    fileName: job.fileName ?? undefined,
    fileSize: job.fileSize ?? undefined,
    rowCount: job.rowCount ?? undefined,
    error: job.error ?? undefined,
  }
}

// List user's export jobs
export async function listExportJobs(
  userId: string,
  options?: { page?: number; pageSize?: number }
) {
  const { page = 1, pageSize = 20 } = options ?? {}
  const offset = (page - 1) * pageSize

  return db.query.exportJobs.findMany({
    where: eq(exportJobs.createdBy, userId),
    orderBy: [desc(exportJobs.createdAt)],
    limit: pageSize,
    offset,
  })
}

// Mark job as processing
export async function startExportJob(id: string) {
  await db
    .update(exportJobs)
    .set({ status: 'processing', startedAt: new Date() })
    .where(eq(exportJobs.id, id))
}

// Complete export job
export async function completeExportJob(
  id: string,
  result: { filePath: string; fileName: string; fileSize: number; rowCount: number }
) {
  await db
    .update(exportJobs)
    .set({
      status: 'completed',
      completedAt: new Date(),
      ...result,
    })
    .where(eq(exportJobs.id, id))
}

// Fail export job
export async function failExportJob(id: string, error: string) {
  await db
    .update(exportJobs)
    .set({ status: 'failed', completedAt: new Date(), error })
    .where(eq(exportJobs.id, id))
}

// Generate XLSX file
export async function generateXlsx(
  data: Record<string, unknown>[],
  columns: Array<{ key: string; label: string; width?: number }>,
  sheetName: string = 'Data'
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Client Updater'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet(sheetName)

  // Set columns
  worksheet.columns = columns.map((col) => ({
    header: col.label,
    key: col.key,
    width: col.width ?? 15,
  }))

  // Style header row
  worksheet.getRow(1).font = { bold: true }
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  }

  // Add data
  data.forEach((row) => {
    const rowData: Record<string, unknown> = {}
    columns.forEach((col) => {
      rowData[col.key] = row[col.key]
    })
    worksheet.addRow(rowData)
  })

  // Auto-filter
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  }

  return Buffer.from(await workbook.xlsx.writeBuffer())
}

// Generate CSV file
export function generateCsv(
  data: Record<string, unknown>[],
  columns: Array<{ key: string; label: string }>
): string {
  const headers = columns.map((c) => c.label)
  const rows = data.map((row) => columns.map((col) => row[col.key] ?? ''))

  return stringify([headers, ...rows])
}

// Upload to storage
export async function uploadExportFile(
  buffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  const path = `exports/${Date.now()}-${fileName}`

  const { error } = await supabase.storage.from(EXPORTS_BUCKET).upload(path, buffer, {
    contentType,
    upsert: false,
  })

  if (error) {
    throw new Error(`Failed to upload export: ${error.message}`)
  }

  return path
}

// Get download URL
export async function getDownloadUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(EXPORTS_BUCKET)
    .createSignedUrl(filePath, 3600) // 1 hour

  if (error) {
    throw new Error(`Failed to create download URL: ${error.message}`)
  }

  return data.signedUrl
}

// Delete expired exports
export async function cleanupExpiredExports() {
  const expiredJobs = await db.query.exportJobs.findMany({
    where: and(eq(exportJobs.status, 'completed'), lt(exportJobs.expiresAt, new Date())),
  })

  for (const job of expiredJobs) {
    if (job.filePath) {
      await supabase.storage.from(EXPORTS_BUCKET).remove([job.filePath])
    }
  }

  // Delete job records
  if (expiredJobs.length > 0) {
    await db.delete(exportJobs).where(
      and(eq(exportJobs.status, 'completed'), lt(exportJobs.expiresAt, new Date()))
    )
  }

  return expiredJobs.length
}
```

**Acceptance Criteria:**
- [ ] Create export job
- [ ] Get job status
- [ ] List user's jobs
- [ ] Generate XLSX with styling
- [ ] Generate CSV
- [ ] Upload to Supabase Storage
- [ ] Generate signed download URL
- [ ] Cleanup expired exports

---

### Task 3: Export Processors

**File:** `src/features/exports/processors/client-export.processor.ts`

```typescript
import { db } from '@/lib/db'
import { clients, branches, pensionTypes, parStatuses } from '@/lib/db/schema'
import { eq, and, isNull, inArray } from 'drizzle-orm'
import { ExportParameters, ExportColumnConfig } from '@/lib/db/schema'
import { generateXlsx, generateCsv, uploadExportFile } from '../services/export.service'

// Default columns for client export
export const CLIENT_EXPORT_COLUMNS: ExportColumnConfig[] = [
  { key: 'clientCode', label: 'Client Code', width: 15 },
  { key: 'fullName', label: 'Full Name', width: 25 },
  { key: 'pensionNumber', label: 'Pension Number', width: 18 },
  { key: 'branchCode', label: 'Branch Code', width: 12 },
  { key: 'branchName', label: 'Branch Name', width: 20 },
  { key: 'pensionType', label: 'Pension Type', width: 12 },
  { key: 'contactNumber', label: 'Contact Number', width: 15 },
  { key: 'pastDueAmount', label: 'Past Due Amount', width: 15, format: 'currency' },
  { key: 'parStatus', label: 'PAR Status', width: 15 },
  { key: 'loanStatus', label: 'Loan Status', width: 12 },
  { key: 'isActive', label: 'Active', width: 8 },
]

export async function processClientExport(
  parameters: ExportParameters,
  format: 'csv' | 'xlsx',
  userId: string
): Promise<{ filePath: string; fileName: string; fileSize: number; rowCount: number }> {
  // Build query conditions
  const conditions = [isNull(clients.deletedAt)]

  if (parameters.companyId) {
    // Filter by company through pension type
    const pensionTypeIds = await db
      .select({ id: pensionTypes.id })
      .from(pensionTypes)
      .where(eq(pensionTypes.companyId, parameters.companyId))
    conditions.push(inArray(clients.pensionTypeId, pensionTypeIds.map((p) => p.id)))
  }

  if (parameters.branchIds && parameters.branchIds.length > 0) {
    conditions.push(inArray(clients.branchId, parameters.branchIds))
  }

  // Fetch data with joins
  const data = await db
    .select({
      clientCode: clients.clientCode,
      fullName: clients.fullName,
      pensionNumber: clients.pensionNumber,
      branchCode: branches.code,
      branchName: branches.name,
      pensionType: pensionTypes.name,
      contactNumber: clients.contactNumber,
      pastDueAmount: clients.pastDueAmount,
      parStatus: parStatuses.name,
      loanStatus: clients.loanStatus,
      isActive: clients.isActive,
    })
    .from(clients)
    .leftJoin(branches, eq(clients.branchId, branches.id))
    .leftJoin(pensionTypes, eq(clients.pensionTypeId, pensionTypes.id))
    .leftJoin(parStatuses, eq(clients.parStatusId, parStatuses.id))
    .where(and(...conditions))
    .orderBy(clients.fullName)

  // Select columns
  const columns = parameters.columns
    ? CLIENT_EXPORT_COLUMNS.filter((c) => parameters.columns!.includes(c.key))
    : CLIENT_EXPORT_COLUMNS

  // Generate file
  const timestamp = new Date().toISOString().slice(0, 10)
  const fileName = `clients-export-${timestamp}.${format}`

  let buffer: Buffer
  let contentType: string

  if (format === 'xlsx') {
    buffer = await generateXlsx(data as any, columns, 'Clients')
    contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  } else {
    const csvContent = generateCsv(data as any, columns)
    buffer = Buffer.from(csvContent, 'utf-8')
    contentType = 'text/csv'
  }

  // Upload
  const filePath = await uploadExportFile(buffer, fileName, contentType)

  return {
    filePath,
    fileName,
    fileSize: buffer.length,
    rowCount: data.length,
  }
}
```

**File:** `src/features/exports/processors/status-export.processor.ts`

```typescript
import { db } from '@/lib/db'
import { clientPeriodStatus, clients, statusTypes, statusReasons, branches } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { ExportParameters, ExportColumnConfig } from '@/lib/db/schema'
import { generateXlsx, generateCsv, uploadExportFile } from '../services/export.service'

export const STATUS_EXPORT_COLUMNS: ExportColumnConfig[] = [
  { key: 'clientCode', label: 'Client Code', width: 15 },
  { key: 'fullName', label: 'Full Name', width: 25 },
  { key: 'branchName', label: 'Branch', width: 20 },
  { key: 'periodYear', label: 'Year', width: 8 },
  { key: 'periodMonth', label: 'Month', width: 8 },
  { key: 'periodQuarter', label: 'Quarter', width: 8 },
  { key: 'status', label: 'Status', width: 15 },
  { key: 'reason', label: 'Reason', width: 20 },
  { key: 'remarks', label: 'Remarks', width: 30 },
  { key: 'hasPayment', label: 'Has Payment', width: 12 },
  { key: 'updateCount', label: 'Updates', width: 10 },
  { key: 'updatedAt', label: 'Last Updated', width: 18, format: 'date' },
]

export async function processStatusExport(
  parameters: ExportParameters,
  format: 'csv' | 'xlsx',
  userId: string
): Promise<{ filePath: string; fileName: string; fileSize: number; rowCount: number }> {
  const conditions = []

  if (parameters.periodYear) {
    conditions.push(eq(clientPeriodStatus.periodYear, parameters.periodYear))
  }

  if (parameters.periodMonth) {
    conditions.push(eq(clientPeriodStatus.periodMonth, parameters.periodMonth))
  }

  if (parameters.periodQuarter) {
    conditions.push(eq(clientPeriodStatus.periodQuarter, parameters.periodQuarter))
  }

  if (parameters.branchIds && parameters.branchIds.length > 0) {
    conditions.push(inArray(clients.branchId, parameters.branchIds))
  }

  const data = await db
    .select({
      clientCode: clients.clientCode,
      fullName: clients.fullName,
      branchName: branches.name,
      periodYear: clientPeriodStatus.periodYear,
      periodMonth: clientPeriodStatus.periodMonth,
      periodQuarter: clientPeriodStatus.periodQuarter,
      status: statusTypes.name,
      reason: statusReasons.name,
      remarks: clientPeriodStatus.remarks,
      hasPayment: clientPeriodStatus.hasPayment,
      updateCount: clientPeriodStatus.updateCount,
      updatedAt: clientPeriodStatus.updatedAt,
    })
    .from(clientPeriodStatus)
    .innerJoin(clients, eq(clientPeriodStatus.clientId, clients.id))
    .leftJoin(branches, eq(clients.branchId, branches.id))
    .leftJoin(statusTypes, eq(clientPeriodStatus.statusTypeId, statusTypes.id))
    .leftJoin(statusReasons, eq(clientPeriodStatus.reasonId, statusReasons.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(clients.fullName)

  const columns = parameters.columns
    ? STATUS_EXPORT_COLUMNS.filter((c) => parameters.columns!.includes(c.key))
    : STATUS_EXPORT_COLUMNS

  const timestamp = new Date().toISOString().slice(0, 10)
  const fileName = `status-export-${timestamp}.${format}`

  let buffer: Buffer
  let contentType: string

  if (format === 'xlsx') {
    buffer = await generateXlsx(data as any, columns, 'Status')
    contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  } else {
    const csvContent = generateCsv(data as any, columns)
    buffer = Buffer.from(csvContent, 'utf-8')
    contentType = 'text/csv'
  }

  const filePath = await uploadExportFile(buffer, fileName, contentType)

  return {
    filePath,
    fileName,
    fileSize: buffer.length,
    rowCount: data.length,
  }
}
```

**Acceptance Criteria:**
- [ ] Client export processor
- [ ] Status export processor
- [ ] Column selection support
- [ ] Filter support
- [ ] Both CSV and XLSX formats

---

### Task 4: Export Queue Handler

**File:** `src/features/exports/handlers/process-export.handler.ts`

```typescript
import {
  getExportJob,
  startExportJob,
  completeExportJob,
  failExportJob,
} from '../services/export.service'
import { processClientExport } from '../processors/client-export.processor'
import { processStatusExport } from '../processors/status-export.processor'
import { db } from '@/lib/db'
import { exportJobs } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function processExportJob(jobId: string) {
  const job = await db.query.exportJobs.findFirst({
    where: eq(exportJobs.id, jobId),
  })

  if (!job) {
    throw new Error(`Export job ${jobId} not found`)
  }

  if (job.status !== 'pending') {
    console.log(`Job ${jobId} is not pending (status: ${job.status}), skipping`)
    return
  }

  try {
    await startExportJob(jobId)

    const parameters = job.parameters as any
    let result: { filePath: string; fileName: string; fileSize: number; rowCount: number }

    switch (job.type) {
      case 'clients':
        result = await processClientExport(parameters, job.format, job.createdBy)
        break

      case 'client_status':
        result = await processStatusExport(parameters, job.format, job.createdBy)
        break

      case 'fcash_summary':
        result = await processFcashSummaryExport(parameters, job.format, job.createdBy)
        break

      case 'pcni_summary':
        result = await processPcniSummaryExport(parameters, job.format, job.createdBy)
        break

      case 'branch_performance':
        result = await processBranchPerformanceExport(parameters, job.format, job.createdBy)
        break

      case 'user_activity':
        result = await processUserActivityExport(parameters, job.format, job.createdBy)
        break

      default:
        throw new Error(`Unknown export type: ${job.type}`)
    }

    await completeExportJob(jobId, result)

    console.log(`Export job ${jobId} completed: ${result.rowCount} rows`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    await failExportJob(jobId, message)
    console.error(`Export job ${jobId} failed:`, error)
    throw error
  }
}

// Placeholder processors for other export types
async function processFcashSummaryExport(parameters: any, format: 'csv' | 'xlsx', userId: string) {
  // Implementation similar to status export but with FCASH-specific aggregations
  throw new Error('Not implemented')
}

async function processPcniSummaryExport(parameters: any, format: 'csv' | 'xlsx', userId: string) {
  // Implementation similar to status export but with PCNI-specific aggregations
  throw new Error('Not implemented')
}

async function processBranchPerformanceExport(parameters: any, format: 'csv' | 'xlsx', userId: string) {
  // Branch performance metrics export
  throw new Error('Not implemented')
}

async function processUserActivityExport(parameters: any, format: 'csv' | 'xlsx', userId: string) {
  // User activity log export
  throw new Error('Not implemented')
}
```

**Acceptance Criteria:**
- [ ] Queue handler processes pending jobs
- [ ] Routes to correct processor
- [ ] Updates job status
- [ ] Handles errors gracefully
- [ ] Logs progress

---

### Task 5: Dashboard Summary Queries

**File:** `src/features/reports/queries/dashboard.queries.ts`

```typescript
import { db } from '@/lib/db'
import {
  clients,
  clientPeriodStatus,
  statusTypes,
  branches,
  pensionTypes,
  companies,
} from '@/lib/db/schema'
import { eq, and, sql, isNull, count } from 'drizzle-orm'

export interface DashboardFilters {
  companyId?: string
  branchIds?: string[]
  periodYear: number
  periodMonth?: number
  periodQuarter?: number
}

export interface StatusSummary {
  statusCode: string
  statusName: string
  count: number
  percentage: number
}

export interface PensionTypeSummary {
  pensionTypeCode: string
  pensionTypeName: string
  total: number
  byStatus: StatusSummary[]
}

// Get status summary counts
export async function getStatusSummary(filters: DashboardFilters): Promise<StatusSummary[]> {
  const conditions = [eq(clientPeriodStatus.periodYear, filters.periodYear)]

  if (filters.periodMonth) {
    conditions.push(eq(clientPeriodStatus.periodMonth, filters.periodMonth))
  }

  if (filters.periodQuarter) {
    conditions.push(eq(clientPeriodStatus.periodQuarter, filters.periodQuarter))
  }

  // Apply company filter through client -> pension_type -> company
  // This requires a subquery or CTE for efficiency

  const result = await db
    .select({
      statusCode: statusTypes.code,
      statusName: statusTypes.name,
      count: sql<number>`count(*)::int`,
    })
    .from(clientPeriodStatus)
    .leftJoin(statusTypes, eq(clientPeriodStatus.statusTypeId, statusTypes.id))
    .where(and(...conditions))
    .groupBy(statusTypes.code, statusTypes.name)
    .orderBy(statusTypes.sequence)

  const total = result.reduce((sum, r) => sum + r.count, 0)

  return result.map((r) => ({
    statusCode: r.statusCode ?? 'unknown',
    statusName: r.statusName ?? 'Unknown',
    count: r.count,
    percentage: total > 0 ? Math.round((r.count / total) * 1000) / 10 : 0,
  }))
}

// Get breakdown by pension type
export async function getPensionTypeSummary(filters: DashboardFilters): Promise<PensionTypeSummary[]> {
  const conditions = [eq(clientPeriodStatus.periodYear, filters.periodYear)]

  if (filters.periodMonth) {
    conditions.push(eq(clientPeriodStatus.periodMonth, filters.periodMonth))
  }

  const result = await db
    .select({
      pensionTypeCode: pensionTypes.code,
      pensionTypeName: pensionTypes.name,
      statusCode: statusTypes.code,
      statusName: statusTypes.name,
      count: sql<number>`count(*)::int`,
    })
    .from(clientPeriodStatus)
    .innerJoin(clients, eq(clientPeriodStatus.clientId, clients.id))
    .leftJoin(pensionTypes, eq(clients.pensionTypeId, pensionTypes.id))
    .leftJoin(statusTypes, eq(clientPeriodStatus.statusTypeId, statusTypes.id))
    .where(and(...conditions))
    .groupBy(pensionTypes.code, pensionTypes.name, statusTypes.code, statusTypes.name)
    .orderBy(pensionTypes.name)

  // Group by pension type
  const grouped = new Map<string, { name: string; total: number; statuses: Map<string, { name: string; count: number }> }>()

  for (const row of result) {
    const key = row.pensionTypeCode ?? 'unknown'
    if (!grouped.has(key)) {
      grouped.set(key, {
        name: row.pensionTypeName ?? 'Unknown',
        total: 0,
        statuses: new Map(),
      })
    }
    const group = grouped.get(key)!
    group.total += row.count
    group.statuses.set(row.statusCode ?? 'unknown', {
      name: row.statusName ?? 'Unknown',
      count: row.count,
    })
  }

  return Array.from(grouped.entries()).map(([code, data]) => ({
    pensionTypeCode: code,
    pensionTypeName: data.name,
    total: data.total,
    byStatus: Array.from(data.statuses.entries()).map(([statusCode, statusData]) => ({
      statusCode,
      statusName: statusData.name,
      count: statusData.count,
      percentage: data.total > 0 ? Math.round((statusData.count / data.total) * 1000) / 10 : 0,
    })),
  }))
}

// Get branch performance summary
export async function getBranchPerformanceSummary(filters: DashboardFilters) {
  const conditions = [eq(clientPeriodStatus.periodYear, filters.periodYear)]

  if (filters.periodMonth) {
    conditions.push(eq(clientPeriodStatus.periodMonth, filters.periodMonth))
  }

  const result = await db
    .select({
      branchCode: branches.code,
      branchName: branches.name,
      totalClients: sql<number>`count(distinct ${clientPeriodStatus.clientId})::int`,
      completedCount: sql<number>`count(*) filter (where ${statusTypes.code} = 'DONE')::int`,
    })
    .from(clientPeriodStatus)
    .innerJoin(clients, eq(clientPeriodStatus.clientId, clients.id))
    .leftJoin(branches, eq(clients.branchId, branches.id))
    .leftJoin(statusTypes, eq(clientPeriodStatus.statusTypeId, statusTypes.id))
    .where(and(...conditions))
    .groupBy(branches.code, branches.name)
    .orderBy(branches.name)

  return result.map((r) => ({
    branchCode: r.branchCode,
    branchName: r.branchName,
    totalClients: r.totalClients,
    completedCount: r.completedCount,
    completionRate: r.totalClients > 0
      ? Math.round((r.completedCount / r.totalClients) * 1000) / 10
      : 0,
  }))
}

// Get daily/weekly trends
export async function getStatusTrends(filters: DashboardFilters & { days?: number }) {
  const { days = 30 } = filters
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const result = await db
    .select({
      date: sql<string>`date(${clientPeriodStatus.updatedAt})`,
      statusCode: statusTypes.code,
      count: sql<number>`count(*)::int`,
    })
    .from(clientPeriodStatus)
    .leftJoin(statusTypes, eq(clientPeriodStatus.statusTypeId, statusTypes.id))
    .where(
      and(
        eq(clientPeriodStatus.periodYear, filters.periodYear),
        filters.periodMonth ? eq(clientPeriodStatus.periodMonth, filters.periodMonth) : undefined,
        sql`${clientPeriodStatus.updatedAt} >= ${startDate.toISOString()}`
      )
    )
    .groupBy(sql`date(${clientPeriodStatus.updatedAt})`, statusTypes.code)
    .orderBy(sql`date(${clientPeriodStatus.updatedAt})`)

  // Group by date
  const byDate = new Map<string, Record<string, number>>()

  for (const row of result) {
    if (!byDate.has(row.date)) {
      byDate.set(row.date, {})
    }
    byDate.get(row.date)![row.statusCode ?? 'unknown'] = row.count
  }

  return Array.from(byDate.entries()).map(([date, counts]) => ({
    date,
    ...counts,
  }))
}
```

**Acceptance Criteria:**
- [ ] Status summary with percentages
- [ ] Pension type breakdown
- [ ] Branch performance summary
- [ ] Trends over time
- [ ] Filter support

---

### Task 6: Reports API Routes

**File:** `src/app/api/[[...route]]/routes/reports.routes.ts`

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { requireAuth, requirePermission } from '@/lib/api/middleware/auth'
import {
  createExportJob,
  getExportJob,
  listExportJobs,
  getDownloadUrl,
} from '@/features/exports/services/export.service'
import {
  getStatusSummary,
  getPensionTypeSummary,
  getBranchPerformanceSummary,
  getStatusTrends,
} from '@/features/reports/queries/dashboard.queries'
import { successResponse, errorResponse } from '@/lib/api/response'

const app = new Hono()

app.use('*', requireAuth())

// ============== Dashboard Reports ==============

// Get status summary
app.get(
  '/dashboard/status-summary',
  requirePermission('reports:read'),
  zValidator(
    'query',
    z.object({
      companyId: z.string().uuid().optional(),
      periodYear: z.coerce.number(),
      periodMonth: z.coerce.number().min(1).max(12).optional(),
      periodQuarter: z.coerce.number().min(1).max(4).optional(),
    })
  ),
  async (c) => {
    const filters = c.req.valid('query')
    const summary = await getStatusSummary(filters)
    return c.json(successResponse(summary))
  }
)

// Get pension type breakdown
app.get(
  '/dashboard/pension-type-summary',
  requirePermission('reports:read'),
  zValidator(
    'query',
    z.object({
      companyId: z.string().uuid().optional(),
      periodYear: z.coerce.number(),
      periodMonth: z.coerce.number().min(1).max(12).optional(),
      periodQuarter: z.coerce.number().min(1).max(4).optional(),
    })
  ),
  async (c) => {
    const filters = c.req.valid('query')
    const summary = await getPensionTypeSummary(filters)
    return c.json(successResponse(summary))
  }
)

// Get branch performance
app.get(
  '/dashboard/branch-performance',
  requirePermission('reports:read'),
  zValidator(
    'query',
    z.object({
      companyId: z.string().uuid().optional(),
      periodYear: z.coerce.number(),
      periodMonth: z.coerce.number().min(1).max(12).optional(),
    })
  ),
  async (c) => {
    const filters = c.req.valid('query')
    const summary = await getBranchPerformanceSummary(filters)
    return c.json(successResponse(summary))
  }
)

// Get trends
app.get(
  '/dashboard/trends',
  requirePermission('reports:read'),
  zValidator(
    'query',
    z.object({
      companyId: z.string().uuid().optional(),
      periodYear: z.coerce.number(),
      periodMonth: z.coerce.number().min(1).max(12).optional(),
      days: z.coerce.number().min(7).max(90).default(30),
    })
  ),
  async (c) => {
    const filters = c.req.valid('query')
    const trends = await getStatusTrends(filters)
    return c.json(successResponse(trends))
  }
)

// ============== Export Jobs ==============

// Request export
app.post(
  '/exports',
  requirePermission('reports:export'),
  zValidator(
    'json',
    z.object({
      type: z.enum(['clients', 'client_status', 'fcash_summary', 'pcni_summary', 'branch_performance', 'user_activity']),
      name: z.string().min(1).max(255),
      format: z.enum(['csv', 'xlsx']).default('xlsx'),
      parameters: z.object({
        filters: z.record(z.unknown()).optional(),
        columns: z.array(z.string()).optional(),
        sortBy: z.string().optional(),
        sortOrder: z.enum(['asc', 'desc']).optional(),
        dateRange: z.object({
          from: z.string(),
          to: z.string(),
        }).optional(),
        companyId: z.string().uuid().optional(),
        branchIds: z.array(z.string().uuid()).optional(),
        periodYear: z.number().optional(),
        periodMonth: z.number().optional(),
        periodQuarter: z.number().optional(),
      }).optional(),
    })
  ),
  async (c) => {
    const { type, name, format, parameters } = c.req.valid('json')
    const userId = c.get('userId')

    const jobId = await createExportJob(type, name, parameters ?? {}, format, userId)

    // Trigger async processing (in production, this would go to a queue)
    // For now, we'll process synchronously in the background
    processExportInBackground(jobId)

    return c.json(successResponse({ jobId }), 202)
  }
)

// Get export job status
app.get(
  '/exports/:id',
  requirePermission('reports:export'),
  zValidator('param', z.object({ id: z.string().uuid() })),
  async (c) => {
    const { id } = c.req.valid('param')
    const job = await getExportJob(id)
    if (!job) return c.json(errorResponse('EXPORT_NOT_FOUND', 'Export job not found'), 404)
    return c.json(successResponse(job))
  }
)

// List user's exports
app.get(
  '/exports',
  requirePermission('reports:export'),
  zValidator(
    'query',
    z.object({
      page: z.coerce.number().min(1).default(1),
      pageSize: z.coerce.number().min(1).max(50).default(20),
    })
  ),
  async (c) => {
    const { page, pageSize } = c.req.valid('query')
    const userId = c.get('userId')
    const jobs = await listExportJobs(userId, { page, pageSize })
    return c.json(successResponse(jobs))
  }
)

// Download export
app.get(
  '/exports/:id/download',
  requirePermission('reports:export'),
  zValidator('param', z.object({ id: z.string().uuid() })),
  async (c) => {
    const { id } = c.req.valid('param')
    const job = await getExportJob(id)

    if (!job) {
      return c.json(errorResponse('EXPORT_NOT_FOUND', 'Export job not found'), 404)
    }

    if (job.status !== 'completed') {
      return c.json(errorResponse('EXPORT_NOT_READY', 'Export is not ready for download'), 400)
    }

    if (!job.filePath) {
      return c.json(errorResponse('FILE_NOT_FOUND', 'Export file not found'), 404)
    }

    const downloadUrl = await getDownloadUrl(job.filePath)
    return c.json(successResponse({ downloadUrl, fileName: job.fileName }))
  }
)

// Helper to process export in background
async function processExportInBackground(jobId: string) {
  const { processExportJob } = await import('@/features/exports/handlers/process-export.handler')
  // In production, this should use a proper queue
  // For simplicity, we're using setTimeout to simulate async
  setTimeout(() => {
    processExportJob(jobId).catch(console.error)
  }, 0)
}

export default app
```

**Acceptance Criteria:**
- [ ] Dashboard summary endpoints
- [ ] Pension type breakdown endpoint
- [ ] Branch performance endpoint
- [ ] Trends endpoint
- [ ] Create export job
- [ ] Get export status
- [ ] List user's exports
- [ ] Download export (signed URL)

---

### Task 7: Wire Up Reports Routes

**File:** `src/app/api/[[...route]]/route.ts`

Update main API route:

```typescript
import reportsRoutes from './routes/reports.routes'

// ... existing code

app.route('/reports', reportsRoutes)
```

**Acceptance Criteria:**
- [ ] Reports routes mounted
- [ ] All endpoints accessible

---

### Task 8: Dashboard Page

**File:** `src/app/(dashboard)/reports/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { PieChart, BarChart3, TrendingUp, Users } from 'lucide-react'
import { api } from '@/lib/api/client'
import { StatusPieChart } from './_components/status-pie-chart'
import { PensionTypeChart } from './_components/pension-type-chart'
import { BranchPerformanceTable } from './_components/branch-performance-table'
import { TrendsChart } from './_components/trends-chart'
import { PeriodSelector } from '@/components/shared/period-selector'

export default function ReportsPage() {
  const [periodYear, setPeriodYear] = useState(new Date().getFullYear())
  const [periodMonth, setPeriodMonth] = useState<number | undefined>(new Date().getMonth() + 1)
  const [companyId, setCompanyId] = useState<string>('')

  // Fetch companies
  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api.get('/lookups/companies'),
  })

  // Fetch status summary
  const { data: statusSummary, isLoading: statusLoading } = useQuery({
    queryKey: ['status-summary', { companyId, periodYear, periodMonth }],
    queryFn: () =>
      api.get('/reports/dashboard/status-summary', {
        params: { companyId: companyId || undefined, periodYear, periodMonth },
      }),
  })

  // Fetch pension type summary
  const { data: pensionTypeSummary, isLoading: pensionTypeLoading } = useQuery({
    queryKey: ['pension-type-summary', { companyId, periodYear, periodMonth }],
    queryFn: () =>
      api.get('/reports/dashboard/pension-type-summary', {
        params: { companyId: companyId || undefined, periodYear, periodMonth },
      }),
  })

  // Fetch branch performance
  const { data: branchPerformance, isLoading: branchLoading } = useQuery({
    queryKey: ['branch-performance', { companyId, periodYear, periodMonth }],
    queryFn: () =>
      api.get('/reports/dashboard/branch-performance', {
        params: { companyId: companyId || undefined, periodYear, periodMonth },
      }),
  })

  // Fetch trends
  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['trends', { companyId, periodYear, periodMonth }],
    queryFn: () =>
      api.get('/reports/dashboard/trends', {
        params: { companyId: companyId || undefined, periodYear, periodMonth, days: 30 },
      }),
  })

  const totalClients = statusSummary?.data?.reduce((sum: number, s: any) => sum + s.count, 0) ?? 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Reports Dashboard</h1>
        <div className="flex gap-4">
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Companies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Companies</SelectItem>
              {companiesData?.data?.map((company: any) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <PeriodSelector
            year={periodYear}
            month={periodMonth}
            onYearChange={setPeriodYear}
            onMonthChange={setPeriodMonth}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClients.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Badge variant="default">DONE</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statusSummary?.data?.find((s: any) => s.statusCode === 'DONE')?.count ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {statusSummary?.data?.find((s: any) => s.statusCode === 'DONE')?.percentage ?? 0}% of total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Badge variant="secondary">CALLED/UPDATED</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(statusSummary?.data?.find((s: any) => s.statusCode === 'CALLED')?.count ?? 0) +
                (statusSummary?.data?.find((s: any) => s.statusCode === 'UPDATED')?.count ?? 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Badge variant="outline">PENDING</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statusSummary?.data?.find((s: any) => s.statusCode === 'PENDING')?.count ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Status Distribution
            </CardTitle>
            <CardDescription>Client status breakdown for selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {statusLoading ? (
              <div className="h-[300px] flex items-center justify-center">Loading...</div>
            ) : (
              <StatusPieChart data={statusSummary?.data ?? []} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              By Pension Type
            </CardTitle>
            <CardDescription>Status breakdown by pension type</CardDescription>
          </CardHeader>
          <CardContent>
            {pensionTypeLoading ? (
              <div className="h-[300px] flex items-center justify-center">Loading...</div>
            ) : (
              <PensionTypeChart data={pensionTypeSummary?.data ?? []} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            30-Day Trends
          </CardTitle>
          <CardDescription>Status updates over time</CardDescription>
        </CardHeader>
        <CardContent>
          {trendsLoading ? (
            <div className="h-[300px] flex items-center justify-center">Loading...</div>
          ) : (
            <TrendsChart data={trends?.data ?? []} />
          )}
        </CardContent>
      </Card>

      {/* Branch Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Branch Performance</CardTitle>
          <CardDescription>Completion rates by branch</CardDescription>
        </CardHeader>
        <CardContent>
          {branchLoading ? (
            <div className="h-[200px] flex items-center justify-center">Loading...</div>
          ) : (
            <BranchPerformanceTable data={branchPerformance?.data ?? []} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

**Acceptance Criteria:**
- [ ] Summary cards with key metrics
- [ ] Period and company filters
- [ ] Status distribution pie chart
- [ ] Pension type bar chart
- [ ] Trends line chart
- [ ] Branch performance table
- [ ] Responsive layout

---

### Task 9: Export Management UI

**File:** `src/app/(dashboard)/reports/exports/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Download, FileSpreadsheet, FileText, Plus, RefreshCw, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { api } from '@/lib/api/client'
import { formatDistanceToNow } from 'date-fns'

const EXPORT_TYPES = [
  { value: 'clients', label: 'Clients List' },
  { value: 'client_status', label: 'Client Status' },
  { value: 'fcash_summary', label: 'FCASH Summary' },
  { value: 'pcni_summary', label: 'PCNI Summary' },
  { value: 'branch_performance', label: 'Branch Performance' },
  { value: 'user_activity', label: 'User Activity' },
]

const STATUS_ICONS = {
  pending: Clock,
  processing: Loader2,
  completed: CheckCircle,
  failed: XCircle,
}

const STATUS_COLORS = {
  pending: 'secondary',
  processing: 'default',
  completed: 'success',
  failed: 'destructive',
} as const

export default function ExportsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [exportType, setExportType] = useState('')
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx')
  const [exportName, setExportName] = useState('')

  const queryClient = useQueryClient()

  // Fetch export jobs
  const { data: exportsData, isLoading, refetch } = useQuery({
    queryKey: ['exports'],
    queryFn: () => api.get('/reports/exports'),
    refetchInterval: 5000, // Poll for updates
  })

  // Create export mutation
  const createExportMutation = useMutation({
    mutationFn: (data: { type: string; name: string; format: 'csv' | 'xlsx' }) =>
      api.post('/reports/exports', {
        type: data.type,
        name: data.name,
        format: data.format,
        parameters: {},
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exports'] })
      setIsDialogOpen(false)
      resetForm()
    },
  })

  // Download mutation
  const downloadMutation = useMutation({
    mutationFn: (id: string) => api.get(`/reports/exports/${id}/download`),
    onSuccess: (data) => {
      if (data?.data?.downloadUrl) {
        window.open(data.data.downloadUrl, '_blank')
      }
    },
  })

  const resetForm = () => {
    setExportType('')
    setExportFormat('xlsx')
    setExportName('')
  }

  const handleCreateExport = () => {
    if (!exportType || !exportName) return
    createExportMutation.mutate({
      type: exportType,
      name: exportName,
      format: exportFormat,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Export Management</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Export
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Export</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Export Type</Label>
                  <Select value={exportType} onValueChange={setExportType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select export type" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPORT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Export Name</Label>
                  <Input
                    value={exportName}
                    onChange={(e) => setExportName(e.target.value)}
                    placeholder="e.g., January 2026 Clients"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Format</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={exportFormat === 'xlsx' ? 'default' : 'outline'}
                      onClick={() => setExportFormat('xlsx')}
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Excel
                    </Button>
                    <Button
                      type="button"
                      variant={exportFormat === 'csv' ? 'default' : 'outline'}
                      onClick={() => setExportFormat('csv')}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      CSV
                    </Button>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={handleCreateExport}
                  disabled={!exportType || !exportName || createExportMutation.isPending}
                >
                  {createExportMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Create Export
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Exports</CardTitle>
          <CardDescription>Your export history (expires after 24 hours)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : exportsData?.data?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No exports yet. Create your first export above.
            </div>
          ) : (
            <div className="space-y-3">
              {exportsData?.data?.map((job: any) => {
                const StatusIcon = STATUS_ICONS[job.status as keyof typeof STATUS_ICONS]
                return (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-muted rounded">
                        {job.format === 'xlsx' ? (
                          <FileSpreadsheet className="h-5 w-5" />
                        ) : (
                          <FileText className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{job.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {EXPORT_TYPES.find((t) => t.value === job.type)?.label} &bull;{' '}
                          {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                        </div>
                        {job.rowCount && (
                          <div className="text-xs text-muted-foreground">
                            {job.rowCount.toLocaleString()} rows &bull;{' '}
                            {(job.fileSize / 1024).toFixed(1)} KB
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={STATUS_COLORS[job.status as keyof typeof STATUS_COLORS]}>
                        <StatusIcon
                          className={`h-3 w-3 mr-1 ${job.status === 'processing' ? 'animate-spin' : ''}`}
                        />
                        {job.status}
                      </Badge>
                      {job.status === 'completed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadMutation.mutate(job.id)}
                          disabled={downloadMutation.isPending}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      )}
                      {job.status === 'failed' && (
                        <span className="text-sm text-destructive">{job.error}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

**Acceptance Criteria:**
- [ ] List export jobs with status
- [ ] Create new export dialog
- [ ] Export type selection
- [ ] Format selection (CSV/XLSX)
- [ ] Auto-refresh for status updates
- [ ] Download button for completed exports
- [ ] Error display for failed exports

---

### Task 10: Chart Components

**File:** `src/app/(dashboard)/reports/_components/status-pie-chart.tsx`

```typescript
'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface StatusPieChartProps {
  data: Array<{
    statusCode: string
    statusName: string
    count: number
    percentage: number
  }>
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#94a3b8',
  TO_FOLLOW: '#f59e0b',
  CALLED: '#3b82f6',
  VISITED: '#8b5cf6',
  UPDATED: '#10b981',
  DONE: '#22c55e',
}

export function StatusPieChart({ data }: StatusPieChartProps) {
  const chartData = data.map((item) => ({
    name: item.statusName,
    value: item.count,
    color: STATUS_COLORS[item.statusCode] ?? '#6b7280',
  }))

  if (chartData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [value.toLocaleString(), 'Count']}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
```

**File:** `src/app/(dashboard)/reports/_components/trends-chart.tsx`

```typescript
'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { format, parseISO } from 'date-fns'

interface TrendsChartProps {
  data: Array<{
    date: string
    PENDING?: number
    TO_FOLLOW?: number
    CALLED?: number
    VISITED?: number
    UPDATED?: number
    DONE?: number
  }>
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#94a3b8',
  TO_FOLLOW: '#f59e0b',
  CALLED: '#3b82f6',
  VISITED: '#8b5cf6',
  UPDATED: '#10b981',
  DONE: '#22c55e',
}

export function TrendsChart({ data }: TrendsChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    )
  }

  const statusKeys = Object.keys(STATUS_COLORS)

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickFormatter={(date) => format(parseISO(date), 'MMM d')}
        />
        <YAxis />
        <Tooltip
          labelFormatter={(date) => format(parseISO(date as string), 'MMM d, yyyy')}
        />
        <Legend />
        {statusKeys.map((status) => (
          <Line
            key={status}
            type="monotone"
            dataKey={status}
            stroke={STATUS_COLORS[status]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
```

**File:** `src/app/(dashboard)/reports/_components/branch-performance-table.tsx`

```typescript
'use client'

import { Progress } from '@/components/ui/progress'

interface BranchPerformanceTableProps {
  data: Array<{
    branchCode: string
    branchName: string
    totalClients: number
    completedCount: number
    completionRate: number
  }>
}

export function BranchPerformanceTable({ data }: BranchPerformanceTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No data available
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {data.slice(0, 10).map((branch) => (
        <div key={branch.branchCode} className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{branch.branchName}</span>
            <span className="text-muted-foreground">
              {branch.completedCount} / {branch.totalClients} ({branch.completionRate}%)
            </span>
          </div>
          <Progress value={branch.completionRate} className="h-2" />
        </div>
      ))}
      {data.length > 10 && (
        <div className="text-center text-sm text-muted-foreground">
          And {data.length - 10} more branches...
        </div>
      )}
    </div>
  )
}
```

**Acceptance Criteria:**
- [ ] Status pie chart with colors
- [ ] Trends line chart
- [ ] Branch performance with progress bars
- [ ] Responsive sizing
- [ ] Empty state handling

---

## Dependencies

### NPM Packages

```bash
pnpm add exceljs csv-stringify recharts date-fns
```

### Database Tables
- `export_jobs` - Defined in design document
- `export_templates` - Optional for predefined configurations

### Permissions Required
- `reports:read` - View dashboard reports
- `reports:export` - Create and download exports

---

## Testing Checklist

- [ ] Create export job
- [ ] Process export (clients, status)
- [ ] Generate XLSX with styling
- [ ] Generate CSV
- [ ] Upload to Supabase Storage
- [ ] Download with signed URL
- [ ] Cleanup expired exports
- [ ] Dashboard summary queries
- [ ] Pension type breakdown
- [ ] Branch performance
- [ ] Trends calculation
- [ ] Chart rendering
- [ ] Export status polling
- [ ] Permission checks

---

## Notes

1. **Async Processing** - Exports run asynchronously. In production, use a proper queue (pg_cron or external).
2. **File Expiry** - Exports expire after 24 hours to manage storage costs.
3. **Signed URLs** - Downloads use Supabase signed URLs (1 hour validity).
4. **Large Exports** - Consider pagination/streaming for very large datasets.
5. **Chart Library** - Using Recharts for responsive, React-native charts.
