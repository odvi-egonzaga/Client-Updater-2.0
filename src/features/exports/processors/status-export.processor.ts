/**
 * Status export processor
 */

import { db } from '@/server/db'
import { clientPeriodStatus, clients, statusTypes, statusReasons, branches, products } from '@/server/db/schema'
import { eq, and, inArray, isNull } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import { generateXlsx, generateCsv } from '../services/export.service'
import type { ExportParameters, ExportColumnConfig, ExportResult } from '../types'

// Column configuration
const statusColumns: ExportColumnConfig[] = [
  { key: 'clientCode', label: 'Client Code', width: 15 },
  { key: 'clientName', label: 'Client Name', width: 25 },
  { key: 'periodType', label: 'Period Type', width: 12 },
  { key: 'periodYear', label: 'Year', width: 8 },
  { key: 'periodMonth', label: 'Month', width: 8 },
  { key: 'periodQuarter', label: 'Quarter', width: 8 },
  { key: 'status', label: 'Status', width: 15 },
  { key: 'reason', label: 'Reason', width: 20 },
  { key: 'remarks', label: 'Remarks', width: 30 },
  { key: 'hasPayment', label: 'Has Payment', width: 12 },
  { key: 'updateCount', label: 'Update Count', width: 12 },
  { key: 'isTerminal', label: 'Is Terminal', width: 12 },
  { key: 'branchName', label: 'Branch', width: 20 },
  { key: 'productName', label: 'Product', width: 20 },
  { key: 'updatedAt', label: 'Last Updated', width: 20 },
]

/**
 * Process status export
 */
export async function processStatusExport(params: {
  jobId: string
  parameters: ExportParameters
}): Promise<ExportResult> {
  try {
    logger.info('Processing status export', {
      action: 'process_status_export',
      jobId: params.jobId,
      parameters: params.parameters,
    })

    // Build query conditions
    const conditions = [isNull(clients.deletedAt)]

    // Apply filters
    if (params.parameters.branchIds && params.parameters.branchIds.length > 0) {
      conditions.push(inArray(clients.branchId, params.parameters.branchIds))
    }

    if (params.parameters.periodYear) {
      conditions.push(eq(clientPeriodStatus.periodYear, params.parameters.periodYear))
    }

    if (params.parameters.periodMonth) {
      conditions.push(eq(clientPeriodStatus.periodMonth, params.parameters.periodMonth))
    }

    if (params.parameters.periodQuarter) {
      conditions.push(eq(clientPeriodStatus.periodQuarter, params.parameters.periodQuarter))
    }

    // Fetch status data with joins
    const statusData = await db
      .select({
        id: clientPeriodStatus.id,
        clientId: clientPeriodStatus.clientId,
        clientCode: clients.clientCode,
        clientName: clients.fullName,
        periodType: clientPeriodStatus.periodType,
        periodMonth: clientPeriodStatus.periodMonth,
        periodQuarter: clientPeriodStatus.periodQuarter,
        periodYear: clientPeriodStatus.periodYear,
        statusTypeId: clientPeriodStatus.statusTypeId,
        statusTypeName: statusTypes.name,
        reasonId: clientPeriodStatus.reasonId,
        reasonName: statusReasons.name,
        remarks: clientPeriodStatus.remarks,
        hasPayment: clientPeriodStatus.hasPayment,
        updateCount: clientPeriodStatus.updateCount,
        isTerminal: clientPeriodStatus.isTerminal,
        updatedAt: clientPeriodStatus.updatedAt,
        createdAt: clientPeriodStatus.createdAt,
        branchName: branches.name,
        productName: products.name,
      })
      .from(clientPeriodStatus)
      .innerJoin(clients, eq(clientPeriodStatus.clientId, clients.id))
      .leftJoin(statusTypes, eq(clientPeriodStatus.statusTypeId, statusTypes.id))
      .leftJoin(statusReasons, eq(clientPeriodStatus.reasonId, statusReasons.id))
      .leftJoin(branches, eq(clients.branchId, branches.id))
      .leftJoin(products, eq(clients.productId, products.id))
      .where(and(...conditions))
      .orderBy(clients.clientCode, clientPeriodStatus.periodYear, clientPeriodStatus.periodMonth)

    // Format data for export
    const formattedData = statusData.map((status) => ({
      clientCode: status.clientCode,
      clientName: status.clientName,
      periodType: status.periodType,
      periodYear: status.periodYear,
      periodMonth: status.periodMonth || '',
      periodQuarter: status.periodQuarter || '',
      status: status.statusTypeName || '',
      reason: status.reasonName || '',
      remarks: status.remarks || '',
      hasPayment: status.hasPayment ? 'Yes' : 'No',
      updateCount: status.updateCount,
      isTerminal: status.isTerminal ? 'Yes' : 'No',
      branchName: status.branchName || '',
      productName: status.productName || '',
      updatedAt: status.updatedAt ? new Date(status.updatedAt).toLocaleString() : '',
    }))

    // Determine file format
    const format = params.parameters.filters?.format || 'xlsx'
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `status-export-${timestamp}.${format}`

    // Generate file based on format
    let buffer: Buffer
    if (format === 'xlsx') {
      buffer = await generateXlsx({
        data: formattedData,
        columns: statusColumns,
        fileName,
      })
    } else {
      buffer = await generateCsv({
        data: formattedData,
        columns: statusColumns,
        fileName,
      })
    }

    logger.info('Status export completed', {
      action: 'process_status_export',
      jobId: params.jobId,
      rowCount: formattedData.length,
      fileName,
    })

    return {
      buffer,
      fileName,
      rowCount: formattedData.length,
    }
  } catch (error) {
    logger.error('Failed to process status export', error as Error, {
      action: 'process_status_export',
      jobId: params.jobId,
      parameters: params.parameters,
    })
    throw error
  }
}
