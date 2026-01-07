"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";
import type {
  User,
  UserWithDetails,
  UserListResponse,
  UserFilters,
  UserPermission,
  UserTerritories,
  UserSession,
  CreateUserInput,
  CreateUserWithRoleInput,
  UpdateUserInput,
  SetUserPermissionsInput,
  SetUserTerritoriesInput,
  ApiResponse,
} from "../types";
import { useUsersStore } from "../stores/users-store";

/**
 * Base API URL for users
 */
const API_BASE = "/api/users";

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
 * Fetch paginated user list
 */
export function useUsers(
  page?: number,
  pageSize?: number,
  filters?: UserFilters,
  options?: Omit<UseQueryOptions<UserListResponse>, "queryKey" | "queryFn">,
) {
  const storePage = useUsersStore((state) => state.pagination.page);
  const storePageSize = useUsersStore((state) => state.pagination.pageSize);
  const storeFilters = useUsersStore((state) => state.filters);
  const setLoading = useUsersStore((state) => state.setLoading);
  const setError = useUsersStore((state) => state.setError);
  const setUsers = useUsersStore((state) => state.setUsers);
  const setPagination = useUsersStore((state) => state.setPagination);

  const currentPage = page ?? storePage;
  const currentPageSize = pageSize ?? storePageSize;
  const currentFilters = filters ?? storeFilters;

  return useQuery({
    queryKey: ["users", currentPage, currentPageSize, currentFilters],
    queryFn: async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          pageSize: currentPageSize.toString(),
        });

        if (currentFilters.isActive !== undefined) {
          params.append("isActive", currentFilters.isActive.toString());
        }

        if (currentFilters.search) {
          params.append("search", currentFilters.search);
        }

        const response = await fetch(`${API_BASE}?${params.toString()}`);
        const data = await handleApiResponse<UserListResponse>(response);

        setUsers(data.data);
        setPagination({
          page: data.meta.page,
          pageSize: data.meta.pageSize,
          total: data.meta.total,
          totalPages: data.meta.totalPages,
        });

        return data;
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Failed to fetch users",
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
 * Fetch single user with details
 */
export function useUser(
  userId: string,
  options?: Omit<
    UseQueryOptions<ApiResponse<UserWithDetails>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: ["users", userId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/${userId}`);
      return handleApiResponse<ApiResponse<UserWithDetails>>(response);
    },
    enabled: !!userId,
    ...options,
  });
}

/**
 * Fetch user permissions
 */
export function useUserPermissions(
  userId: string,
  companyId?: string,
  options?: Omit<
    UseQueryOptions<ApiResponse<UserPermission[]>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: ["users", userId, "permissions", companyId],
    queryFn: async () => {
      const params = companyId ? `?companyId=${companyId}` : "";
      const response = await fetch(
        `${API_BASE}/${userId}/permissions${params}`,
      );
      return handleApiResponse<ApiResponse<UserPermission[]>>(response);
    },
    enabled: !!userId,
    ...options,
  });
}

/**
 * Fetch user territories (areas and branches)
 */
export function useUserTerritories(
  userId: string,
  options?: Omit<
    UseQueryOptions<ApiResponse<UserTerritories>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: ["users", userId, "territories"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/${userId}/territories`);
      return handleApiResponse<ApiResponse<UserTerritories>>(response);
    },
    enabled: !!userId,
    ...options,
  });
}

/**
 * Fetch user sessions
 */
export function useUserSessions(
  userId: string,
  options?: Omit<
    UseQueryOptions<ApiResponse<UserSession[]>>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: ["users", userId, "sessions"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/${userId}/sessions`);
      return handleApiResponse<ApiResponse<UserSession[]>>(response);
    },
    enabled: !!userId,
    ...options,
  });
}

/**
 * Mutation for creating user with role
 */
export function useCreateUserWithRole(
  options?: UseMutationOptions<ApiResponse<User & { role: string }>, Error, CreateUserWithRoleInput>,
) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateUserWithRoleInput) => {
      const response = await fetch(`${API_BASE}/create-with-role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return handleApiResponse<ApiResponse<User & { role: string }>>(response);
    },
    onSuccess: () => {
      // Invalidate users list queries
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    ...options,
  });
}

