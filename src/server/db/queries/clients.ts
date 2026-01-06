/**
 * Client queries for Phase 3 Client Management
 */

import { db } from '../index'
import {
  clients,
  clientSyncHistory,
  clientPeriodStatus,
  statusTypes,
  pensionTypes,
  pensionerTypes,
  products,
  branches,
  parStatuses,
  accountTypes,
} from '../schema'
import { eq, and, isNull, desc, sql, or, like, inArray } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import type { ClientFilters, ClientWithDetails, StatusCount } from '@/lib/sync/types'

/**
 * Get paginated clients with filters
 * @param db - Database instance
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of items per page (default: 25, max: 100)
 * @param filters - Optional filters
 * @returns Array of clients
 */
export async function getClients(
  db: any,
  page: number = 1,
  pageSize: number = 25,
  filters?: ClientFilters
) {
  const offset = (page - 1) * pageSize
  const limit = Math.min(pageSize, 100) // Max 100 per page

  try {
    let query = db.select().from(clients)

    // Apply filters
    if (filters) {
      const conditions = []

      // Filter out deleted clients
      conditions.push(isNull(clients.deletedAt))

      // Filter by branch IDs
      if (filters.branchIds && filters.branchIds.length > 0) {
        conditions.push(inArray(clients.branchId, filters.branchIds))
      }

      // Filter by pension type
      if (filters.pensionTypeId) {
        conditions.push(eq(clients.pensionTypeId, filters.pensionTypeId))
      }

      // Filter by pensioner type
      if (filters.pensionerTypeId) {
        conditions.push(eq(clients.pensionerTypeId, filters.pensionerTypeId))
      }

      // Filter by product
      if (filters.productId) {
        conditions.push(eq(clients.productId, filters.productId))
      }

      // Filter by PAR status
      if (filters.parStatusId) {
        conditions.push(eq(clients.parStatusId, filters.parStatusId))
      }

      // Filter by account type
      if (filters.accountTypeId) {
        conditions.push(eq(clients.accountTypeId, filters.accountTypeId))
      }

      // Filter by active status
      if (filters.isActive !== undefined) {
        conditions.push(eq(clients.isActive, filters.isActive))
      }

      // Search by client code, full name, or pension number
      if (filters.search) {
        const searchTerm = `%${filters.search}%`
        conditions.push(
          or(
            like(clients.clientCode, searchTerm),
            like(clients.fullName, searchTerm),
            like(clients.pensionNumber, searchTerm)
          )
        )
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions))
      }
    } else {
      // Always filter out deleted clients
      query = query.where(isNull(clients.deletedAt))
    }

    const result = await query
      .orderBy(desc(clients.createdAt))
      .limit(limit)
      .offset(offset)

    logger.info('Retrieved clients', {
      action: 'get_clients',
      count: result.length,
      page,
      pageSize,
      filters,
    })

    return result
  } catch (error) {
    logger.error('Failed to retrieve clients', error as Error, {
      action: 'get_clients',
      page,
      pageSize,
      filters,
    })
    throw error
  }
}

/**
 * Get a single client by ID
 * @param db - Database instance
 * @param clientId - Client ID
 * @returns Client or null if not found
 */
export async function getClientById(db: any, clientId: string) {
  try {
    const result = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, clientId), isNull(clients.deletedAt)))
      .limit(1)
    return result[0] ?? null
  } catch (error) {
    logger.error('Failed to get client by ID', error as Error, {
      action: 'get_client_by_id',
      clientId,
    })
    throw error
  }
}

/**
 * Get a single client by client code
 * @param db - Database instance
 * @param clientCode - Client code
 * @returns Client or null if not found
 */
export async function getClientByCode(db: any, clientCode: string) {
  try {
    const result = await db
      .select()
      .from(clients)
      .where(and(eq(clients.clientCode, clientCode), isNull(clients.deletedAt)))
      .limit(1)
    return result[0] ?? null
  } catch (error) {
    logger.error('Failed to get client by code', error as Error, {
      action: 'get_client_by_code',
      clientCode,
    })
    throw error
  }
}

/**
 * Get client with joined lookup data
 * @param db - Database instance
 * @param clientId - Client ID
 * @returns Client with details or null if not found
 */
