import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getConnectionPoolStats,
  explainQuery,
  cursorPaginate,
  batchFetch,
  warmCache,
  withQueryTiming,
  getSlowQueries,
  getTableStats,
  getIndexStats,
} from '../optimizations'

// Mock database
vi.mock('@/server/db/index', () => ({
  db: {
    execute: vi.fn(),
    select: vi.fn(),
  },
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { db } from '@/server/db/index'
import { logger } from '@/lib/logger'

describe('Database Optimizations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getConnectionPoolStats', () => {
    it('returns connection pool statistics', async () => {
      const mockStats = {
        total_connections: 10,
        active_connections: 5,
        idle_connections: 4,
        idle_in_transaction: 1,
      }

      ;(db.execute as any).mockResolvedValueOnce({
        rows: [mockStats],
      })

      const stats = await getConnectionPoolStats()

      expect(stats).toEqual(mockStats)
      expect(logger.info).toHaveBeenCalledWith(
        'Connection pool stats retrieved',
        { stats: mockStats }
      )
    })

    it('handles database errors', async () => {
      const error = new Error('Database connection failed')
      ;(db.execute as any).mockRejectedValueOnce(error)

      await expect(getConnectionPoolStats()).rejects.toThrow(error)
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to get connection pool stats',
        error,
        {}
      )
    })
  })

  describe('explainQuery', () => {
    it('returns query execution plan', async () => {
      const mockPlan = {
        'Plan': {
          'Node Type': 'Seq Scan',
          'Relation Name': 'clients',
          'Total Cost': 100.5,
        },
      }

      ;(db.execute as any).mockResolvedValueOnce({
        rows: [mockPlan],
      })

      const queryText = 'SELECT * FROM clients'
      const plan = await explainQuery(queryText)

      expect(plan).toEqual(mockPlan)
      expect(logger.info).toHaveBeenCalledWith(
        'Query explain completed',
        { queryText: queryText.substring(0, 100) }
      )
    })

    it('handles query errors', async () => {
      const error = new Error('Query failed')
      ;(db.execute as any).mockRejectedValueOnce(error)

      const queryText = 'SELECT * FROM clients'
      await expect(explainQuery(queryText)).rejects.toThrow(error)
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to explain query',
        error,
        { queryText: queryText.substring(0, 100) }
      )
    })
  })

  describe('cursorPaginate', () => {
    it('returns paginated data with cursor', async () => {
      const mockData = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ]

      const mockQuery = {
        limit: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
      }

      ;(db.select as any).mockReturnValueOnce(mockQuery)

      const result = await cursorPaginate({
        table: 'test_table',
        limit: 10,
        orderBy: 'id',
        orderDirection: 'asc',
      })

      expect(result.data).toEqual(mockData)
      expect(result.nextCursor).toBe('2')
      expect(result.hasMore).toBe(true)
      expect(logger.info).toHaveBeenCalledWith(
        'Cursor pagination completed',
        { count: 2, limit: 10, hasMore: true }
      )
    })

    it('returns no cursor when no more data', async () => {
      const mockData = [{ id: '1', name: 'Item 1' }]

      const mockQuery = {
        limit: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
      }

      ;(db.select as any).mockReturnValueOnce(mockQuery)

      const result = await cursorPaginate({
        table: 'test_table',
        limit: 10,
        orderBy: 'id',
        orderDirection: 'asc',
      })

      expect(result.data).toEqual(mockData)
      expect(result.nextCursor).toBeUndefined()
      expect(result.hasMore).toBe(false)
    })

    it('handles database errors', async () => {
      const error = new Error('Query failed')
      ;(db.select as any).mockImplementationOnce(() => {
        throw error
      })

      await expect(
        cursorPaginate({
          table: 'test_table',
          limit: 10,
        })
      ).rejects.toThrow(error)
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to paginate with cursor',
        error,
        {}
      )
    })
  })

  describe('batchFetch', () => {
    it('fetches data in batches', async () => {
      const ids = ['1', '2', '3', '4', '5']
      const fetchFn = vi.fn().mockImplementation((batchIds) => {
        return Promise.resolve(
          batchIds.map((id) => ({ id, name: `Item ${id}` })
        )
      })

      const result = await batchFetch({
        ids,
        fetchFn,
        batchSize: 2,
      })

      expect(result).toHaveLength(5)
      expect(fetchFn).toHaveBeenCalledTimes(3) // 2, 2, 1
      expect(fetchFn).toHaveBeenNthCalledWith(1, ['1', '2'])
      expect(fetchFn).toHaveBeenNthCalledWith(2, ['3', '4'])
      expect(fetchFn).toHaveBeenNthCalledWith(3, ['5'])
      expect(logger.info).toHaveBeenCalledWith(
        'Batch fetch completed',
        {
          totalIds: 5,
          batchSize: 2,
          totalBatches: 3,
          resultsCount: 5,
        }
      )
    })

    it('handles fetch errors', async () => {
      const ids = ['1', '2', '3']
      const error = new Error('Fetch failed')
      const fetchFn = vi.fn().mockRejectedValue(error)

      await expect(
        batchFetch({
          ids,
          fetchFn,
          batchSize: 2,
        })
      ).rejects.toThrow(error)
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to batch fetch',
        error,
        { totalIds: 3, batchSize: 2 }
      )
    })
  })

  describe('warmCache', () => {
    it('warms cache for specified tables', async () => {
      const tables = ['clients', 'status', 'branches']

      ;(db.execute as any).mockResolvedValue({})

      const result = await warmCache({ tables, sampleSize: 100 })

      expect(result).toEqual({
        clients: 100,
        status: 100,
        branches: 100,
      })
      expect(db.execute).toHaveBeenCalledTimes(3)
      expect(logger.info).toHaveBeenCalledWith(
        'Cache warming completed',
        { result }
      )
    })

    it('handles database errors', async () => {
      const error = new Error('Database connection failed')
      ;(db.execute as any).mockRejectedValue(error)

      await expect(
        warmCache({ tables: ['clients'] })
      ).rejects.toThrow(error)
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to warm cache',
        error,
        { tables: ['clients'] }
      )
    })
  })

  describe('withQueryTiming', () => {
    it('executes query and logs timing', async () => {
      const queryFn = vi.fn().mockResolvedValue({ data: 'test' })

      const result = await withQueryTiming({
        queryName: 'test-query',
        queryFn,
        warnThresholdMs: 1000,
      })

      expect(result).toEqual({ data: 'test' })
      expect(queryFn).toHaveBeenCalled()
      expect(logger.info).toHaveBeenCalledWith(
        'Query completed: test-query',
        expect.objectContaining({
          queryName: 'test-query',
          durationMs: expect.any(Number),
        })
      )
    })

    it('warns on slow queries', async () => {
      const queryFn = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: 'test' }), 1500)
      )

      const result = await withQueryTiming({
        queryName: 'slow-query',
        queryFn,
        warnThresholdMs: 1000,
      })

      expect(result).toEqual({ data: 'test' })
      expect(logger.warn).toHaveBeenCalledWith(
        'Slow query detected: slow-query',
        expect.objectContaining({
          queryName: 'slow-query',
          durationMs: expect.any(Number),
          thresholdMs: 1000,
        })
      )
    })

    it('handles query errors', async () => {
      const error = new Error('Query failed')
      const queryFn = vi.fn().mockRejectedValue(error)

      await expect(
        withQueryTiming({
          queryName: 'failed-query',
          queryFn,
        })
      ).rejects.toThrow(error)
      expect(logger.error).toHaveBeenCalledWith(
        'Query failed: failed-query',
        error,
        expect.objectContaining({
          queryName: 'failed-query',
          durationMs: expect.any(Number),
        })
      )
    })
  })

  describe('getSlowQueries', () => {
    it('returns slow queries from pg_stat_statements', async () => {
      const mockQueries = [
        {
          query: 'SELECT * FROM clients',
          calls: 1000,
          total_time: 50000,
          mean_time: 50,
          max_time: 100,
        },
      ]

      ;(db.execute as any).mockResolvedValueOnce({
        rows: mockQueries,
      })

      const result = await getSlowQueries({ thresholdMs: 1000, limit: 50 })

      expect(result).toEqual(mockQueries)
      expect(logger.info).toHaveBeenCalledWith(
        'Slow queries retrieved',
        { count: 1, thresholdMs: 1000 }
      )
    })

    it('handles missing pg_stat_statements extension', async () => {
      const error = new Error('relation "pg_stat_statements" does not exist')
      ;(db.execute as any).mockRejectedValueOnce(error)

      const result = await getSlowQueries()

      expect(result).toEqual([])
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to get slow queries (pg_stat_statements might not be available)',
        error
      )
    })
  })

  describe('getTableStats', () => {
    it('returns table statistics', async () => {
      const mockStats = [
        {
          schemaname: 'public',
          tablename: 'clients',
          inserts: 100,
          updates: 50,
          deletes: 10,
          live_tuples: 140,
          dead_tuples: 20,
          last_vacuum: new Date(),
          last_autovacuum: new Date(),
          last_analyze: new Date(),
          last_autoanalyze: new Date(),
        },
      ]

      ;(db.execute as any).mockResolvedValueOnce({
        rows: mockStats,
      })

      const result = await getTableStats()

      expect(result).toEqual(mockStats)
      expect(logger.info).toHaveBeenCalledWith(
        'Table statistics retrieved',
        { count: 1 }
      )
    })

    it('handles database errors', async () => {
      const error = new Error('Query failed')
      ;(db.execute as any).mockRejectedValueOnce(error)

      await expect(getTableStats()).rejects.toThrow(error)
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to get table statistics',
        error,
        {}
      )
    })
  })

  describe('getIndexStats', () => {
    it('returns index usage statistics', async () => {
      const mockStats = [
        {
          schemaname: 'public',
          tablename: 'clients',
          indexname: 'clients_pkey',
          index_scans: 1000,
          tuples_read: 10000,
          tuples_fetched: 5000,
        },
      ]

      ;(db.execute as any).mockResolvedValueOnce({
        rows: mockStats,
      })

      const result = await getIndexStats()

      expect(result).toEqual(mockStats)
      expect(logger.info).toHaveBeenCalledWith(
        'Index statistics retrieved',
        { count: 1 }
      )
    })

    it('handles database errors', async () => {
      const error = new Error('Query failed')
      ;(db.execute as any).mockRejectedValueOnce(error)

      await expect(getIndexStats()).rejects.toThrow(error)
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to get index statistics',
        error,
        {}
      )
    })
  })
})
