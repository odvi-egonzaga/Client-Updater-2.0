import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as snowflakeSync from '../snowflake-sync'
import { CircuitBreaker } from '../../resilience/circuit-breaker'

// Mock database
vi.mock('../../server/db/index', () => {
  const mockSelect = vi.fn()
  const mockInsert = vi.fn()
  const mockUpdate = vi.fn()

  return {
    db: {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
    },
  }
})

// Mock snowflake client
vi.mock('../../snowflake/client', () => ({
  snowflakeClient: {
    query: vi.fn(),
  },
}))

// Mock circuit breaker
vi.mock('../../resilience/circuit-breaker', () => ({
  CircuitBreaker: vi.fn().mockImplementation(() => ({
    execute: vi.fn(),
    getState: vi.fn(() => 'closed'),
    getFailures: vi.fn(() => 0),
  })),
}))

// Mock logger
vi.mock('../../logger/index', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock sync queries
vi.mock('../../server/db/queries/sync', () => ({
  createSyncJob: vi.fn(),
  updateSyncJob: vi.fn(),
  startSyncJob: vi.fn(),
  completeSyncJob: vi.fn(),
  failSyncJob: vi.fn(),
}))

// Mock client queries
vi.mock('../../server/db/queries/clients', () => ({
  upsertClient: vi.fn(),
  recordClientSyncChange: vi.fn(),
}))

import { db } from '../../server/db/index'
import { snowflakeClient } from '../../snowflake/client'
import { createSyncJob } from '../../server/db/queries/sync'
import { upsertClient } from '../../server/db/queries/clients'

describe('Snowflake Sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('buildLookupCache', () => {
    it('should build lookup cache with all maps', async () => {
      const mockPensionTypes = [
        { id: 'pt1', code: 'SSS', name: 'SSS' },
      ]
      const mockBranches = [
        { id: 'b1', code: 'B001', name: 'Branch 1' },
      ]

      const mockFrom = vi.fn().mockReturnThis()
      const mockWhere = vi.fn().mockResolvedValue(mockPensionTypes)

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
      })

      const cache = await snowflakeSync.buildLookupCache()

      expect(cache.pensionTypes).toBeInstanceOf(Map)
      expect(cache.branches).toBeInstanceOf(Map)
    })
  })

  describe('transformRecord', () => {
    it('should transform snowflake record to client data', () => {
      const snowflakeRecord = {
        CLIENT_CODE: 'C001',
        FULL_NAME: 'John Doe',
        PENSION_NUMBER: 'P001',
        BIRTH_DATE: '1990-01-01',
        CONTACT_NUMBER: '1234567890',
        CONTACT_NUMBER_ALT: '0987654321',
        PENSION_TYPE_CODE: 'SSS',
        PENSIONER_TYPE_CODE: 'RETIREE',
        PRODUCT_CODE: 'P001',
        BRANCH_CODE: 'B001',
        PAR_STATUS_CODE: 'CURRENT',
        ACCOUNT_TYPE_CODE: 'ATM',
        PAST_DUE_AMOUNT: 1000.50,
        LOAN_STATUS: 'Active',
      }

      const lookupCache = {
        pensionTypes: new Map([['SSS', 'pt1']]),
        pensionerTypes: new Map([['RETIREE', 'pnt1']]),
        products: new Map([['P001', 'p1']]),
        branches: new Map([['B001', 'b1']]),
        parStatuses: new Map([['CURRENT', 'ps1']]),
        accountTypes: new Map([['ATM', 'at1']]),
      }

      const result = snowflakeSync.transformRecord(snowflakeRecord, lookupCache)

      expect(result.clientCode).toBe('C001')
      expect(result.fullName).toBe('John Doe')
      expect(result.pensionNumber).toBe('P001')
      expect(result.pensionTypeId).toBe('pt1')
      expect(result.branchId).toBe('b1')
      expect(result.syncSource).toBe('snowflake')
    })

    it('should handle date conversion', () => {
      const snowflakeRecord = {
        CLIENT_CODE: 'C001',
        FULL_NAME: 'John Doe',
        PENSION_NUMBER: 'P001',
        BIRTH_DATE: new Date('1990-01-01'),
        CONTACT_NUMBER: '1234567890',
        CONTACT_NUMBER_ALT: '0987654321',
        PENSION_TYPE_CODE: 'SSS',
        PENSIONER_TYPE_CODE: 'RETIREE',
        PRODUCT_CODE: 'P001',
        BRANCH_CODE: 'B001',
        PAR_STATUS_CODE: 'CURRENT',
        ACCOUNT_TYPE_CODE: 'ATM',
        PAST_DUE_AMOUNT: 1000.50,
        LOAN_STATUS: 'Active',
      }

      const lookupCache = {
        pensionTypes: new Map([['SSS', 'pt1']]),
        pensionerTypes: new Map([['RETIREE', 'pnt1']]),
        products: new Map([['P001', 'p1']]),
        branches: new Map([['B001', 'b1']]),
        parStatuses: new Map([['CURRENT', 'ps1']]),
        accountTypes: new Map([['ATM', 'at1']]),
      }

      const result = snowflakeSync.transformRecord(snowflakeRecord, lookupCache)

      expect(result.birthDate).toBeInstanceOf(Date)
    })
  })

  describe('SnowflakeSyncService', () => {
    it('should create sync service instance', () => {
      const service = new snowflakeSync.SnowflakeSyncService()

      expect(service).toBeDefined()
      expect(service.sync).toBeInstanceOf(Function)
      expect(service.fetchPreview).toBeInstanceOf(Function)
    })

    it('should get circuit breaker state', () => {
      const service = new snowflakeSync.SnowflakeSyncService()

      const state = service.getCircuitBreakerState()

      expect(['closed', 'open', 'half-open']).toContain(state)
    })

    it('should get circuit breaker failures', () => {
      const service = new snowflakeSync.SnowflakeSyncService()

      const failures = service.getCircuitBreakerFailures()

      expect(typeof failures).toBe('number')
    })
  })
})
