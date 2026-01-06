/**
 * Client export processor
 */

import { db } from '@/server/db'
import { clients, branches, areas, pensionTypes, pensionerTypes, products, parStatuses, accountTypes } from '@/server/db/schema'
import { eq, and, isNull, inArray } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import { generateXlsx, generateCsv } from '../services/export.service'
import type { ExportParameters, ExportColumnConfig, ExportResult } from '../types'

// Column configuration
const clientColumns: ExportColumnConfig[] = [
  { key: 'clientCode', label: 'Client Code', width: 15 },
  { key: 'fullName', label: 'Name', width: 25 },
  { key: 'pensionNumber', label: 'Pension Number', width: 15 },
  { key: 'pensionType', label: 'Pension Type', width: 15 },
  { key: 'pensionerType', label: 'Pensioner Type', width: 15 },
  { key: 'product', label: 'Product', width: 15 },
  { key: 'branchCode', label: 'Branch Code', width: 10 },
  { key: 'branchName', label: 'Branch', width: 20 },
  { key: 'areaName', label: 'Area', width: 15 },
  { key: 'parStatus', label: 'PAR Status', width: 15 },
  { key: 'accountType', label: 'Account Type', width: 15 },
  { key: 'pastDueAmount', label: 'Past Due Amount', width: 15 },
  { key: 'loanStatus', label: 'Loan Status', width: 15 },
  { key: 'contactNumber', label: 'Contact Number', width: 15 },
  { key: 'isActive', label: 'Active', width: 10 },
  { key: 'lastSyncedAt', label: 'Last Synced', width: 20 },
]

/**
 * Process client export
 */
export async function processClientExport(params: {
  jobId: string
  parameters: ExportParameters
}): Promise<ExportResult> {
  try {
    logger.info('Processing client export', {
      action: 'process_client_export',
      jobId: params.jobId,
      parameters: params.parameters,
    })

    // Build query conditions
    const conditions = [isNull(clients.deletedAt)]

    // Apply filters
    if (params.parameters.branchIds && params.parameters.branchIds.length > 0) {
      conditions.push(inArray(clients.branchId, params.parameters.branchIds))
    }

    // Fetch client data with joins
    const clientData = await db
      .select({
        id: clients.id,
        clientCode: clients.clientCode,
        fullName: clients.fullName,
        pensionNumber: clients.pensionNumber,
        birthDate: clients.birthDate,
        contactNumber: clients.contactNumber,
        contactNumberAlt: clients.contactNumberAlt,
        pastDueAmount: clients.pastDueAmount,
        loanStatus: clients.loanStatus,
        isActive: clients.isActive,
        lastSyncedAt: clients.lastSyncedAt,
        syncSource: clients.syncSource,
        createdAt: clients.createdAt,
        updatedAt: clients.updatedAt,
        pensionType: pensionTypes.name,
        pensionerType: pensionerTypes.name,
        product: products.name,
        branchCode: branches.code,
        branchName: branches.name,
        areaName: areas.name,
        parStatus: parStatuses.name,
        accountType: accountTypes.name,
      })
      .from(clients)
      .leftJoin(pensionTypes, eq(clients.pensionTypeId, pensionTypes.id))
      .leftJoin(pensionerTypes, eq(clients.pensionerTypeId, pensionerTypes.id))
      .leftJoin(products, eq(clients.productId, products.id))
      .leftJoin(branches, eq(clients.branchId, branches.id))
      .leftJoin(areas, eq(branches.areaId, areas.id))
      .leftJoin(parStatuses, eq(clients.parStatusId, parStatuses.id))
      .leftJoin(accountTypes, eq(clients.accountTypeId, accountTypes.id))
      .where(and(...conditions))
      .orderBy(clients.clientCode)

    // Format data for export
    const formattedData = clientData.map((client) => ({
      clientCode: client.clientCode,
      fullName: client.fullName,
      pensionNumber: client.pensionNumber || '',
      pensionType: client.pensionType || '',
      pensionerType: client.pensionerType || '',
      product: client.product || '',
      branchCode: client.branchCode || '',
      branchName: client.branchName || '',
      areaName: client.areaName || '',
      parStatus: client.parStatus || '',
      accountType: client.accountType || '',
      pastDueAmount: client.pastDueAmount ? Number(client.pastDueAmount).toFixed(2) : '0.00',
      loanStatus: client.loanStatus || '',
      contactNumber: client.contactNumber || '',
      isActive: client.isActive ? 'Yes' : 'No',
      lastSyncedAt: client.lastSyncedAt ? new Date(client.lastSyncedAt).toLocaleString() : '',
    }))

    // Determine file format
    const format = params.parameters.filters?.format || 'xlsx'
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `clients-export-${timestamp}.${format}`

    // Generate file based on format
    let buffer: Buffer
    if (format === 'xlsx') {
      buffer = await generateXlsx({
        data: formattedData,
        columns: clientColumns,
        fileName,
      })
    } else {
      buffer = await generateCsv({
        data: formattedData,
        columns: clientColumns,
        fileName,
      })
    }

    logger.info('Client export completed', {
      action: 'process_client_export',
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
    logger.error('Failed to process client export', error as Error, {
      action: 'process_client_export',
      jobId: params.jobId,
      parameters: params.parameters,
    })
    throw error
  }
}
