'use client'

import { useQuery, useMutation, useQueryClient, type UseQueryOptions, type UseMutationOptions } from '@tanstack/react-query'
import type {
  ConfigOption,
  ConfigCategory,
  ConfigSetting,
  ConfigAuditLogEntry,
  ApiResponse,
} from '../types'

/**
 * Base API URL for config
 */
const CONFIG_API_BASE = '/api/admin/config'

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
 * Fetch config categories
 */
export function useConfigCategories(
  options?: Omit<UseQueryOptions<ConfigCategory[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['config', 'categories'],
    queryFn: async () => {
      const response = await fetch(`${CONFIG_API_BASE}/categories`)
      const data = await handleApiResponse<{ data: ConfigCategory[] }>(response)
      return data.data
    },
    ...options,
  })
}

/**
 * Fetch config options
 */
export function useConfigOptions(
  categoryId?: string,
  companyId?: string,
  isActive?: boolean,
  includeInactive?: boolean,
  options?: Omit<UseQueryOptions<ConfigOption[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['config', 'options', categoryId, companyId, isActive, includeInactive],
    queryFn: async () => {
      const params = new URLSearchParams()
      
      if (categoryId) {
        params.append('categoryId', categoryId)
      }
      
      if (companyId) {
        params.append('companyId', companyId)
      }
      
      if (isActive !== undefined) {
        params.append('isActive', isActive.toString())
      }
      
      if (includeInactive !== undefined) {
        params.append('includeInactive', includeInactive.toString())
      }

      const response = await fetch(`${CONFIG_API_BASE}/options?${params.toString()}`)
      const data = await handleApiResponse<{ data: ConfigOption[] }>(response)
      return data.data
    },
    ...options,
  })
}

/**
 * Fetch config option by ID
 */
export function useConfigOption(
  optionId: string,
  options?: Omit<UseQueryOptions<ApiResponse<ConfigOption>>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['config', 'options', optionId],
    queryFn: async () => {
      const response = await fetch(`${CONFIG_API_BASE}/options/${optionId}`)
      return handleApiResponse<ApiResponse<ConfigOption>>(response)
    },
    enabled: !!optionId,
    ...options,
  })
}

/**
 * Fetch config settings
 */
export function useConfigSettings(
  companyId?: string,
  isPublic?: boolean,
  options?: Omit<UseQueryOptions<ConfigSetting[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['config', 'settings', companyId, isPublic],
    queryFn: async () => {
      const params = new URLSearchParams()
      
      if (companyId) {
        params.append('companyId', companyId)
      }
      
      if (isPublic !== undefined) {
        params.append('isPublic', isPublic.toString())
      }

      const response = await fetch(`${CONFIG_API_BASE}/settings?${params.toString()}`)
      const data = await handleApiResponse<{ data: ConfigSetting[] }>(response)
      return data.data
    },
    ...options,
  })
}

/**
 * Fetch config setting by key
 */
export function useConfigSetting(
  key: string,
  options?: Omit<UseQueryOptions<ApiResponse<ConfigSetting>>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['config', 'settings', key],
    queryFn: async () => {
      const response = await fetch(`${CONFIG_API_BASE}/settings/${key}`)
      return handleApiResponse<ApiResponse<ConfigSetting>>(response)
    },
    enabled: !!key,
    ...options,
  })
}

/**
 * Fetch config audit log
 */
export function useConfigAuditLog(
  tableName?: string,
  recordId?: string,
  limit?: number,
  options?: Omit<UseQueryOptions<ConfigAuditLogEntry[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['config', 'audit-log', tableName, recordId, limit],
    queryFn: async () => {
      const params = new URLSearchParams()
      
      if (tableName) {
        params.append('tableName', tableName)
      }
      
      if (recordId) {
        params.append('recordId', recordId)
      }
      
      if (limit !== undefined) {
        params.append('limit', limit.toString())
      }

      const response = await fetch(`${CONFIG_API_BASE}/audit-log?${params.toString()}`)
      const data = await handleApiResponse<{ data: ConfigAuditLogEntry[] }>(response)
      return data.data
    },
    ...options,
  })
}

/**
 * Mutation to create config option
 */
export function useCreateConfigOption(
  options?: UseMutationOptions<ApiResponse<ConfigOption>, Error, any>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`${CONFIG_API_BASE}/options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return handleApiResponse<ApiResponse<ConfigOption>>(response)
    },
    onSuccess: () => {
      // Invalidate config queries
      queryClient.invalidateQueries({ queryKey: ['config'] })
    },
    ...options,
  })
}

/**
 * Mutation to update config option
 */
export function useUpdateConfigOption(
  options?: UseMutationOptions<ApiResponse<ConfigOption>, Error, { id: string; data: any }>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`${CONFIG_API_BASE}/options/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return handleApiResponse<ApiResponse<ConfigOption>>(response)
    },
    onSuccess: () => {
      // Invalidate config queries
      queryClient.invalidateQueries({ queryKey: ['config'] })
    },
    ...options,
  })
}

/**
 * Mutation to delete config option
 */
export function useDeleteConfigOption(
  options?: UseMutationOptions<ApiResponse<null>, Error, string>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${CONFIG_API_BASE}/options/${id}`, {
        method: 'DELETE',
      })
      return handleApiResponse<ApiResponse<null>>(response)
    },
    onSuccess: () => {
      // Invalidate config queries
      queryClient.invalidateQueries({ queryKey: ['config'] })
    },
    ...options,
  })
}

/**
 * Mutation to set config setting
 */
export function useSetConfigSetting(
  options?: UseMutationOptions<ApiResponse<ConfigSetting>, Error, { key: string; data: any }>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ key, data }: { key: string; data: any }) => {
      const response = await fetch(`${CONFIG_API_BASE}/settings/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return handleApiResponse<ApiResponse<ConfigSetting>>(response)
    },
    onSuccess: () => {
      // Invalidate config queries
      queryClient.invalidateQueries({ queryKey: ['config'] })
    },
    ...options,
  })
}
