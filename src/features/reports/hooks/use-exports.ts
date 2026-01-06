'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface ExportJob {
  id: string
  type: string
  format: string
  name: string
  description: string | null
  status: 'pending' | 'processing' | 'completed' | 'failed'
  filePath: string | null
  fileName: string | null
  fileSize: number | null
  errorMessage: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
  expiresAt: string | null
}

interface CreateExportInput {
  type: string
  format: string
  name: string
  description?: string
  parameters?: {
    companyId?: string
    branchIds?: string[]
    periodYear?: number
    periodMonth?: number
    periodQuarter?: number
    columns?: Array<{
      key: string
      label: string
      width?: number
      format?: string
    }>
    filters?: Record<string, any>
  }
}

interface ListExportsParams {
  page?: number
  pageSize?: number
  status?: 'pending' | 'processing' | 'completed' | 'failed'
}

interface ListExportsResponse {
  data: ExportJob[]
  meta: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

interface DownloadUrlResponse {
  downloadUrl: string
  fileName: string
  fileSize: number
  expiresAt: string
}

const API_BASE = '/api/reports/exports'

/**
 * Hook to list export jobs
 */
export function useExportJobs(params: ListExportsParams = {}) {
  return useQuery({
    queryKey: ['export-jobs', params],
    queryFn: async (): Promise<ListExportsResponse> => {
      const searchParams = new URLSearchParams()
      if (params.page) searchParams.set('page', params.page.toString())
      if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString())
      if (params.status) searchParams.set('status', params.status)

      const response = await fetch(`${API_BASE}?${searchParams.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch export jobs')
      }
      return response.json()
    },
    refetchInterval: (data) => {
      // Auto-refresh every 5 seconds if there are pending or processing jobs
      const hasActiveJobs = data?.data?.some(
        (job: ExportJob) => job.status === 'pending' || job.status === 'processing'
      )
      return hasActiveJobs ? 5000 : false
    },
  })
}

/**
 * Hook to get a single export job
 */
export function useExportJob(id: string) {
  return useQuery({
    queryKey: ['export-job', id],
    queryFn: async (): Promise<ExportJob> => {
      const response = await fetch(`${API_BASE}/${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch export job')
      }
      const result = await response.json()
      return result.data
    },
    refetchInterval: (data) => {
      // Auto-refresh every 5 seconds if job is pending or processing
      return data?.data?.status === 'pending' || data?.data?.status === 'processing' ? 5000 : false
    },
  })
}

/**
 * Hook to get download URL for a completed export
 */
export function useExportDownloadUrl(id: string) {
  return useQuery({
    queryKey: ['export-download-url', id],
    queryFn: async (): Promise<DownloadUrlResponse> => {
      const response = await fetch(`${API_BASE}/${id}/download`)
      if (!response.ok) {
        throw new Error('Failed to get download URL')
      }
      const result = await response.json()
      return result.data
    },
    enabled: !!id,
  })
}

/**
 * Hook to create a new export job
 */
export function useCreateExport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateExportInput): Promise<{ id: string; status: string }> => {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to create export job')
      }

      const result = await response.json()
      return result.data
    },
    onSuccess: () => {
      // Invalidate export jobs list to refresh the data
      queryClient.invalidateQueries({ queryKey: ['export-jobs'] })
    },
  })
}
