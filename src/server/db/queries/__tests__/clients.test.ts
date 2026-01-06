import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as clientQueries from '../clients'
import { clients, clientSyncHistory, clientPeriodStatus } from '../../schema/clients'
import { statusTypes } from '../../schema/lookups'
import { eq, and, isNull, desc, sql, or, like, inArray } from 'drizzle-orm'

// Mock database
vi.mock('../../index', () => {
  const mockSelect = vi.fn()
  const mockInsert = vi.fn()
  const mockUpdate = vi.fn()
  const mockDelete = vi.fn()

  return {
    db: {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
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

import { db } from '../../index'

describe('Client Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getClients', () => {
    it('should return paginated clients with default parameters', async () => {
      const mockClients = [
        { id: '1', clientCode: 'C001', fullName: 'John Doe' },
        { id: '2', clientCode: 'C002', fullName: 'Jane Smith' },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockReturnThis()
      const mockOffset = vi.fn().mockResolvedValue(mockClients)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
      })

      mockFrom.mockReturnValue({
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
      })

      const result = await clientQueries.getClients(db, 1, 25)

      expect(result).toEqual(mockClients)
      expect(mockLimit).toHaveBeenCalledWith(25)
      expect(mockOffset).toHaveBeenCalledWith(0)
    })

    it('should apply branch filter when provided', async () => {
      const mockClients = [{ id: '1', clientCode: 'C001', fullName: 'John Doe' }]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockReturnThis()
      const mockOffset = vi.fn().mockResolvedValue(mockClients)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
      })

      mockFrom.mockReturnValue({
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
      })

      await clientQueries.getClients(db, 1, 25, { branchIds: ['branch1', 'branch2'] })

      expect(mockWhere).toHaveBeenCalled()
    })

    it('should limit pageSize to maximum of 100', async () => {
      const mockClients = []

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockReturnThis()
      const mockOffset = vi.fn().mockResolvedValue(mockClients)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
      })

      mockFrom.mockReturnValue({
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
      })

      await clientQueries.getClients(db, 1, 200)

      expect(mockLimit).toHaveBeenCalledWith(100)
    })
  })

  describe('getClientById', () => {
    it('should return client by ID', async () => {
      const mockClient = { id: '1', clientCode: 'C001', fullName: 'John Doe' }

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([mockClient])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const result = await clientQueries.getClientById(db, '1')

      expect(result).toEqual(mockClient)
    })

    it('should return null if client not found', async () => {
      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const result = await clientQueries.getClientById(db, 'nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('getClientByCode', () => {
    it('should return client by client code', async () => {
      const mockClient = { id: '1', clientCode: 'C001', fullName: 'John Doe' }

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([mockClient])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const result = await clientQueries.getClientByCode(db, 'C001')

      expect(result).toEqual(mockClient)
    })

    it('should return null if client code not found', async () => {
      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const result = await clientQueries.getClientByCode(db, 'nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('getClientWithDetails', () => {
    it('should return client with joined lookup data', async () => {
      const mockClient = {
        client: { id: '1', clientCode: 'C001', fullName: 'John Doe' },
        pensionType: { id: 'pt1', code: 'SSS', name: 'SSS' },
        pensionerType: { id: 'pnt1', code: 'RETIREE', name: 'Retiree' },
        product: { id: 'p1', code: 'P001', name: 'Product 1' },
        branch: { id: 'b1', code: 'B001', name: 'Branch 1' },
        parStatus: { id: 'ps1', code: 'CURRENT', name: 'Current' },
        accountType: { id: 'at1', code: 'ATM', name: 'ATM' },
      }

      const mockFrom = vi.fn().mockReturnThis()
      const mockLeftJoin = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([mockClient])

      const mockQuery = {
        from: mockFrom,
        leftJoin: mockLeftJoin,
      }

      mockLeftJoin.mockReturnValue({
        leftJoin: mockLeftJoin,
        where: mockWhere,
        limit: mockLimit,
      })

      vi.mocked(db.select).mockReturnValue(mockQuery)

      const mockFrom2 = vi.fn().mockReturnThis()
      const mockWhere2 = vi.fn().mockReturnThis()
      const mockOrderBy2 = vi.fn().mockReturnThis()
      const mockLimit2 = vi.fn().mockResolvedValue([])

      vi.mocked(db.select).mockReturnValueOnce({
        from: mockFrom2,
        where: mockWhere2,
        orderBy: mockOrderBy2,
        limit: mockLimit2,
      })

      const result = await clientQueries.getClientWithDetails(db, '1')

      expect(result).toBeDefined()
      expect(result).toHaveProperty('client')
    })
  })

  describe('searchClients', () => {
    it('should return clients matching search query', async () => {
      const mockClients = [
        { id: '1', clientCode: 'C001', fullName: 'John Doe', pensionNumber: 'P001' },
        { id: '2', clientCode: 'C002', fullName: 'John Smith', pensionNumber: 'P002' },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue(mockClients)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
      })

      const result = await clientQueries.searchClients(db, 'John', 10)

      expect(result).toEqual(mockClients)
      expect(mockLimit).toHaveBeenCalledWith(10)
    })

    it('should use default limit of 10', async () => {
      const mockClients = []

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue(mockClients)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
      })

      await clientQueries.searchClients(db, 'John')

      expect(mockLimit).toHaveBeenCalledWith(10)
    })
  })

  describe('upsertClient', () => {
    it('should insert new client if not exists', async () => {
      const clientData = {
        clientCode: 'C001',
        fullName: 'John Doe',
        pensionNumber: 'P001',
      }

      const mockClient = { id: '1', ...clientData }

      const mockValues = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue([mockClient])

      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
        returning: mockReturning,
      })

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const result = await clientQueries.upsertClient(db, clientData)

      expect(result).toEqual(mockClient)
    })

    it('should update existing client if exists', async () => {
      const clientData = {
        clientCode: 'C001',
        fullName: 'John Doe Updated',
        pensionNumber: 'P001',
      }

      const existingClient = { id: '1', clientCode: 'C001', fullName: 'John Doe' }
      const updatedClient = { id: '1', ...clientData }

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue([existingClient])

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      })

      const mockSet = vi.fn().mockReturnThis()
      const mockWhere2 = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue([updatedClient])

      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
        where: mockWhere2,
        returning: mockReturning,
      })

      const result = await clientQueries.upsertClient(db, clientData)

      expect(result).toEqual(updatedClient)
    })
  })

  describe('recordClientSyncChange', () => {
    it('should record sync change for audit trail', async () => {
      const mockChange = {
        id: '1',
        clientId: 'client1',
        fieldChanged: 'fullName',
        oldValue: 'John Doe',
        newValue: 'John Smith',
      }

      const mockValues = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue([mockChange])

      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
        returning: mockReturning,
      })

      const result = await clientQueries.recordClientSyncChange(
        db,
        'client1',
        'fullName',
        'John Doe',
        'John Smith',
        'job1'
      )

      expect(result).toEqual(mockChange)
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 'client1',
          fieldChanged: 'fullName',
          oldValue: 'John Doe',
          newValue: 'John Smith',
          syncJobId: 'job1',
        })
      )
    })
  })

  describe('getClientSyncHistory', () => {
    it('should return sync history for a client', async () => {
      const mockHistory = [
        {
          id: '1',
          clientId: 'client1',
          fieldChanged: 'fullName',
          oldValue: 'John Doe',
          newValue: 'John Smith',
        },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockOrderBy = vi.fn().mockResolvedValue(mockHistory)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
      })

      const result = await clientQueries.getClientSyncHistory(db, 'client1')

      expect(result).toEqual(mockHistory)
    })
  })

  describe('countClientsByStatus', () => {
    it('should count clients by status', async () => {
      const mockCounts = [
        { statusTypeId: 'st1', statusTypeName: 'Pending', count: 10 },
        { statusTypeId: 'st2', statusTypeName: 'Completed', count: 20 },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockInnerJoin = vi.fn().mockReturnThis()
      const mockInnerJoin2 = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockResolvedValue(mockCounts)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        innerJoin: mockInnerJoin,
        where: mockWhere,
      })

      mockInnerJoin.mockReturnValue({
        innerJoin: mockInnerJoin2,
        where: mockWhere,
      })

      const result = await clientQueries.countClientsByStatus(db)

      expect(result).toEqual(mockCounts)
    })

    it('should filter by branch IDs if provided', async () => {
      const mockCounts = [
        { statusTypeId: 'st1', statusTypeName: 'Pending', count: 5 },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockInnerJoin = vi.fn().mockReturnThis()
      const mockInnerJoin2 = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockResolvedValue(mockCounts)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        innerJoin: mockInnerJoin,
        where: mockWhere,
      })

      mockInnerJoin.mockReturnValue({
        innerJoin: mockInnerJoin2,
        where: mockWhere,
      })

      const result = await clientQueries.countClientsByStatus(db, ['branch1', 'branch2'])

      expect(result).toEqual(mockCounts)
    })
  })

  describe('deleteClient', () => {
    it('should soft delete client by setting deletedAt', async () => {
      const mockClient = { id: '1', deletedAt: new Date() }

      const mockSet = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue([mockClient])

      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
        where: mockWhere,
        returning: mockReturning,
      })

      const result = await clientQueries.deleteClient(db, '1')

      expect(result).toEqual(mockClient)
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          deletedAt: expect.any(Date),
        })
      )
    })

    it('should return null if client not found', async () => {
      const mockSet = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue([])

      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
        where: mockWhere,
        returning: mockReturning,
      })

      const result = await clientQueries.deleteClient(db, 'nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('restoreClient', () => {
    it('should restore client by clearing deletedAt', async () => {
      const mockClient = { id: '1', deletedAt: null }

      const mockSet = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockReturnThis()
      const mockReturning = vi.fn().mockResolvedValue([mockClient])

      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
        where: mockWhere,
        returning: mockReturning,
      })

      const result = await clientQueries.restoreClient(db, '1')

      expect(result).toEqual(mockClient)
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          deletedAt: null,
        })
      )
    })
  })

  describe('countClients', () => {
    it('should count total clients', async () => {
      const mockCount = [{ count: 100 }]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockResolvedValue(mockCount)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
      })

      const result = await clientQueries.countClients(db)

      expect(result).toBe(100)
    })

    it('should count clients with filters', async () => {
      const mockCount = [{ count: 50 }]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockResolvedValue(mockCount)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
      })

      const result = await clientQueries.countClients(db, { isActive: true })

      expect(result).toBe(50)
    })
  })
})
