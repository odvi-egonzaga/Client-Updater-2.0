import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as periodInitService from '../period-init'
import { clients, clientPeriodStatus, statusTypes, products, companies } from '@/server/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

// Mock database
vi.mock('@/server/db/index', () => {
  const mockSelect = vi.fn()
  const mockInsert = vi.fn()

  return {
    db: {
      select: mockSelect,
      insert: mockInsert,
    },
  }
})

// Mock logger
vi.mock('@/lib/logger/index', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import { db } from '@/server/db/index'

describe('Period Initialization Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getClientsForInitialization', () => {
    it('should return clients for initialization', async () => {
      const mockClients = [
        {
          id: 'client1',
          clientCode: 'C001',
          fullName: 'John Doe',
          productId: 'product1',
          branchId: 'branch1',
        },
        {
          id: 'client2',
          clientCode: 'C002',
          fullName: 'Jane Smith',
          productId: 'product1',
          branchId: 'branch1',
        },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockInnerJoin = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue(mockClients)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        innerJoin: mockInnerJoin,
        where: mockWhere,
        limit: mockLimit,
      })

      const result = await periodInitService.getClientsForInitialization(
        'company1',
        true
      )

      expect(result).toEqual(mockClients)
      expect(result).toHaveLength(2)
    })

    it('should exclude terminal statuses when requested', async () => {
      const mockClients = [
        {
          id: 'client1',
          clientCode: 'C001',
          fullName: 'John Doe',
          productId: 'product1',
          branchId: 'branch1',
        },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockInnerJoin = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue(mockClients)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        innerJoin: mockInnerJoin,
        where: mockWhere,
        limit: mockLimit,
      })

      const result = await periodInitService.getClientsForInitialization(
        'company1',
        true
      )

      expect(result).toEqual(mockClients)
      expect(mockWhere).toHaveBeenCalled()
    })

    it('should include all clients when excludeTerminal is false', async () => {
      const mockClients = [
        {
          id: 'client1',
          clientCode: 'C001',
          fullName: 'John Doe',
          productId: 'product1',
          branchId: 'branch1',
        },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockInnerJoin = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue(mockClients)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        innerJoin: mockInnerJoin,
        where: mockWhere,
        limit: mockLimit,
      })

      const result = await periodInitService.getClientsForInitialization(
        'company1',
        false
      )

      expect(result).toEqual(mockClients)
    })
  })

  describe('initializePeriod', () => {
    it('should initialize period for clients', async () => {
      const mockPendingStatus = [{ id: 'status1' }]
      const mockClients = [
        {
          id: 'client1',
          clientCode: 'C001',
          fullName: 'John Doe',
          productId: 'product1',
          branchId: 'branch1',
        },
      ]
      const mockExistingStatuses = []

      const mockValues = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue([{ id: 'cps1' }])

      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
        returning: mockReturning,
      })

      vi.mocked(db.select)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue(mockPendingStatus),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue(mockClients),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
        })

      const result = await periodInitService.initializePeriod(
        'company1',
        'monthly',
        2024,
        1
      )

      expect(result.success).toBe(true)
      expect(result.initialized).toBe(1)
      expect(result.failed).toBe(0)
      expect(result.skipped).toBe(0)
    })

    it('should skip clients that already have status for the period', async () => {
      const mockPendingStatus = [{ id: 'status1' }]
      const mockClients = [
        {
          id: 'client1',
          clientCode: 'C001',
          fullName: 'John Doe',
          productId: 'product1',
          branchId: 'branch1',
        },
        {
          id: 'client2',
          clientCode: 'C002',
          fullName: 'Jane Smith',
          productId: 'product1',
          branchId: 'branch1',
        },
      ]
      const mockExistingStatuses = [{ clientId: 'client1' }]

      const mockValues = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue([{ id: 'cps1' }])

      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
        returning: mockReturning,
      })

      vi.mocked(db.select)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue(mockPendingStatus),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue(mockClients),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
        })

      const result = await periodInitService.initializePeriod(
        'company1',
        'monthly',
        2024,
        1
      )

      expect(result.success).toBe(true)
      expect(result.initialized).toBe(1)
      expect(result.skipped).toBe(1)
    })

    it('should handle errors during initialization', async () => {
      const mockPendingStatus = [{ id: 'status1' }]
      const mockClients = [
        {
          id: 'client1',
          clientCode: 'C001',
          fullName: 'John Doe',
          productId: 'product1',
          branchId: 'branch1',
        },
      ]
      const mockExistingStatuses = []

      const mockValues = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockRejectedValue(new Error('Database error'))

      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
        returning: mockReturning,
      })

      vi.mocked(db.select)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue(mockPendingStatus),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue(mockClients),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
        })

      const result = await periodInitService.initializePeriod(
        'company1',
        'monthly',
        2024,
        1
      )

      expect(result.success).toBe(false)
      expect(result.failed).toBe(1)
      expect(result.errors).toHaveLength(1)
    })

    it('should throw error if PENDING status not found', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      const result = await periodInitService.initializePeriod(
        'company1',
        'monthly',
        2024,
        1
      )

      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].clientId).toBe('system')
    })
  })

  describe('batchCreatePeriodStatuses', () => {
    it('should batch create period statuses', async () => {
      const records = [
        {
          clientId: 'client1',
          periodType: 'monthly' as const,
          periodYear: 2024,
          periodMonth: 1,
          statusTypeId: 'status1',
          hasPayment: false,
          updateCount: 0,
          isTerminal: false,
        },
        {
          clientId: 'client2',
          periodType: 'monthly' as const,
          periodYear: 2024,
          periodMonth: 1,
          statusTypeId: 'status1',
          hasPayment: false,
          updateCount: 0,
          isTerminal: false,
        },
      ]

      const mockValues = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue([{ id: 'cps1' }])

      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
        returning: mockReturning,
      })

      const result = await periodInitService.batchCreatePeriodStatuses(records)

      expect(result.success).toBe(true)
      expect(result.processed).toBe(2)
      expect(result.failed).toBe(0)
    })

    it('should handle partial failures in batch', async () => {
      const records = [
        {
          clientId: 'client1',
          periodType: 'monthly' as const,
          periodYear: 2024,
          periodMonth: 1,
          statusTypeId: 'status1',
          hasPayment: false,
          updateCount: 0,
          isTerminal: false,
        },
        {
          clientId: 'client2',
          periodType: 'monthly' as const,
          periodYear: 2024,
          periodMonth: 1,
          statusTypeId: 'status1',
          hasPayment: false,
          updateCount: 0,
          isTerminal: false,
        },
      ]

      let callCount = 0
      const mockValues = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve([{ id: 'cps1' }])
        } else {
          return Promise.reject(new Error('Database error'))
        }
      })

      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
        returning: mockReturning,
      })

      const result = await periodInitService.batchCreatePeriodStatuses(records)

      expect(result.success).toBe(false)
      expect(result.processed).toBe(1)
      expect(result.failed).toBe(1)
      expect(result.errors).toHaveLength(1)
    })

    it('should process records in batches of 100', async () => {
      const records = Array.from({ length: 250 }, (_, i) => ({
        clientId: `client${i}`,
        periodType: 'monthly' as const,
        periodYear: 2024,
        periodMonth: 1,
        statusTypeId: 'status1',
        hasPayment: false,
        updateCount: 0,
        isTerminal: false,
      }))

      const mockValues = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue([{ id: 'cps1' }])

      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
        returning: mockReturning,
      })

      const result = await periodInitService.batchCreatePeriodStatuses(records)

      expect(result.success).toBe(true)
      expect(result.processed).toBe(250)
      expect(mockValues).toHaveBeenCalledTimes(250)
    })
  })

  describe('isPeriodInitialized', () => {
    it('should return true if period is initialized', async () => {
      const mockStatuses = [{ id: 'cps1' }]

      const mockFrom = vi.fn().mockReturnThis()
      const mockInnerJoin = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue(mockStatuses)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        innerJoin: mockInnerJoin,
        where: mockWhere,
        limit: mockLimit,
      })

      const result = await periodInitService.isPeriodInitialized(
        'company1',
        'monthly',
        2024,
        1
      )

      expect(result).toBe(true)
    })

    it('should return false if period is not initialized', async () => {
      const mockStatuses = []

      const mockFrom = vi.fn().mockReturnThis()
      const mockInnerJoin = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue(mockStatuses)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        innerJoin: mockInnerJoin,
        where: mockWhere,
        limit: mockLimit,
      })

      const result = await periodInitService.isPeriodInitialized(
        'company1',
        'monthly',
        2024,
        1
      )

      expect(result).toBe(false)
    })

    it('should check quarterly period', async () => {
      const mockStatuses = [{ id: 'cps1' }]

      const mockFrom = vi.fn().mockReturnThis()
      const mockInnerJoin = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue(mockStatuses)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        innerJoin: mockInnerJoin,
        where: mockWhere,
        limit: mockLimit,
      })

      const result = await periodInitService.isPeriodInitialized(
        'company1',
        'quarterly',
        2024,
        undefined,
        1
      )

      expect(result).toBe(true)
    })
  })
})