export async function getClientWithDetails(db: any, clientId: string): Promise<ClientWithDetails | null> {
  try {
    // Get client with all lookups
    const client = await db
      .select({
        client: clients,
        pensionType: {
          id: pensionTypes.id,
          code: pensionTypes.code,
          name: pensionTypes.name,
        },
        pensionerType: {
          id: pensionerTypes.id,
          code: pensionerTypes.code,
          name: pensionerTypes.name,
        },
        product: {
          id: products.id,
          code: products.code,
          name: products.name,
        },
        branch: {
          id: branches.id,
          code: branches.code,
          name: branches.name,
        },
        parStatus: {
          id: parStatuses.id,
          code: parStatuses.code,
          name: parStatuses.name,
        },
        accountType: {
          id: accountTypes.id,
          code: accountTypes.code,
          name: accountTypes.name,
        },
      })
      .from(clients)
      .leftJoin(pensionTypes, eq(clients.pensionTypeId, pensionTypes.id))
      .leftJoin(pensionerTypes, eq(clients.pensionerTypeId, pensionerTypes.id))
      .leftJoin(products, eq(clients.productId, products.id))
      .leftJoin(branches, eq(clients.branchId, branches.id))
      .leftJoin(parStatuses, eq(clients.parStatusId, parStatuses.id))
      .leftJoin(accountTypes, eq(clients.accountTypeId, accountTypes.id))
      .where(and(eq(clients.id, clientId), isNull(clients.deletedAt)))
      .limit(1)

    if (!client[0]) {
      return null
    }

    // Get latest period status
    const latestStatus = await db
      .select({
        id: clientPeriodStatus.id,
        statusTypeId: clientPeriodStatus.statusTypeId,
        reasonId: clientPeriodStatus.reasonId,
        remarks: clientPeriodStatus.remarks,
        hasPayment: clientPeriodStatus.hasPayment,
        updatedAt: clientPeriodStatus.updatedAt,
      })
      .from(clientPeriodStatus)
      .where(eq(clientPeriodStatus.clientId, clientId))
      .orderBy(desc(clientPeriodStatus.updatedAt))
      .limit(1)

    const result: ClientWithDetails = {
      ...client[0].client,
      pensionType: client[0].pensionType as any,
      pensionerType: client[0].pensionerType as any,
      product: client[0].product as any,
      branch: client[0].branch as any,
      parStatus: client[0].parStatus as any,
      accountType: client[0].accountType as any,
      currentStatus: latestStatus[0] as any,
    }

    logger.info('Retrieved client with details', {
      action: 'get_client_with_details',
      clientId,
    })

    return result
  } catch (error) {
    logger.error('Failed to get client with details', error as Error, {
      action: 'get_client_with_details',
      clientId,
    })
    throw error
  }
}

/**
 * Fast autocomplete search for clients
 * @param db - Database instance
 * @param query - Search query
 * @param limit - Maximum number of results (default: 10)
 * @returns Array of clients with id, clientCode, fullName, pensionNumber
 */
export async function searchClients(
  db: any,
  query: string,
  limit: number = 10
) {
  try {
    const searchTerm = `%${query}%`

    const result = await db
      .select({
        id: clients.id,
        clientCode: clients.clientCode,
        fullName: clients.fullName,
        pensionNumber: clients.pensionNumber,
      })
      .from(clients)
      .where(
        and(
          isNull(clients.deletedAt),
          or(
            like(clients.clientCode, searchTerm),
            like(clients.fullName, searchTerm),
            like(clients.pensionNumber, searchTerm)
          )
        )
      )
      .orderBy(clients.fullName)
      .limit(limit)

    logger.info('Searched clients', {
      action: 'search_clients',
      query,
      count: result.length,
      limit,
    })

    return result
  } catch (error) {
    logger.error('Failed to search clients', error as Error, {
      action: 'search_clients',
      query,
      limit,
    })
    throw error
  }
}

/**
 * Upsert a single client (insert or update)
 * @param db - Database instance
 * @param clientData - Client data to upsert
 * @returns Upserted client
 */
