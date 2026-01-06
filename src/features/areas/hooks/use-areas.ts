'use client'

import { useQuery, useMutation, useQueryClient, type UseQueryOptions, type UseMutationOptions } from '@tanstack/react-query'
import type {
  Area,
  AreaListResponse,
  AreaFilters,
  AreaBranch,
  ApiResponse,
} from '../types'
import { useAreasStore } from '../stores/areas-store'

/**
 * Base API URL for areas
 */
const AREAS_API_BASE = '/api/organization/areas'

/**
 * Helper function to handle API errors
 */
async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'API request failed')
  }
  return response.json()
}

/**
 * Fetch paginated area list
 */
export function useAreas(
  page?: number,
  pageSize?: number,
  filters?: AreaFilters,
  options?: Omit<UseQueryOptions<AreaListResponse>, 'queryKey' | 'queryFn'>
) {
  const storePage = useAreasStore((state) => state.pagination.page)
  const storePageSize = useAreasStore((state) => state.pagination.pageSize)
  const storeFilters = useAreasStore((state) => state.filters)
  const setLoading = useAreasStore((state) => state.setLoading)
  const setError = useAreasStore((state) => state.setError)
  const setAreas = useAreasStore((state) => state.setAreas)
  const setPagination = useAreasStore((state) => state.setPagination)

  const currentPage = page ?? storePage
  const currentPageSize = pageSize ?? storePageSize
  const currentFilters = filters ?? storeFilters

  return useQuery({
    queryKey: ['areas', currentPage, currentPageSize, currentFilters],
    queryFn: async () => {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          pageSize: currentPageSize.toString(),
        })

        if (currentFilters.search) {
          params.append('search', currentFilters.search)
        }

        if (currentFilters.companyId) {
          params.append('companyId', currentFilters.companyId)
        }

        if (currentFilters.isActive !== undefined) {
          params.append('isActive', currentFilters.isActive.toString())
        }

        const response = await fetch(`${AREAS_API_BASE}?${params.toString()}`)
        const data = await handleApiResponse<AreaListResponse>(response)

        setAreas(data.data)
        setPagination({
          page: data.meta.page,
          pageSize: data.meta.pageSize,
          total: data.meta.total,
          totalPages: data.meta.totalPages,
        })

        return data
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to fetch areas')
        throw error
      } finally {
        setLoading(false)
      }
    },
    ...options,
  })
}

/**
 * Fetch single area by ID
 */
export function useArea(
  areaId: string,
  options?: Omit<UseQueryOptions<ApiResponse<Area>>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['areas', areaId],
    queryFn: async () => {
      const response = await fetch(`${AREAS_API_BASE}/${areaId}`)
      return handleApiResponse<ApiResponse<Area>>(response)
    },
    enabled: !!areaId,
    ...options,
  })
}

/**
 * Fetch area branches
 */
export function useAreaBranches(
  areaId: string,
  options?: Omit<UseQueryOptions<AreaBranch[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['areas', areaId, 'branches'],
    queryFn: async () => {
      const response = await fetch(`${AREAS_API_BASE}/${areaId}/branches`)
      const data = await handleApiResponse<{ data: AreaBranch[] }>(response)
      return data.data
    },
    enabled: !!areaId,
    ...options,
  })
}

/**
 * Mutation to create area
 */
export function useCreateArea(
  options?: UseMutationOptions<ApiResponse<Area>, Error, any>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(AREAS_API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return handleApiResponse<ApiResponse<Area>>(response)
    },
    onSuccess: () => {
      // Invalidate areas queries
      queryClient.invalidateQueries({ queryKey: ['areas'] })
    },
    ...options,
  })
}

/**
 * Mutation to update area
 */
export function useUpdateArea(
  options?: UseMutationOptions<ApiResponse<Area>, Error, { id: string; data: any }>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`${AREAS_API_BASE}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return handleApiResponse<ApiResponse<Area>>(response)
    },
    onSuccess: () => {
      // Invalidate areas queries
      queryClient.invalidateQueries({ queryKey: ['areas'] })
    },
    ...options,
  })
}

/**
 * Mutation to delete area
 */
export function useDeleteArea(
  options?: UseMutationOptions<ApiResponse<null>, Error, string>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${AREAS_API_BASE}/${id}`, {
        method: 'DELETE',
      })
      return handleApiResponse<ApiResponse<null>>(response)
    },
    onSuccess: () => {
      // Invalidate areas queries
      queryClient.invalidateQueries({ queryKey: ['areas'] })
    },
    ...options,
  })
}

/**
 * Mutation to assign branches to area
 */
export function useAssignBranchesToArea(
  options?: UseMutationOptions<ApiResponse<AreaBranch[]>, Error, { areaId: string; branchIds: string[]; replaceExisting?: boolean }>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ areaId, branchIds, replaceExisting }: { areaId: string; branchIds: string[]; replaceExisting?: boolean }) => {
      const response = await fetch(`${AREAS_API_BASE}/${areaId}/branches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchIds, replaceExisting }),
      })
      return handleApiResponse<ApiResponse<AreaBranch[]>>(response)
    },
    onSuccess: () => {
      // Invalidate areas queries
      queryClient.invalidateQueries({ queryKey: ['areas'] })
    },
    ...options,
  })
}

/**
 * Mutation to remove branch from area
 */
export function useRemoveBranchFromArea(
  options?: UseMutationOptions<ApiResponse<null>, Error, { areaId: string; branchId: string }>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ areaId, branchId }: { areaId: string; branchId: string }) => {
      const response = await fetch(`${AREAS_API_BASE}/${areaId}/branches/${branchId}`, {
        method: 'DELETE',
      })
      return handleApiResponse<ApiResponse<null>>(response)
    },
    onSuccess: () => {
      // Invalidate areas queries
      queryClient.invalidateQueries({ queryKey: ['areas'] })
    },
    ...options,
  })
}

/**
 * Mutation to set primary branch
 */
export function useSetPrimaryBranch(
  options?: UseMutationOptions<ApiResponse<null>, Error, { areaId: string; branchId: string }>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ areaId, branchId }: { areaId: string; branchId: string }) => {
      const response = await fetch(`${AREAS_API_BASE}/${areaId}/branches/${branchId}/primary`, {
        method: 'POST',
      })
      return handleApiResponse<ApiResponse<null>>(response)
    },
    onSuccess: () => {
      // Invalidate areas queries
      queryClient.invalidateQueries({ queryKey: ['areas'] })
    },
    ...options,
  })
}
