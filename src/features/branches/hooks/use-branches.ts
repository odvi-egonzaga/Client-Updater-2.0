'use client'

import { useQuery, useMutation, useQueryClient, type UseQueryOptions, type UseMutationOptions } from '@tanstack/react-query'
import type {
  Branch,
  BranchListResponse,
  BranchFilters,
  BranchContact,
  ApiResponse,
} from '../types'
import { useBranchesStore } from '../stores/branches-store'

/**
 * Base API URL for branches
 */
const BRANCHES_API_BASE = '/api/organization/branches'

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
 * Fetch paginated branch list
 */
export function useBranches(
  page?: number,
  pageSize?: number,
  filters?: BranchFilters,
  options?: Omit<UseQueryOptions<BranchListResponse>, 'queryKey' | 'queryFn'>
) {
  const storePage = useBranchesStore((state) => state.pagination.page)
  const storePageSize = useBranchesStore((state) => state.pagination.pageSize)
  const storeFilters = useBranchesStore((state) => state.filters)
  const setLoading = useBranchesStore((state) => state.setLoading)
  const setError = useBranchesStore((state) => state.setError)
  const setBranches = useBranchesStore((state) => state.setBranches)
  const setPagination = useBranchesStore((state) => state.setPagination)

  const currentPage = page ?? storePage
  const currentPageSize = pageSize ?? storePageSize
  const currentFilters = filters ?? storeFilters

  return useQuery({
    queryKey: ['branches', currentPage, currentPageSize, currentFilters],
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

        if (currentFilters.areaId) {
          params.append('areaId', currentFilters.areaId)
        }

        if (currentFilters.category) {
          params.append('category', currentFilters.category)
        }

        if (currentFilters.isActive !== undefined) {
          params.append('isActive', currentFilters.isActive.toString())
        }

        const response = await fetch(`${BRANCHES_API_BASE}?${params.toString()}`)
        const data = await handleApiResponse<BranchListResponse>(response)

        setBranches(data.data)
        setPagination({
          page: data.meta.page,
          pageSize: data.meta.pageSize,
          total: data.meta.total,
          totalPages: data.meta.totalPages,
        })

        return data
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to fetch branches')
        throw error
      } finally {
        setLoading(false)
      }
    },
    ...options,
  })
}

/**
 * Fetch single branch by ID
 */
export function useBranch(
  branchId: string,
  options?: Omit<UseQueryOptions<ApiResponse<Branch>>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['branches', branchId],
    queryFn: async () => {
      const response = await fetch(`${BRANCHES_API_BASE}/${branchId}`)
      return handleApiResponse<ApiResponse<Branch>>(response)
    },
    enabled: !!branchId,
    ...options,
  })
}

/**
 * Fetch branch contacts
 */
export function useBranchContacts(
  branchId: string,
  options?: Omit<UseQueryOptions<BranchContact[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['branches', branchId, 'contacts'],
    queryFn: async () => {
      const response = await fetch(`${BRANCHES_API_BASE}/${branchId}/contacts`)
      const data = await handleApiResponse<{ data: BranchContact[] }>(response)
      return data.data
    },
    enabled: !!branchId,
    ...options,
  })
}

/**
 * Fetch branch categories
 */
export function useBranchCategories(
  options?: Omit<UseQueryOptions<string[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['branches', 'categories'],
    queryFn: async () => {
      const response = await fetch(`${BRANCHES_API_BASE}/categories`)
      const data = await handleApiResponse<{ data: string[] }>(response)
      return data.data
    },
    ...options,
  })
}

/**
 * Mutation to create branch
 */
export function useCreateBranch(
  options?: UseMutationOptions<ApiResponse<Branch>, Error, any>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(BRANCHES_API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return handleApiResponse<ApiResponse<Branch>>(response)
    },
    onSuccess: () => {
      // Invalidate branches queries
      queryClient.invalidateQueries({ queryKey: ['branches'] })
    },
    ...options,
  })
}

/**
 * Mutation to update branch
 */
export function useUpdateBranch(
  options?: UseMutationOptions<ApiResponse<Branch>, Error, { id: string; data: any }>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`${BRANCHES_API_BASE}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return handleApiResponse<ApiResponse<Branch>>(response)
    },
    onSuccess: () => {
      // Invalidate branches queries
      queryClient.invalidateQueries({ queryKey: ['branches'] })
    },
    ...options,
  })
}

/**
 * Mutation to delete branch
 */
export function useDeleteBranch(
  options?: UseMutationOptions<ApiResponse<null>, Error, string>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${BRANCHES_API_BASE}/${id}`, {
        method: 'DELETE',
      })
      return handleApiResponse<ApiResponse<null>>(response)
    },
    onSuccess: () => {
      // Invalidate branches queries
      queryClient.invalidateQueries({ queryKey: ['branches'] })
    },
    ...options,
  })
}

/**
 * Mutation to add branch contact
 */
export function useAddBranchContact(
  options?: UseMutationOptions<ApiResponse<BranchContact>, Error, { branchId: string; data: any }>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ branchId, data }: { branchId: string; data: any }) => {
      const response = await fetch(`${BRANCHES_API_BASE}/${branchId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return handleApiResponse<ApiResponse<BranchContact>>(response)
    },
    onSuccess: () => {
      // Invalidate branches queries
      queryClient.invalidateQueries({ queryKey: ['branches'] })
    },
    ...options,
  })
}

/**
 * Mutation to update branch contact
 */
export function useUpdateBranchContact(
  options?: UseMutationOptions<ApiResponse<BranchContact>, Error, { branchId: string; contactId: string; data: any }>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ branchId, contactId, data }: { branchId: string; contactId: string; data: any }) => {
      const response = await fetch(`${BRANCHES_API_BASE}/${branchId}/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return handleApiResponse<ApiResponse<BranchContact>>(response)
    },
    onSuccess: () => {
      // Invalidate branches queries
      queryClient.invalidateQueries({ queryKey: ['branches'] })
    },
    ...options,
  })
}

/**
 * Mutation to delete branch contact
 */
export function useDeleteBranchContact(
  options?: UseMutationOptions<ApiResponse<null>, Error, { branchId: string; contactId: string }>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ branchId, contactId }: { branchId: string; contactId: string }) => {
      const response = await fetch(`${BRANCHES_API_BASE}/${branchId}/contacts/${contactId}`, {
        method: 'DELETE',
      })
      return handleApiResponse<ApiResponse<null>>(response)
    },
    onSuccess: () => {
      // Invalidate branches queries
      queryClient.invalidateQueries({ queryKey: ['branches'] })
    },
    ...options,
  })
}

/**
 * Mutation to set primary contact
 */
export function useSetPrimaryContact(
  options?: UseMutationOptions<ApiResponse<null>, Error, { branchId: string; contactId: string }>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ branchId, contactId }: { branchId: string; contactId: string }) => {
      const response = await fetch(`${BRANCHES_API_BASE}/${branchId}/contacts/${contactId}/primary`, {
        method: 'POST',
      })
      return handleApiResponse<ApiResponse<null>>(response)
    },
    onSuccess: () => {
      // Invalidate branches queries
      queryClient.invalidateQueries({ queryKey: ['branches'] })
    },
    ...options,
  })
}
