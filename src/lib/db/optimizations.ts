/**
 * Database Performance Optimizations
 *
 * This module provides utilities for optimizing database queries and monitoring performance.
 */

import { db } from '@/server/db/index'
import { sql } from 'drizzle-orm'
import { logger } from '@/lib/logger'

/**
 * Connection pool monitoring
 */
export async function getConnectionPoolStats() {
  try {
    // Get connection pool statistics from PostgreSQL
    const result = await db.execute(sql`
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections,
        count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
      FROM pg_stat_activity
      WHERE datname = current_database()
    `)

    const stats = result.rows[0] || {
      total_connections: 0,
      active_connections: 0,
      idle_connections: 0,
      idle_in_transaction: 0,
    }

    logger.info('Connection pool stats retrieved', { stats })

    return stats
  } catch (error) {
    logger.error('Failed to get connection pool stats', error as Error)
    throw error
  }
}

/**
 * Query explain analyzer
 * Runs EXPLAIN ANALYZE on a query and returns the execution plan
 */
export async function explainQuery(queryText: string) {
  try {
    const result = await db.execute(sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql.raw(queryText)}`)

    const plan = result.rows[0] || {}

    logger.info('Query explain completed', { queryText: queryText.substring(0, 100) })

    return plan
  } catch (error) {
    logger.error('Failed to explain query', error as Error, { queryText: queryText.substring(0, 100) })
    throw error
  }
}

/**
 * Cursor-based pagination for large tables
 * Returns a cursor for the next page and data for the current page
 */
export async function cursorPaginate<T>({
  table,
  cursor,
  limit = 25,
  orderBy = 'createdAt',
  orderDirection = 'desc',
}: {
  table: any
  cursor?: string
  limit?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
}) {
  try {
    let query = db.select().from(table).limit(limit)

    // Add cursor-based filtering
    if (cursor) {
      const cursorValue = orderDirection === 'asc' ? sql`> ${sql.raw(cursor)}` : sql`< ${sql.raw(cursor)}`
      query = query.where(sql`${sql.raw(orderBy)} ${cursorValue}`)
    }

    // Add ordering
    query = query.orderBy(
      orderDirection === 'asc' ? sql`${sql.raw(orderBy)} ASC` : sql`${sql.raw(orderBy)} DESC`
    )

    const data = await query

    // Get next cursor
    const nextCursor = data.length === limit ? data[data.length - 1][orderBy]?.toString() : undefined

    logger.info('Cursor pagination completed', {
      count: data.length,
      limit,
      hasMore: !!nextCursor,
    })

    return {
      data,
      nextCursor,
      hasMore: !!nextCursor,
    }
  } catch (error) {
    logger.error('Failed to paginate with cursor', error as Error)
    throw error
  }
}

/**
 * Batch fetch to avoid N+1 queries
 * Fetches related records in batches
 */
export async function batchFetch<T>({
  ids,
  fetchFn,
  batchSize = 100,
}: {
  ids: string[]
  fetchFn: (batchIds: string[]) => Promise<T[]>
  batchSize?: number
}): Promise<T[]> {
  try {
    const results: T[] = []

    // Process IDs in batches
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize)
      const batchResults = await fetchFn(batch)
      results.push(...batchResults)
    }

    logger.info('Batch fetch completed', {
      totalIds: ids.length,
      batchSize,
      totalBatches: Math.ceil(ids.length / batchSize),
      resultsCount: results.length,
    })

    return results
  } catch (error) {
    logger.error('Failed to batch fetch', error as Error, {
      totalIds: ids.length,
      batchSize,
    })
    throw error
  }
}

/**
 * Cache warming function for frequently accessed data
 * Pre-loads data into cache to improve performance
 */
export async function warmCache({
  tables,
  sampleSize = 1000,
}: {
  tables: string[]
  sampleSize?: number
}) {
  try {
    const results: Record<string, number> = {}

    for (const table of tables) {
      // Execute a sample query to warm up the cache
      await db.execute(sql`
        SELECT * FROM ${sql.raw(table)} 
        LIMIT ${sampleSize}
      `)

      results[table] = sampleSize
    }

    logger.info('Cache warming completed', { results })

    return results
  } catch (error) {
    logger.error('Failed to warm cache', error as Error, { tables })
    throw error
  }
}

/**
 * Query timing wrapper
 * Wraps a query function and logs execution time
 * Warns if query takes longer than the threshold
 */
export async function withQueryTiming<T>({
  queryName,
  queryFn,
  warnThresholdMs = 1000,
}: {
  queryName: string
  queryFn: () => Promise<T>
  warnThresholdMs?: number
}): Promise<T> {
  const startTime = Date.now()

  try {
    const result = await queryFn()

    const duration = Date.now() - startTime

    if (duration > warnThresholdMs) {
      logger.warn(`Slow query detected: ${queryName}`, {
        queryName,
        durationMs: duration,
        thresholdMs: warnThresholdMs,
      })
    } else {
      logger.info(`Query completed: ${queryName}`, {
        queryName,
        durationMs: duration,
      })
    }

    return result
  } catch (error) {
    const duration = Date.now() - startTime

    logger.error(`Query failed: ${queryName}`, error as Error, {
      queryName,
      durationMs: duration,
    })

    throw error
  }
}

/**
 * Get slow query log
 * Retrieves queries that have exceeded the performance threshold
 */
export async function getSlowQueries({
  thresholdMs = 1000,
  limit = 50,
}: {
  thresholdMs?: number
  limit?: number
} = {}) {
  try {
    // Get slow queries from pg_stat_statements if available
    const result = await db.execute(sql`
      SELECT 
        query,
        calls,
        total_time,
        mean_time,
        max_time
      FROM pg_stat_statements
      WHERE mean_time > ${thresholdMs}
      ORDER BY mean_time DESC
      LIMIT ${limit}
    `)

    const queries = result.rows || []

    logger.info('Slow queries retrieved', {
      count: queries.length,
      thresholdMs,
    })

    return queries
  } catch (error) {
    // pg_stat_statements might not be available
    logger.warn('Failed to get slow queries (pg_stat_statements might not be available)', error as Error)
    return []
  }
}

/**
 * Get table statistics
 * Returns row counts and sizes for all tables
 */
export async function getTableStats() {
  try {
    const result = await db.execute(sql`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_tuples,
        n_dead_tup as dead_tuples,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze
      FROM pg_stat_user_tables
      ORDER BY schemaname, tablename
    `)

    const stats = result.rows || []

    logger.info('Table statistics retrieved', {
      count: stats.length,
    })

    return stats
  } catch (error) {
    logger.error('Failed to get table statistics', error as Error)
    throw error
  }
}

/**
 * Get index usage statistics
 * Returns information about index usage
 */
export async function getIndexStats() {
  try {
    const result = await db.execute(sql`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan as index_scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched
      FROM pg_stat_user_indexes
      ORDER BY schemaname, tablename, indexname
    `)

    const stats = result.rows || []

    logger.info('Index statistics retrieved', {
      count: stats.length,
    })

    return stats
  } catch (error) {
    logger.error('Failed to get index statistics', error as Error)
    throw error
  }
}
