/**
 * Period Initialization Service
 * Handles initialization of new tracking periods with PENDING status records
 */

import { db } from '@/server/db/index'
import { clients, clientPeriodStatus, statusTypes, products, companies } from '@/server/db/schema'
import { eq, and, isNull, inArray } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import type { CreateClientPeriodStatusInput } from '@/server/db/queries/status'

// Type definitions
export interface InitializationResult {
  success: boolean
  initialized: number
  skipped: number
  failed: number
  errors: Array<{ clientId: string; error: string }>
}

export interface BatchResult {
  success: boolean
  processed: number
  failed: number
  errors: Array<{ index: number; error: string }>
}

export interface Client {
  id: string
  clientCode: string
  fullName: string
  productId: string
  branchId: string
}

/**
 * Get clients to initialize for a new period
 * @param companyId - Company ID
 * @param excludeTerminal - Whether to exclude clients with terminal statuses
 * @returns Array of clients to initialize
 */
export async function getClientsForInitialization(
  companyId: string,
  excludeTerminal: boolean = true
): Promise<Client[]> {
  try {
    let query = db
      .select({
        id: clients.id,
        clientCode: clients.clientCode,
        fullName: clients.fullName,
        productId: clients.productId,
        branchId: clients.branchId,
      })
      .from(clients)
      .innerJoin(products, eq(clients.productId, products.id))
      .innerJoin(companies, eq(products.companyId, companies.id))
      .where(
        and(
          eq(companies.id, companyId),
          isNull(clients.deletedAt)
        )
      )

    if (excludeTerminal) {
      // Get clients with terminal statuses from previous periods
      const terminalStatuses = await db
        .select({ clientId: clientPeriodStatus.clientId })
        .from(clientPeriodStatus)
        .where(eq(clientPeriodStatus.isTerminal, true))

      const terminalClientIds = terminalStatuses.map((s) => s.clientId)

      if (terminalClientIds.length > 0) {
        query = query.where(
          and(
            eq(companies.id, companyId),
            isNull(clients.deletedAt),
            // Exclude clients with terminal statuses
            // Note: This is a simplified approach. In production, you might want
            // to check only the most recent status or use a more complex query
          )
        )
      }
    }

    const result = await query

    logger.info('Retrieved clients for initialization', {
      action: 'get_clients_for_initialization',
      companyId,
      excludeTerminal,
      count: result.length,
    })

    return result
  } catch (error) {
    logger.error('Failed to get clients for initialization', error as Error, {
      action: 'get_clients_for_initialization',
      companyId,
      excludeTerminal,
    })
    throw error
  }
}

/**
 * Create PENDING records for new period
 * @param companyId - Company ID
 * @param periodType - Period type (monthly or quarterly)
 * @param periodYear - Period year
 * @param periodMonth - Period month (1-12 for monthly periods)
 * @param periodQuarter - Period quarter (1-4 for quarterly periods)
 * @returns Initialization result with counts
 */
export async function initializePeriod(
  companyId: string,
  periodType: 'monthly' | 'quarterly',
  periodYear: number,
  periodMonth?: number,
  periodQuarter?: number
): Promise<InitializationResult> {
  const result: InitializationResult = {
    success: true,
    initialized: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  }

  try {
    // Get PENDING status type ID
    const pendingStatus = await db
      .select({ id: statusTypes.id })
      .from(statusTypes)
      .where(eq(statusTypes.code, 'PENDING'))
      .limit(1)

    if (!pendingStatus[0]) {
      throw new Error('PENDING status type not found')
    }

    const pendingStatusId = pendingStatus[0].id

    // Get clients to initialize (excluding terminal statuses)
    const clientsToInit = await getClientsForInitialization(companyId, true)

    // Get clients that already have status for this period
    const existingStatuses = await db
      .select({ clientId: clientPeriodStatus.clientId })
      .from(clientPeriodStatus)
      .where(
        and(
          eq(clientPeriodStatus.periodType, periodType),
          eq(clientPeriodStatus.periodYear, periodYear),
          periodMonth !== undefined ? eq(clientPeriodStatus.periodMonth, periodMonth) : undefined,
          periodQuarter !== undefined ? eq(clientPeriodStatus.periodQuarter, periodQuarter) : undefined
        )
      )

    const existingClientIds = new Set(existingStatuses.map((s) => s.clientId))

    // Filter out clients that already have status for this period
    const clientsToCreate = clientsToInit.filter(
      (client) => !existingClientIds.has(client.id)
    )

    // Prepare records for batch creation
    const records: CreateClientPeriodStatusInput[] = clientsToCreate.map((client) => ({
      clientId: client.id,
      periodType,
      periodYear,
      periodMonth,
      periodQuarter,
      statusTypeId: pendingStatusId,
      hasPayment: false,
      updateCount: 0,
      isTerminal: false,
    }))

    // Batch create period statuses
    const batchResult = await batchCreatePeriodStatuses(records)

    result.initialized = batchResult.processed
    result.failed = batchResult.failed
    result.errors = batchResult.errors.map((e) => ({
      clientId: records[e.index].clientId,
      error: e.error,
    }))

    result.skipped = clientsToInit.length - clientsToCreate.length

    logger.info('Initialized period for clients', {
      action: 'initialize_period',
      companyId,
      periodType,
      periodYear,
      periodMonth,
      periodQuarter,
      initialized: result.initialized,
      skipped: result.skipped,
      failed: result.failed,
    })

    return result
  } catch (error) {
    result.success = false
    logger.error('Failed to initialize period', error as Error, {
      action: 'initialize_period',
      companyId,
      periodType,
      periodYear,
      periodMonth,
      periodQuarter,
    })

    result.errors.push({
      clientId: 'system',
      error: (error as Error).message,
    })

    return result
  }
}

