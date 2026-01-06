import { describe, it, expect } from 'vitest'
import type {
  PeriodType,
  StatusType,
  StatusReason,
  ClientPeriodStatus,
  StatusEvent,
  DashboardSummary,
  StatusUpdateInput,
  BulkUpdateInput,
  BulkUpdateResult,
  PeriodFilter,
  StatusFilter,
  StatusStoreState,
} from '../types'

describe('Status types', () => {
  describe('PeriodType', () => {
    it('should accept valid period types', () => {
      const monthly: PeriodType = 'monthly'
      const quarterly: PeriodType = 'quarterly'

      expect(monthly).toBe('monthly')
      expect(quarterly).toBe('quarterly')
    })
  })

  describe('StatusType interface', () => {
    it('should create a valid StatusType object', () => {
      const statusType: StatusType = {
        id: '123',
        name: 'Active',
        code: 'ACTIVE',
        requiresRemarks: false,
        isTerminal: false,
        workflowOrder: 1,
      }

      expect(statusType.id).toBe('123')
      expect(statusType.name).toBe('Active')
      expect(statusType.code).toBe('ACTIVE')
      expect(statusType.requiresRemarks).toBe(false)
      expect(statusType.isTerminal).toBe(false)
      expect(statusType.workflowOrder).toBe(1)
    })
  })

  describe('StatusReason interface', () => {
    it('should create a valid StatusReason object', () => {
      const statusReason: StatusReason = {
        id: '123',
        name: 'Payment Received',
        code: 'PAYMENT_RECEIVED',
        statusId: '456',
        requiresRemarks: false,
      }

      expect(statusReason.id).toBe('123')
      expect(statusReason.name).toBe('Payment Received')
      expect(statusReason.code).toBe('PAYMENT_RECEIVED')
      expect(statusReason.statusId).toBe('456')
      expect(statusReason.requiresRemarks).toBe(false)
    })
  })

  describe('ClientPeriodStatus interface', () => {
    it('should create a valid ClientPeriodStatus object', () => {
      const statusType: StatusType = {
        id: '123',
        name: 'Active',
        code: 'ACTIVE',
        requiresRemarks: false,
        isTerminal: false,
        workflowOrder: 1,
      }

      const clientPeriodStatus: ClientPeriodStatus = {
        id: '123',
        clientId: '456',
        periodType: 'monthly',
        periodYear: 2024,
        periodMonth: 1,
        periodQuarter: null,
        status: statusType,
        reason: null,
        remarks: null,
        hasPayment: true,
        updateCount: 5,
        isTerminal: false,
        updatedBy: {
          id: '789',
          name: 'John Doe',
        },
        updatedAt: '2024-01-01T00:00:00Z',
      }

      expect(clientPeriodStatus.clientId).toBe('456')
      expect(clientPeriodStatus.periodType).toBe('monthly')
      expect(clientPeriodStatus.periodYear).toBe(2024)
      expect(clientPeriodStatus.periodMonth).toBe(1)
      expect(clientPeriodStatus.hasPayment).toBe(true)
      expect(clientPeriodStatus.updateCount).toBe(5)
    })

    it('should create ClientPeriodStatus with quarterly period', () => {
      const statusType: StatusType = {
        id: '123',
        name: 'Active',
        code: 'ACTIVE',
        requiresRemarks: false,
        isTerminal: false,
        workflowOrder: 1,
      }

      const clientPeriodStatus: ClientPeriodStatus = {
        id: '123',
        clientId: '456',
        periodType: 'quarterly',
        periodYear: 2024,
        periodMonth: null,
        periodQuarter: 1,
        status: statusType,
        reason: null,
        remarks: null,
        hasPayment: false,
        updateCount: 0,
        isTerminal: false,
        updatedBy: {
          id: '789',
          name: 'John Doe',
        },
        updatedAt: '2024-01-01T00:00:00Z',
      }

      expect(clientPeriodStatus.periodType).toBe('quarterly')
      expect(clientPeriodStatus.periodQuarter).toBe(1)
      expect(clientPeriodStatus.periodMonth).toBeNull()
    })
  })

  describe('StatusEvent interface', () => {
    it('should create a valid StatusEvent object', () => {
      const statusType: StatusType = {
        id: '123',
        name: 'Active',
        code: 'ACTIVE',
        requiresRemarks: false,
        isTerminal: false,
        workflowOrder: 1,
      }

      const statusEvent: StatusEvent = {
        id: '123',
        eventSequence: 1,
        status: statusType,
        reason: null,
        remarks: null,
        hasPayment: true,
        createdBy: {
          id: '456',
          name: 'John Doe',
        },
        createdAt: '2024-01-01T00:00:00Z',
      }

      expect(statusEvent.id).toBe('123')
      expect(statusEvent.eventSequence).toBe(1)
      expect(statusEvent.hasPayment).toBe(true)
      expect(statusEvent.createdBy.name).toBe('John Doe')
    })
  })

  describe('DashboardSummary interface', () => {
    it('should create a valid DashboardSummary object', () => {
      const dashboardSummary: DashboardSummary = {
        totalClients: 100,
        statusCounts: {
          ACTIVE: 50,
          INACTIVE: 30,
          PENDING: 20,
        },
        paymentCount: 60,
        terminalCount: 10,
        byPensionType: {
          SSS: 50,
          GSIS: 30,
          PAGIBIG: 20,
        },
      }

      expect(dashboardSummary.totalClients).toBe(100)
      expect(dashboardSummary.statusCounts.ACTIVE).toBe(50)
      expect(dashboardSummary.paymentCount).toBe(60)
      expect(dashboardSummary.terminalCount).toBe(10)
      expect(dashboardSummary.byPensionType.SSS).toBe(50)
    })
  })

  describe('StatusUpdateInput interface', () => {
    it('should create a valid StatusUpdateInput object', () => {
      const statusUpdateInput: StatusUpdateInput = {
        clientId: '123',
        periodType: 'monthly',
        periodYear: 2024,
        periodMonth: 1,
        periodQuarter: null,
        statusId: '456',
        reasonId: null,
        remarks: null,
        hasPayment: true,
      }

      expect(statusUpdateInput.clientId).toBe('123')
      expect(statusUpdateInput.periodType).toBe('monthly')
      expect(statusUpdateInput.statusId).toBe('456')
      expect(statusUpdateInput.hasPayment).toBe(true)
    })
  })

  describe('BulkUpdateInput interface', () => {
    it('should create a valid BulkUpdateInput object', () => {
      const statusUpdateInput1: StatusUpdateInput = {
        clientId: '123',
        periodType: 'monthly',
        periodYear: 2024,
        periodMonth: 1,
        periodQuarter: null,
        statusId: '456',
        reasonId: null,
        remarks: null,
        hasPayment: true,
      }

      const statusUpdateInput2: StatusUpdateInput = {
        clientId: '789',
        periodType: 'monthly',
        periodYear: 2024,
        periodMonth: 1,
        periodQuarter: null,
        statusId: '456',
        reasonId: null,
        remarks: null,
        hasPayment: false,
      }

      const bulkUpdateInput: BulkUpdateInput = {
        updates: [statusUpdateInput1, statusUpdateInput2],
      }

      expect(bulkUpdateInput.updates).toHaveLength(2)
      expect(bulkUpdateInput.updates[0]?.clientId).toBe('123')
      expect(bulkUpdateInput.updates[1]?.clientId).toBe('789')
    })
  })

  describe('BulkUpdateResult interface', () => {
    it('should create a valid BulkUpdateResult object', () => {
      const bulkUpdateResult: BulkUpdateResult = {
        successful: 8,
        failed: 2,
        results: [
          {
            clientId: '123',
            success: true,
            error: null,
          },
          {
            clientId: '456',
            success: false,
            error: 'Invalid status',
          },
        ],
      }

      expect(bulkUpdateResult.successful).toBe(8)
      expect(bulkUpdateResult.failed).toBe(2)
      expect(bulkUpdateResult.results).toHaveLength(2)
      expect(bulkUpdateResult.results[0]?.success).toBe(true)
      expect(bulkUpdateResult.results[1]?.success).toBe(false)
    })
  })

  describe('PeriodFilter interface', () => {
    it('should create a valid PeriodFilter object with monthly period', () => {
      const periodFilter: PeriodFilter = {
        periodType: 'monthly',
        periodYear: 2024,
        periodMonth: 1,
        periodQuarter: null,
      }

      expect(periodFilter.periodType).toBe('monthly')
      expect(periodFilter.periodYear).toBe(2024)
      expect(periodFilter.periodMonth).toBe(1)
      expect(periodFilter.periodQuarter).toBeNull()
    })

    it('should create a valid PeriodFilter object with quarterly period', () => {
      const periodFilter: PeriodFilter = {
        periodType: 'quarterly',
        periodYear: 2024,
        periodMonth: null,
        periodQuarter: 1,
      }

      expect(periodFilter.periodType).toBe('quarterly')
      expect(periodFilter.periodYear).toBe(2024)
      expect(periodFilter.periodMonth).toBeNull()
      expect(periodFilter.periodQuarter).toBe(1)
    })
  })

  describe('StatusFilter interface', () => {
    it('should create a valid StatusFilter object', () => {
      const statusFilter: StatusFilter = {
        companyId: '123',
        periodType: 'monthly',
        periodYear: 2024,
        periodMonth: 1,
        periodQuarter: null,
        statusIds: ['456', '789'],
        pensionTypes: ['SSS', 'GSIS'],
        hasPayment: true,
        isTerminal: false,
      }

      expect(statusFilter.companyId).toBe('123')
      expect(statusFilter.periodType).toBe('monthly')
      expect(statusFilter.statusIds).toEqual(['456', '789'])
      expect(statusFilter.pensionTypes).toEqual(['SSS', 'GSIS'])
      expect(statusFilter.hasPayment).toBe(true)
      expect(statusFilter.isTerminal).toBe(false)
    })

    it('should create StatusFilter with only required fields', () => {
      const statusFilter: StatusFilter = {
        companyId: '123',
        periodType: 'monthly',
        periodYear: 2024,
        periodMonth: 1,
        periodQuarter: null,
      }

      expect(statusFilter.companyId).toBe('123')
      expect(statusFilter.statusIds).toBeUndefined()
      expect(statusFilter.pensionTypes).toBeUndefined()
      expect(statusFilter.hasPayment).toBeUndefined()
      expect(statusFilter.isTerminal).toBeUndefined()
    })
  })

  describe('StatusStoreState interface', () => {
    it('should create a valid StatusStoreState object', () => {
      const periodFilter: PeriodFilter = {
        periodType: 'monthly',
        periodYear: 2024,
        periodMonth: 1,
        periodQuarter: null,
      }

      const statusStoreState: StatusStoreState = {
        currentPeriod: periodFilter,
        selectedClientStatus: null,
        isUpdateDialogOpen: false,
        isBulkUpdateMode: false,
        selectedClientIds: new Set<string>(),
        setCurrentPeriod: () => {},
        setSelectedClientStatus: () => {},
        openUpdateDialog: () => {},
        closeUpdateDialog: () => {},
        setBulkUpdateMode: () => {},
        toggleClientSelection: () => {},
        clearClientSelection: () => {},
        reset: () => {},
      }

      expect(statusStoreState.currentPeriod).toEqual(periodFilter)
      expect(statusStoreState.selectedClientStatus).toBeNull()
      expect(statusStoreState.isUpdateDialogOpen).toBe(false)
      expect(statusStoreState.isBulkUpdateMode).toBe(false)
      expect(statusStoreState.selectedClientIds).toBeInstanceOf(Set)
    })
  })
})
