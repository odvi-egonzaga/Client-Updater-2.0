import { describe, it, expect } from 'vitest'
import type {
  SyncOptions,
  SyncResult,
  SyncJobOptions,
  LookupCache,
  SnowflakeClientRecord,
  ClientFilters,
  ClientWithDetails,
  SyncChangeRecord,
  StatusCount,
  UserBranchFilter,
  BranchScope,
} from '../types'

describe('Sync Types', () => {
  describe('SyncOptions', () => {
    it('should accept empty options', () => {
      const options: SyncOptions = {}
      expect(options).toBeDefined()
    })

    it('should accept branch codes', () => {
      const options: SyncOptions = {
        branchCodes: ['BR001', 'BR002'],
      }
      expect(options.branchCodes).toEqual(['BR001', 'BR002'])
    })

    it('should accept batch size', () => {
      const options: SyncOptions = {
        batchSize: 100,
      }
      expect(options.batchSize).toBe(100)
    })

    it('should accept record changes flag', () => {
      const options: SyncOptions = {
        recordChanges: false,
      }
      expect(options.recordChanges).toBe(false)
    })

    it('should accept sync job ID', () => {
      const options: SyncOptions = {
        syncJobId: 'job123',
      }
      expect(options.syncJobId).toBe('job123')
    })
  })

  describe('SyncResult', () => {
    it('should accept complete sync result', () => {
      const result: SyncResult = {
        totalProcessed: 100,
        created: 50,
        updated: 50,
        skipped: 0,
        failed: 0,
        syncJobId: 'job123',
        processingTimeMs: 5000,
      }
      expect(result.totalProcessed).toBe(100)
      expect(result.created).toBe(50)
      expect(result.updated).toBe(50)
    })

    it('should accept sync result with errors', () => {
      const result: SyncResult = {
        totalProcessed: 100,
        created: 50,
        updated: 40,
        skipped: 5,
        failed: 5,
        syncJobId: 'job123',
        error: 'Connection error',
        processingTimeMs: 5000,
      }
      expect(result.failed).toBe(5)
      expect(result.error).toBe('Connection error')
    })
  })

  describe('SyncJobOptions', () => {
    it('should accept sync job options', () => {
      const options: SyncJobOptions = {
        type: 'snowflake',
        parameters: { branchCodes: ['BR001'] },
        createdBy: 'user123',
      }
      expect(options.type).toBe('snowflake')
      expect(options.createdBy).toBe('user123')
    })
  })

  describe('LookupCache', () => {
    it('should accept lookup cache with all maps', () => {
      const cache: LookupCache = {
        pensionTypes: new Map([['SSS', 'id1']]),
        pensionerTypes: new Map([['RETIREE', 'id2']]),
        products: new Map([['P001', 'id3']]),
        branches: new Map([['B001', 'id4']]),
        parStatuses: new Map([['CURRENT', 'id5']]),
        accountTypes: new Map([['ATM', 'id6']]),
      }
      expect(cache.pensionTypes.size).toBe(1)
      expect(cache.branches.size).toBe(1)
    })
  })

  describe('SnowflakeClientRecord', () => {
    it('should accept snowflake client record', () => {
      const record: SnowflakeClientRecord = {
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
      expect(record.CLIENT_CODE).toBe('C001')
      expect(record.FULL_NAME).toBe('John Doe')
    })
  })

  describe('ClientFilters', () => {
    it('should accept empty filters', () => {
      const filters: ClientFilters = {}
      expect(filters).toBeDefined()
    })

    it('should accept branch IDs filter', () => {
      const filters: ClientFilters = {
        branchIds: ['branch1', 'branch2'],
      }
      expect(filters.branchIds).toEqual(['branch1', 'branch2'])
    })

    it('should accept search filter', () => {
      const filters: ClientFilters = {
        search: 'John',
      }
      expect(filters.search).toBe('John')
    })

    it('should accept active status filter', () => {
      const filters: ClientFilters = {
        isActive: true,
      }
      expect(filters.isActive).toBe(true)
    })
  })

  describe('UserBranchFilter', () => {
    it('should accept all scope', () => {
      const filter: UserBranchFilter = {
        scope: 'all',
        branchIds: [],
      }
      expect(filter.scope).toBe('all')
    })

    it('should accept territory scope', () => {
      const filter: UserBranchFilter = {
        scope: 'territory',
        branchIds: ['branch1', 'branch2'],
      }
      expect(filter.scope).toBe('territory')
    })

    it('should accept none scope', () => {
      const filter: UserBranchFilter = {
        scope: 'none',
        branchIds: [],
      }
      expect(filter.scope).toBe('none')
    })
  })

  describe('BranchScope', () => {
    it('should accept all scope', () => {
      const scope: BranchScope = 'all'
      expect(scope).toBe('all')
    })

    it('should accept territory scope', () => {
      const scope: BranchScope = 'territory'
      expect(scope).toBe('territory')
    })

    it('should accept none scope', () => {
      const scope: BranchScope = 'none'
      expect(scope).toBe('none')
    })
  })
})
