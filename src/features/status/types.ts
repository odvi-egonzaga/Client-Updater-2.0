// Status tracking feature types

/**
 * Period type
 */
export type PeriodType = 'monthly' | 'quarterly'

/**
 * Status type
 */
export interface StatusType {
  id: string
  name: string
  code: string
  requiresRemarks: boolean
  isTerminal: boolean
  workflowOrder: number
}

/**
 * Status reason
 */
export interface StatusReason {
  id: string
  name: string
  code: string
  statusId: string
  requiresRemarks: boolean
}

/**
 * Client period status
 */
export interface ClientPeriodStatus {
  id: string
  clientId: string
  periodType: PeriodType
  periodYear: number
  periodMonth: number | null
  periodQuarter: number | null
  status: StatusType
  reason: StatusReason | null
  remarks: string | null
  hasPayment: boolean
  updateCount: number
  isTerminal: boolean
  updatedBy: {
    id: string
    name: string
  }
  updatedAt: string
}

/**
 * Status event (audit trail)
 */
export interface StatusEvent {
  id: string
  eventSequence: number
  status: StatusType
  reason: StatusReason | null
  remarks: string | null
  hasPayment: boolean
  createdBy: {
    id: string
    name: string
  }
  createdAt: string
}

/**
 * Dashboard summary
 */
export interface DashboardSummary {
  totalClients: number
  statusCounts: Record<string, number>
  paymentCount: number
  terminalCount: number
  byPensionType: Record<string, number>
}

/**
 * Status update input
 */
export interface StatusUpdateInput {
  clientId: string
  periodType: PeriodType
  periodYear: number
  periodMonth: number | null
  periodQuarter: number | null
  statusId: string
  reasonId: string | null
  remarks: string | null
  hasPayment: boolean
}

/**
 * Bulk update input
 */
export interface BulkUpdateInput {
  updates: StatusUpdateInput[]
}

/**
 * Bulk update result
 */
export interface BulkUpdateResult {
  successful: number
  failed: number
  results: Array<{
    clientId: string
    success: boolean
    error: string | null
  }>
}

/**
 * Period filter
 */
export interface PeriodFilter {
  periodType: PeriodType
  periodYear: number
  periodMonth: number | null
  periodQuarter: number | null
}

/**
 * Status filter
 */
export interface StatusFilter extends PeriodFilter {
  companyId: string
  statusIds?: string[]
  pensionTypes?: string[]
  hasPayment?: boolean
  isTerminal?: boolean
}

/**
 * Store state
 */
export interface StatusStoreState {
  // Current period filter
  currentPeriod: PeriodFilter
  setCurrentPeriod: (period: PeriodFilter) => void

  // Selected client status
  selectedClientStatus: ClientPeriodStatus | null
  setSelectedClientStatus: (status: ClientPeriodStatus | null) => void

  // Status update dialog
  isUpdateDialogOpen: boolean
  openUpdateDialog: () => void
  closeUpdateDialog: () => void

  // Bulk update mode
  isBulkUpdateMode: boolean
  setBulkUpdateMode: (enabled: boolean) => void

  // Selected clients for bulk update
  selectedClientIds: Set<string>
  toggleClientSelection: (clientId: string) => void
  clearClientSelection: () => void

  // Reset
  reset: () => void
}
