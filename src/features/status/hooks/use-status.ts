'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  DashboardSummary,
  ClientPeriodStatus,
  StatusEvent,
  StatusUpdateInput,
  BulkUpdateInput,
  BulkUpdateResult,
  PeriodFilter,
} from '../types'

/**
 * Get dashboard summary
 */
export function useDashboardSummary(companyId: string, periodFilter: PeriodFilter) {
  return useQuery({
    queryKey: ['status', 'summary', companyId, periodFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        companyId,
        periodYear: periodFilter.periodYear.toString(),
      })
      if (periodFilter.periodMonth) {
        params.append('periodMonth', periodFilter.periodMonth.toString())
      }
      if (periodFilter.periodQuarter) {
        params.append('periodQuarter', periodFilter.periodQuarter.toString())
      }
      const response = await fetch(`/api/status/summary?${params}`)
      if (!response.ok) throw new Error('Failed to fetch dashboard summary')
      const data = await response.json()
      return data.data as DashboardSummary
    },
    staleTime: 60000, // 1 minute
  })
}

/**
 * Get client status
 */
export function useClientStatus(clientId: string, periodFilter: PeriodFilter) {
  return useQuery({
    queryKey: ['status', 'client', clientId, periodFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        periodType: periodFilter.periodType,
        periodYear: periodFilter.periodYear.toString(),
      })
      if (periodFilter.periodMonth) {
        params.append('periodMonth', periodFilter.periodMonth.toString())
      }
      if (periodFilter.periodQuarter) {
        params.append('periodQuarter', periodFilter.periodQuarter.toString())
      }
      const response = await fetch(`/api/status/${clientId}?${params}`)
      if (!response.ok) throw new Error('Failed to fetch client status')
      const data = await response.json()
      return data.data as ClientPeriodStatus
    },
    enabled: !!clientId,
  })
}

/**
 * Get client status history
 */
export function useClientStatusHistory(clientId: string, limit = 50) {
  return useQuery({
    queryKey: ['status', 'history', clientId, limit],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: limit.toString() })
      const response = await fetch(`/api/status/${clientId}/history?${params}`)
      if (!response.ok) throw new Error('Failed to fetch status history')
      const data = await response.json()
      return data.data as StatusEvent[]
    },
    enabled: !!clientId,
  })
}

/**
 * Get single status event
 */
export function useStatusEvent(eventId: string) {
  return useQuery({
    queryKey: ['status', 'event', eventId],
    queryFn: async () => {
      const response = await fetch(`/api/status/history/${eventId}`)
      if (!response.ok) throw new Error('Failed to fetch status event')
      const data = await response.json()
      return data.data as StatusEvent
    },
    enabled: !!eventId,
  })
}

/**
 * Update client status
 */
export function useUpdateStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: StatusUpdateInput) => {
      const response = await fetch('/api/status/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to update status')
      }
      const data = await response.json()
      return data.data
    },
    onSuccess: (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['status', 'summary'] })
      queryClient.invalidateQueries({ queryKey: ['status', 'client', variables.clientId] })
      queryClient.invalidateQueries({ queryKey: ['status', 'history', variables.clientId] })
    },
  })
}

/**
 * Bulk update client status
 */
export function useBulkUpdateStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: BulkUpdateInput) => {
      const response = await fetch('/api/status/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to bulk update status')
      }
      const data = await response.json()
      return data.data as BulkUpdateResult
    },
    onSuccess: (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['status', 'summary'] })
      const clientIds = variables.updates.map((u) => u.clientId)
      clientIds.forEach((clientId) => {
        queryClient.invalidateQueries({ queryKey: ['status', 'client', clientId] })
        queryClient.invalidateQueries({ queryKey: ['status', 'history', clientId] })
      })
    },
  })
}

/**
 * Get available years helper
 */
export function useAvailableYears(): number[] {
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth() + 1 // 1-12
  const currentYear = currentDate.getFullYear()

  if (currentMonth >= 9) {
    // September onwards
    return [currentYear - 1, currentYear, currentYear + 1]
  } else {
    return [currentYear - 2, currentYear - 1, currentYear]
  }
}
