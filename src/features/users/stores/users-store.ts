import { create } from "zustand";
import type { User, UserWithDetails, UserFilters } from "../types";

/**
 * Pagination state
 */
export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * Users store state
 */
export interface UsersStore {
  // Data
  users: User[];
  selectedUser: UserWithDetails | null;

  // UI State
  filters: UserFilters;
  pagination: PaginationState;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUsers: (users: User[]) => void;
  setSelectedUser: (user: UserWithDetails | null) => void;
  setFilters: (filters: UserFilters) => void;
  setPagination: (pagination: Partial<PaginationState>) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

/**
 * Initial pagination state
 */
const initialPagination: PaginationState = {
  page: 1,
  pageSize: 25,
  total: 0,
  totalPages: 0,
};

/**
 * Initial filters state
 */
const initialFilters: UserFilters = {};

/**
 * Users store using Zustand
 */
export const useUsersStore = create<UsersStore>((set) => ({
  // Initial state
  users: [],
  selectedUser: null,
  filters: initialFilters,
  pagination: initialPagination,
  isLoading: false,
  error: null,

  // Actions
  setUsers: (users) => set({ users }),

  setSelectedUser: (user) => set({ selectedUser: user }),

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
      pagination: { ...state.pagination, page: 1 }, // Reset to first page on filter change
    })),

  setPagination: (pagination) =>
    set((state) => ({
      pagination: { ...state.pagination, ...pagination },
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  reset: () =>
    set({
      users: [],
      selectedUser: null,
      filters: initialFilters,
      pagination: initialPagination,
      isLoading: false,
      error: null,
    }),
}));