/**
 * Mutation for creating user (legacy, for backward compatibility)
 */
export function useCreateUser(
  options?: UseMutationOptions<ApiResponse<User>, Error, CreateUserInput>,
) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateUserInput) => {
      const response = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return handleApiResponse<ApiResponse<User>>(response);
    },
    onSuccess: () => {
      // Invalidate users list queries
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    ...options,
  });
}

/**
 * Mutation for updating user
 */
export function useUpdateUser(
  userId: string,
  options?: UseMutationOptions<ApiResponse<User>, Error, UpdateUserInput>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateUserInput) => {
      const response = await fetch(`${API_BASE}/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return handleApiResponse<ApiResponse<User>>(response);
    },
    onSuccess: () => {
      // Invalidate specific user and users list queries
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users", userId] });
    },
    ...options,
  });
}

/**
 * Mutation for toggling user status
 */
export function useToggleUserStatus(
  userId: string,
  options?: UseMutationOptions<ApiResponse<User>, Error, { isActive: boolean }>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { isActive: boolean }) => {
      const response = await fetch(`${API_BASE}/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return handleApiResponse<ApiResponse<User>>(response);
    },
    onSuccess: () => {
      // Invalidate specific user and users list queries
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users", userId] });
    },
    ...options,
  });
}

/**
 * Mutation for setting user permissions
 */
export function useSetUserPermissions(
  userId: string,
  options?: UseMutationOptions<
    ApiResponse<UserPermission[]>,
    Error,
    SetUserPermissionsInput
  >,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SetUserPermissionsInput) => {
      const response = await fetch(`${API_BASE}/${userId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return handleApiResponse<ApiResponse<UserPermission[]>>(response);
    },
    onSuccess: () => {
      // Invalidate user permissions and user details queries
      queryClient.invalidateQueries({ queryKey: ["users", userId] });
      queryClient.invalidateQueries({
        queryKey: ["users", userId, "permissions"],
      });
    },
    ...options,
  });
}

/**
 * Mutation for setting user territories
 */
export function useSetUserTerritories(
  userId: string,
  options?: UseMutationOptions<
    ApiResponse<UserTerritories>,
    Error,
    SetUserTerritoriesInput
  >,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SetUserTerritoriesInput) => {
      const response = await fetch(`${API_BASE}/${userId}/territories`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return handleApiResponse<ApiResponse<UserTerritories>>(response);
    },
    onSuccess: () => {
      // Invalidate user territories and user details queries
      queryClient.invalidateQueries({ queryKey: ["users", userId] });
      queryClient.invalidateQueries({
        queryKey: ["users", userId, "territories"],
      });
    },
    ...options,
  });
}

/**
 * Mutation for revoking a single session
 */
export function useRevokeSession(
  userId: string,
  options?: UseMutationOptions<ApiResponse<UserSession>, Error, string>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(
        `${API_BASE}/${userId}/sessions/${sessionId}`,
        {
          method: "DELETE",
        },
      );
      return handleApiResponse<ApiResponse<UserSession>>(response);
    },
    onSuccess: () => {
      // Invalidate user sessions queries
      queryClient.invalidateQueries({
        queryKey: ["users", userId, "sessions"],
      });
    },
    ...options,
  });
}

/**
 * Mutation for revoking all user sessions
 */
export function useRevokeAllSessions(
  userId: string,
  options?: UseMutationOptions<ApiResponse<UserSession[]>, Error, void>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `${API_BASE}/${userId}/sessions/revoke-all`,
        {
          method: "POST",
        },
      );
      return handleApiResponse<ApiResponse<UserSession[]>>(response);
    },
    onSuccess: () => {
      // Invalidate user sessions queries
      queryClient.invalidateQueries({
        queryKey: ["users", userId, "sessions"],
      });
    },
    ...options,
  });
}
