"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";
import type {
  Client,
  ClientWithDetails,
  ClientListResponse,
  ClientFilters,
  ClientSearchResult,
  ClientSyncHistory,
  SyncJob,
  TriggerSyncInput,
  ApiResponse,
} from "../types";
import { useClientsStore } from "../stores/clients-store";
import { useDebounce } from "@/hooks/utils/use-debounce";

/**
 * Base API URL for clients
 */
const CLIENTS_API_BASE = "/api/clients";
const SYNC_API_BASE = "/api/sync";

/**
 * Helper function to handle API errors
 */
async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "API request failed");
  }
  return response.json();
}

/**
 * Fetch paginated client list
 */
export function useClients(
  page?: number,
  pageSize?: number,
  filters?: ClientFilters,
  options?: Omit<UseQueryOptions<ClientListResponse>, "queryKey" | "queryFn">,
) {
  const storePage = useClientsStore((state) => state.pagination.page);
  const storePageSize = useClientsStore((state) => state.pagination.pageSize);
  const storeFilters = useClientsStore((state) => state.filters);
  const setLoading = useClientsStore((state) => state.setLoading);
  const setError = useClientsStore((state) => state.setError);
  const setClients = useClientsStore((state) => state.setClients);
  const setPagination = useClientsStore((state) => state.setPagination);

  const currentPage = page ?? storePage;
  const currentPageSize = pageSize ?? storePageSize;
  const currentFilters = filters ?? storeFilters;

  return useQuery({
    queryKey: ["clients", currentPage, currentPageSize, currentFilters],
    queryFn: async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          pageSize: currentPageSize.toString(),
        });

        if (currentFilters.pensionTypeId) {
          params.append("pensionTypeId", currentFilters.pensionTypeId);
        }

        if (currentFilters.pensionerTypeId) {
          params.append("pensionerTypeId", currentFilters.pensionerTypeId);
        }

        if (currentFilters.productId) {
          params.append("productId", currentFilters.productId);
        }

        if (currentFilters.parStatusId) {
          params.append("parStatusId", currentFilters.parStatusId);
        }

        if (currentFilters.accountTypeId) {
          params.append("accountTypeId", currentFilters.accountTypeId);
        }

        if (currentFilters.isActive !== undefined) {
          params.append("isActive", currentFilters.isActive.toString());
        }

        if (currentFilters.search) {
          params.append("search", currentFilters.search);
        }

        const response = await fetch(
          `${CLIENTS_API_BASE}?${params.toString()}`,
        );
        const data = await handleApiResponse<ClientListResponse>(response);

        setClients(data.data);
        setPagination({
          page: data.meta.page,
          pageSize: data.meta.pageSize,
          total: data.meta.total,
          totalPages: data.meta.totalPages,
        });

        return data;
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Failed to fetch clients",
        );
        throw error;
      } finally {
        setLoading(false);
      }
    },
    ...options,
  });
}

/**
 * Fetch single client with details
 */
export function useClient(
  clientId: string,
  options?: Omit<
    UseQueryOptions<ApiResponse<ClientWithDetails>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: ["clients", clientId],
    queryFn: async () => {
      const response = await fetch(`${CLIENTS_API_BASE}/${clientId}`);
      return handleApiResponse<ApiResponse<ClientWithDetails>>(response);
    },
    enabled: !!clientId,
    ...options,
  });
}

/**
 * Fetch client sync history
 */
export function useClientSyncHistory(
  clientId: string,
  options?: Omit<
    UseQueryOptions<ApiResponse<ClientSyncHistory[]>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: ["clients", clientId, "sync-history"],
    queryFn: async () => {
      const response = await fetch(
        `${CLIENTS_API_BASE}/${clientId}/sync-history`,
      );
      return handleApiResponse<ApiResponse<ClientSyncHistory[]>>(response);
    },
    enabled: !!clientId,
    ...options,
  });
}

/**
 * Autocomplete search for clients (debounced)
 */
export function useClientSearch(
  query: string,
  enabled: boolean = true,
  options?: Omit<
    UseQueryOptions<ApiResponse<ClientSearchResult[]>>,
    "queryKey" | "queryFn"
  >,
) {
  const debouncedQuery = useDebounce(query, 300);

  return useQuery({
    queryKey: ["clients", "search", debouncedQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        q: debouncedQuery,
        limit: "10",
      });

      const response = await fetch(
        `${CLIENTS_API_BASE}/search?${params.toString()}`,
      );
      return handleApiResponse<ApiResponse<ClientSearchResult[]>>(response);
    },
    enabled: enabled && debouncedQuery.length >= 2,
    ...options,
  });
}

/**
 * List sync jobs with 10s refetch interval
 */
export function useSyncJobs(
  options?: Omit<
    UseQueryOptions<ApiResponse<SyncJob[]>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: ["sync", "jobs"],
    queryFn: async () => {
      const response = await fetch(`${SYNC_API_BASE}/jobs`);
      return handleApiResponse<ApiResponse<SyncJob[]>>(response);
    },
    refetchInterval: 10000, // Refetch every 10 seconds
    ...options,
  });
}

/**
 * Single sync job with 2s refetch while processing
 */
export function useSyncJob(
  jobId: string,
  options?: Omit<UseQueryOptions<ApiResponse<SyncJob>>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: ["sync", "jobs", jobId],
    queryFn: async () => {
      const response = await fetch(`${SYNC_API_BASE}/jobs/${jobId}`);
      return handleApiResponse<ApiResponse<SyncJob>>(response);
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      // Refetch every 2 seconds while processing
      const data = query.state.data as ApiResponse<SyncJob> | undefined;
      if (
        data?.data?.status === "processing" ||
        data?.data?.status === "pending"
      ) {
        return 2000;
      }
      return false; // Stop refetching when completed or failed
    },
    ...options,
  });
}

/**
 * Mutation to trigger sync
 */
export function useTriggerSync(
  options?: UseMutationOptions<ApiResponse<any>, Error, TriggerSyncInput>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TriggerSyncInput) => {
      const response = await fetch(`${SYNC_API_BASE}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return handleApiResponse<ApiResponse<any>>(response);
    },
    onSuccess: () => {
      // Invalidate sync jobs queries
      queryClient.invalidateQueries({ queryKey: ["sync", "jobs"] });
      // Invalidate clients queries to reflect any changes
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    ...options,
  });
}

/**
 * Mutation to preview sync (dry run)
 */
export function usePreviewSync(
  options?: UseMutationOptions<ApiResponse<any[]>, Error, TriggerSyncInput>,
) {
  return useMutation({
    mutationFn: async (data: TriggerSyncInput) => {
      const response = await fetch(`${SYNC_API_BASE}/jobs/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return handleApiResponse<ApiResponse<any[]>>(response);
    },
    ...options,
  });
}