export async function upsertClient(
  db: any,
  clientData: any
) {
  try {
    // Check if client exists by client code
    const existing = await getClientByCode(db, clientData.clientCode)

    let result
    if (existing) {
      // Update existing client
      result = await db
        .update(clients)
        .set({
          ...clientData,
          updatedAt: new Date(),
        })
        .where(eq(clients.id, existing.id))
        .returning()
    } else {
      // Insert new client
      result = await db.insert(clients).values(clientData).returning()
    }

    logger.info('Upserted client', {
      action: 'upsert_client',
      clientCode: clientData.clientCode,
      operation: existing ? 'update' : 'insert',
    })

    return result[0]
  } catch (error) {
    logger.error('Failed to upsert client', error as Error, {
      action: 'upsert_client',
      clientCode: clientData.clientCode,
    })
    throw error
  }
}

/**
 * Bulk upsert clients with created/updated counts
 * @param db - Database instance
 * @param clientDataArray - Array of client data to upsert
 * @returns Object with created and updated counts
 */
export async function bulkUpsertClients(
  db: any,
  clientDataArray: any[]
) {
  let created = 0
  let updated = 0
  const errors: Array<{ clientCode: string; error: string }> = []

  try {
    for (const clientData of clientDataArray) {
      try {
        const existing = await getClientByCode(db, clientData.clientCode)

        if (existing) {
          // Update existing client
          await db
            .update(clients)
            .set({
              ...clientData,
              updatedAt: new Date(),
            })
            .where(eq(clients.id, existing.id))
          updated++
        } else {
          // Insert new client
          await db.insert(clients).values(clientData)
          created++
        }
      } catch (error) {
        errors.push({
          clientCode: clientData.clientCode,
          error: (error as Error).message,
        })
        logger.error('Failed to upsert client in bulk', error as Error, {
          action: 'bulk_upsert_clients',
          clientCode: clientData.clientCode,
        })
      }
    }

    logger.info('Bulk upserted clients', {
      action: 'bulk_upsert_clients',
      total: clientDataArray.length,
      created,
      updated,
      errors: errors.length,
    })

    return {
      created,
      updated,
      failed: errors.length,
      errors,
    }
  } catch (error) {
    logger.error('Failed to bulk upsert clients', error as Error, {
      action: 'bulk_upsert_clients',
      total: clientDataArray.length,
    })
    throw error
  }
}

/**
 * Record a client sync change for audit trail
 * @param db - Database instance
 * @param clientId - Client ID
 * @param fieldName - Field that was changed
 * @param oldValue - Old value
 * @param newValue - New value
 * @param syncJobId - Optional sync job ID
 * @returns Created sync change record
 */
export async function recordClientSyncChange(
  db: any,
  clientId: string,
  fieldName: string,
  oldValue: string | null,
  newValue: string | null,
  syncJobId?: string
) {
  try {
    const result = await db
      .insert(clientSyncHistory)
      .values({
        clientId,
        fieldChanged: fieldName,
        oldValue: oldValue?.toString() || null,
        newValue: newValue?.toString() || null,
        syncJobId,
        changedAt: new Date(),
      })
      .returning()

    logger.debug('Recorded client sync change', {
      action: 'record_client_sync_change',
      clientId,
      fieldName,
      syncJobId,
    })

    return result[0]
  } catch (error) {
    logger.error('Failed to record client sync change', error as Error, {
      action: 'record_client_sync_change',
      clientId,
      fieldName,
    })
    throw error
  }
}

/**
 * Get sync history for a client
 * @param db - Database instance
 * @param clientId - Client ID
 * @returns Array of sync change records
 */
export async function getClientSyncHistory(db: any, clientId: string) {
  try {
    const result = await db
      .select()
      .from(clientSyncHistory)
      .where(eq(clientSyncHistory.clientId, clientId))
      .orderBy(desc(clientSyncHistory.changedAt))

    logger.info('Retrieved client sync history', {
      action: 'get_client_sync_history',
      clientId,
      count: result.length,
    })

    return result
  } catch (error) {
    logger.error('Failed to get client sync history', error as Error, {
      action: 'get_client_sync_history',
      clientId,
    })
    throw error
  }
}

/**
 * Count clients by status for dashboard aggregation
 * @param db - Database instance
 * @param branchIds - Optional branch IDs to filter by
 * @returns Array of status counts
 */
