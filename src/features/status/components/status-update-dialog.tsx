'use client'

import { useState } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import type { ClientPeriodStatus, PeriodType } from '../types'
import { useUpdateStatus } from '../hooks/use-status'
import { ClientActionSheet } from './client-action-sheet'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface StatusUpdateDialogProps {
  open: boolean
  onClose: () => void
  clientId: string
  clientName: string
  currentStatus?: ClientPeriodStatus
  companyId: string
  periodType: PeriodType
}

// Mock status types - in production, these would come from API
const STATUS_TYPES = [
  { id: '1', code: 'PENDING', name: 'Pending', requiresRemarks: false, isTerminal: false, workflowOrder: 1 },
  { id: '2', code: 'TO_FOLLOW', name: 'To Follow', requiresRemarks: false, isTerminal: false, workflowOrder: 2 },
  { id: '3', code: 'CALLED', name: 'Called', requiresRemarks: false, isTerminal: false, workflowOrder: 3 },
  { id: '4', code: 'VISITED', name: 'Visited', requiresRemarks: true, isTerminal: false, workflowOrder: 4 },
  { id: '5', code: 'UPDATED', name: 'Updated', requiresRemarks: false, isTerminal: false, workflowOrder: 5 },
  { id: '6', code: 'DONE', name: 'Done', requiresRemarks: false, isTerminal: true, workflowOrder: 6 },
]

// Workflow transitions
const STATUS_WORKFLOW: Record<string, string[]> = {
  PENDING: ['TO_FOLLOW'],
  TO_FOLLOW: ['CALLED'],
  CALLED: ['VISITED', 'UPDATED'],
  VISITED: ['UPDATED'],
  UPDATED: ['DONE'],
  DONE: [],
}

export function StatusUpdateDialog({
  open,
  onClose,
  clientId,
  clientName,
  currentStatus,
  companyId,
  periodType,
}: StatusUpdateDialogProps) {
  const [activeTab, setActiveTab] = useState('update-status')
  const [error, setError] = useState<string | null>(null)
  const [statusId, setStatusId] = useState('')
  const [remarks, setRemarks] = useState('')
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const updateStatus = useUpdateStatus()

  // Get available status options based on current status and workflow
  const getAvailableStatuses = () => {
    if (!currentStatus) {
      return STATUS_TYPES.filter((s) => s.code === 'TO_FOLLOW')
    }

    const currentStatusCode = currentStatus.status.code
    const allowedTransitions = STATUS_WORKFLOW[currentStatusCode] || []
    
    return STATUS_TYPES.filter((status) =>
      allowedTransitions.includes(status.code)
    )
  }

  const availableStatuses = getAvailableStatuses()
  const selectedStatus = STATUS_TYPES.find((s) => s.id === statusId)

  // Check if remarks are required
  const remarksRequired = selectedStatus?.requiresRemarks || false

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!statusId) {
      errors.statusId = 'Status is required'
    }

    if (remarksRequired && (!remarks || remarks.trim().length === 0)) {
      errors.remarks = 'Remarks are required'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateForm()) {
      return
    }
    
    try {
      // Get current period info
      const currentDate = new Date()
      const periodYear = currentDate.getFullYear()
      const periodMonth = periodType === 'monthly' ? currentDate.getMonth() + 1 : null
      const periodQuarter = periodType === 'quarterly' ? Math.ceil((currentDate.getMonth() + 1) / 3) : null

      await updateStatus.mutateAsync({
        clientId,
        periodType,
        periodYear,
        periodMonth,
        periodQuarter,
        statusId,
        reasonId: null,
        remarks: remarks || null,
        hasPayment: false,
      })

      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    }
  }

  return (
    <ClientActionSheet
      open={open}
      onClose={onClose}
      clientName={clientName}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-destructive">
            <AlertCircle className="size-4 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* New Status Dropdown */}
        <div className="space-y-2">
          <label htmlFor="statusId" className="text-sm font-medium">
            New Status <span className="text-destructive">*</span>
          </label>
          <select
            id="statusId"
            value={statusId}
            onChange={(e) => setStatusId(e.target.value)}
            className={cn(
              'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-50',
              validationErrors.statusId && 'border-destructive focus-visible:ring-destructive'
            )}
            disabled={updateStatus.isPending}
          >
            <option value="">Select status</option>
            {availableStatuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </select>
          {validationErrors.statusId && (
            <p className="text-xs text-destructive">{validationErrors.statusId}</p>
          )}
        </div>

        {/* Remarks Textarea */}
        <div className="space-y-2">
          <label htmlFor="remarks" className="text-sm font-medium">
            Remarks {remarksRequired && <span className="text-destructive">*</span>}
          </label>
          <textarea
            id="remarks"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={3}
            placeholder="Enter remarks..."
            className={cn(
              'flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm',
              'placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'resize-y',
              validationErrors.remarks && 'border-destructive focus-visible:ring-destructive'
            )}
            disabled={updateStatus.isPending}
          />
          {validationErrors.remarks && (
            <p className="text-xs text-destructive">{validationErrors.remarks}</p>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={updateStatus.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={updateStatus.isPending}>
            {updateStatus.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Update Status
          </Button>
        </div>
      </form>
    </ClientActionSheet>
  )
}
