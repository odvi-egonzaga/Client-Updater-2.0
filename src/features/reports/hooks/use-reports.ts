'use client'

import { useQuery } from '@tanstack/react-query'
import type { StatusSummary, PensionTypeSummary, BranchPerformanceSummary, StatusTrend } from '../queries/dashboard.queries'

interface DashboardQueryParams {
  companyId?: string
  branchIds?: string[]
  periodYear: number
  periodMonth?: number
  periodQuarter?: number
}

interface TrendsQueryParams extends DashboardQueryParams {
  days?: number
}

const API_BASE = '/api/reports/dashboard'

/**
 * Hook to fetch status summary
 */
export function useStatusSummary(params: DashboardQueryParams) {
  return useQuery({
    queryKey: ['status-summary', params],
    queryFn: async (): Promise<StatusSummary> => {
      const searchParams = new URLSearchParams()
      if (params.companyId) searchParams.set('companyId', params.companyId)
      searchParams.set('periodYear', params.periodYear.toString())
      if (params.periodMonth) searchParams.set('periodMonth', params.periodMonth.toString())
      if (params.periodQuarter) searchParams.set('periodQuarter', params.periodQuarter.toString())

      const response = await fetch(`${API_BASE}/status-summary?${searchParams.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch status summary')
      }
      const result = await response.json()
      return result.data
    },
    enabled: !!params.companyId && !!params.periodYear,
  })
}

/**
 * Hook to fetch pension type summary
 */
export function usePensionTypeSummary(params: DashboardQueryParams) {
  return useQuery({
    queryKey: ['pension-type-summary', params],
    queryFn: async (): Promise<PensionTypeSummary[]> => {
      const searchParams = new URLSearchParams()
      if (params.companyId) searchParams.set('companyId', params.companyId)
      searchParams.set('periodYear', params.periodYear.toString())
      if (params.periodMonth) searchParams.set('periodMonth', params.periodMonth.toString())
      if (params.periodQuarter) searchParams.set('periodQuarter', params.periodQuarter.toString())

      const response = await fetch(`${API_BASE}/pension-type-summary?${searchParams.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch pension type summary')
      }
      const result = await response.json()
      return result.data
    },
    enabled: !!params.companyId && !!params.periodYear,
  })
}

/**
 * Hook to fetch branch performance summary
 */
export function useBranchPerformanceSummary(params: DashboardQueryParams) {
  return useQuery({
    queryKey: ['branch-performance-summary', params],
    queryFn: async (): Promise<BranchPerformanceSummary[]> => {
      const searchParams = new URLSearchParams()
      if (params.companyId) searchParams.set('companyId', params.companyId)
      searchParams.set('periodYear', params.periodYear.toString())
      if (params.periodMonth) searchParams.set('periodMonth', params.periodMonth.toString())
      if (params.periodQuarter) searchParams.set('periodQuarter', params.periodQuarter.toString())

      const response = await fetch(`${API_BASE}/branch-performance?${searchParams.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch branch performance summary')
      }
      const result = await response.json()
      return result.data
    },
    enabled: !!params.companyId && !!params.periodYear,
  })
}

/**
 * Hook to fetch status trends
 */
export function useStatusTrends(params: TrendsQueryParams) {
  return useQuery({
    queryKey: ['status-trends', params],
    queryFn: async (): Promise<StatusTrend[]> => {
      const searchParams = new URLSearchParams()
      if (params.companyId) searchParams.set('companyId', params.companyId)
      searchParams.set('periodYear', params.periodYear.toString())
      if (params.periodMonth) searchParams.set('periodMonth', params.periodMonth.toString())
      if (params.periodQuarter) searchParams.set('periodQuarter', params.periodQuarter.toString())
      if (params.days) searchParams.set('days', params.days.toString())

      const response = await fetch(`${API_BASE}/trends?${searchParams.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch status trends')
      }
      const result = await response.json()
      return result.data
    },
    enabled: !!params.companyId && !!params.periodYear,
  })
}