export async function countClientsByStatus(
  db: any,
  branchIds?: string[]
): Promise<StatusCount[]> {
  try {
    let query = db
      .select({
        statusTypeId: clientPeriodStatus.statusTypeId,
        statusTypeName: statusTypes.name,
        count: sql<number>`count(${clientPeriodStatus.id})`.as('count'),
      })
      .from(clientPeriodStatus)
      .innerJoin(statusTypes, eq(clientPeriodStatus.statusTypeId, statusTypes.id))
      .innerJoin(clients, eq(clientPeriodStatus.clientId, clients.id))
      .where(isNull(clients.deletedAt))

    // Filter by branch IDs if provided
    if (branchIds && branchIds.length > 0) {
      query = query.where(
        and(
          isNull(clients.deletedAt),
          inArray(clients.branchId, branchIds)
        )
      )
    }

    const result = await query.groupBy(clientPeriodStatus.statusTypeId, statusTypes.name)

    logger.info('Retrieved client counts by status', {
      action: 'count_clients_by_status',
      branchIds,
      count: result.length,
    })

    return result
  } catch (error) {
    logger.error('Failed to count clients by status', error as Error, {
      action: 'count_clients_by_status',
      branchIds,
    })
    throw error
  }
}

/**
 * Soft delete a client (set deletedAt)
 * @param db - Database instance
 * @param clientId - Client ID
 * @returns Deleted client
 */
export async function deleteClient(db: any, clientId: string) {
  try {
    const result = await db
      .update(clients)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(clients.id, clientId))
      .returning()

    if (!result[0]) {
      return null
    }

    logger.info('Deleted client', {
      action: 'delete_client',
      clientId,
    })

    return result[0]
  } catch (error) {
    logger.error('Failed to delete client', error as Error, {
      action: 'delete_client',
      clientId,
    })
    throw error
  }
}

/**
 * Restore a deleted client (clear deletedAt)
 * @param db - Database instance
 * @param clientId - Client ID
 * @returns Restored client
 */
export async function restoreClient(db: any, clientId: string) {
  try {
    const result = await db
      .update(clients)
      .set({
        deletedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(clients.id, clientId))
      .returning()

    if (!result[0]) {
      return null
    }

    logger.info('Restored client', {
      action: 'restore_client',
      clientId,
    })

    return result[0]
  } catch (error) {
    logger.error('Failed to restore client', error as Error, {
      action: 'restore_client',
      clientId,
    })
    throw error
  }
}

/**
 * Count total clients with optional filters
 * @param db - Database instance
 * @param filters - Optional filters
 * @returns Total count of clients
 */
export async function countClients(db: any, filters?: ClientFilters): Promise<number> {
  try {
    let query = db
      .select({ count: sql<number>`count(${clients.id})`.as('count') })
      .from(clients)

    // Apply filters
    if (filters) {
      const conditions = []

      // Filter out deleted clients
      conditions.push(isNull(clients.deletedAt))

      // Filter by branch IDs
      if (filters.branchIds && filters.branchIds.length > 0) {
        conditions.push(inArray(clients.branchId, filters.branchIds))
      }

      // Filter by pension type
      if (filters.pensionTypeId) {
        conditions.push(eq(clients.pensionTypeId, filters.pensionTypeId))
      }

      // Filter by pensioner type
      if (filters.pensionerTypeId) {
        conditions.push(eq(clients.pensionerTypeId, filters.pensionerTypeId))
      }

      // Filter by product
      if (filters.productId) {
        conditions.push(eq(clients.productId, filters.productId))
      }

      // Filter by PAR status
      if (filters.parStatusId) {
        conditions.push(eq(clients.parStatusId, filters.parStatusId))
      }

      // Filter by account type
      if (filters.accountTypeId) {
        conditions.push(eq(clients.accountTypeId, filters.accountTypeId))
      }

      // Filter by active status
      if (filters.isActive !== undefined) {
        conditions.push(eq(clients.isActive, filters.isActive))
      }

      // Search by client code, full name, or pension number
      if (filters.search) {
        const searchTerm = `%${filters.search}%`
        conditions.push(
          or(
            like(clients.clientCode, searchTerm),
            like(clients.fullName, searchTerm),
            like(clients.pensionNumber, searchTerm)
          )
        )
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions))
      }
    } else {
      // Always filter out deleted clients
      query = query.where(isNull(clients.deletedAt))
    }

    const result = await query
    return result[0]?.count || 0
  } catch (error) {
    logger.error('Failed to count clients', error as Error, {
      action: 'count_clients',
      filters,
    })
    throw error
  }
}