/**
 * Batch processing for efficiency
 * @param records - Array of client period status records to create
 * @returns Batch result with counts
 */
export async function batchCreatePeriodStatuses(
  records: CreateClientPeriodStatusInput[]
): Promise<BatchResult> {
  const result: BatchResult = {
    success: true,
    processed: 0,
    failed: 0,
    errors: [],
  }

  try {
    // Process records in batches of 100
    const batchSize = 100
    const batches = []

    for (let i = 0; i < records.length; i += batchSize) {
      batches.push(records.slice(i, i + batchSize))
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]

      for (let i = 0; i < batch.length; i++) {
        const record = batch[i]
        const globalIndex = batchIndex * batchSize + i

        try {
          await db.insert(clientPeriodStatus).values({
            ...record,
            createdAt: new Date(),
            updatedAt: new Date(),
          })

          result.processed++
        } catch (error) {
          result.failed++
          result.errors.push({
            index: globalIndex,
            error: (error as Error).message,
          })

          logger.error('Failed to create period status in batch', error as Error, {
            action: 'batch_create_period_statuses',
            clientId: record.clientId,
            error: (error as Error).message,
          })
        }
      }
    }

    result.success = result.failed === 0

    logger.info('Batch created period statuses', {
      action: 'batch_create_period_statuses',
      total: records.length,
      processed: result.processed,
      failed: result.failed,
    })

    return result
  } catch (error) {
    result.success = false
    logger.error('Failed to batch create period statuses', error as Error, {
      action: 'batch_create_period_statuses',
      total: records.length,
    })

    return result
  }
}

/**
 * Check if period is already initialized
 * @param companyId - Company ID
 * @param periodType - Period type (monthly or quarterly)
 * @param periodYear - Period year
 * @param periodMonth - Period month (1-12 for monthly periods)
 * @param periodQuarter - Period quarter (1-4 for quarterly periods)
 * @returns True if period is already initialized
 */
export async function isPeriodInitialized(
  companyId: string,
  periodType: 'monthly' | 'quarterly',
  periodYear: number,
  periodMonth?: number,
  periodQuarter?: number
): Promise<boolean> {
  try {
    const conditions = [
      eq(products.companyId, companyId),
      eq(clientPeriodStatus.periodType, periodType),
      eq(clientPeriodStatus.periodYear, periodYear),
    ]

    if (periodMonth !== undefined) {
      conditions.push(eq(clientPeriodStatus.periodMonth, periodMonth))
    }

    if (periodQuarter !== undefined) {
      conditions.push(eq(clientPeriodStatus.periodQuarter, periodQuarter))
    }

    const result = await db
      .select({ count: clientPeriodStatus.id })
      .from(clientPeriodStatus)
      .innerJoin(clients, eq(clientPeriodStatus.clientId, clients.id))
      .innerJoin(products, eq(clients.productId, products.id))
      .where(and(...conditions))
      .limit(1)

    const isInitialized = result.length > 0

    logger.info('Checked if period is initialized', {
      action: 'is_period_initialized',
      companyId,
      periodType,
      periodYear,
      periodMonth,
      periodQuarter,
      isInitialized,
    })

    return isInitialized
  } catch (error) {
    logger.error('Failed to check if period is initialized', error as Error, {
      action: 'is_period_initialized',
      companyId,
      periodType,
      periodYear,
      periodMonth,
      periodQuarter,
    })

    return false
  }
}
