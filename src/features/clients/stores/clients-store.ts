import { create } from "zustand";
import type { Client, ClientWithDetails, ClientFilters } from "../types";

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
 * Clients store state
 */
export interface ClientsStore {
  // Data
  clients: Client[];
  selectedClientId: string | null;
  selectedClient: ClientWithDetails | null;

  // UI State
  filters: ClientFilters;
  pagination: PaginationState;
  isLoading: boolean;
  error: string | null;

  // Actions
  setClients: (clients: Client[]) => void;
  setSelectedClientId: (clientId: string | null) => void;
  setSelectedClient: (client: ClientWithDetails | null) => void;
  setFilters: (filters: ClientFilters) => void;
  setPagination: (pagination: Partial<PaginationState>) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  clearFilters: () => void;
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
const initialFilters: ClientFilters = {};

/**
 * Clients store using Zustand
 */
export const useClientsStore = create<ClientsStore>((set) => ({
  // Initial state
  clients: [],
  selectedClientId: null,
  selectedClient: null,
  filters: initialFilters,
  pagination: initialPagination,
  isLoading: false,
  error: null,

  // Actions
  setClients: (clients) => set({ clients }),

  setSelectedClientId: (clientId) => set({ selectedClientId: clientId }),

  setSelectedClient: (client) => set({ selectedClient: client }),

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
      clients: [],
      selectedClientId: null,
      selectedClient: null,
      filters: initialFilters,
      pagination: initialPagination,
      isLoading: false,
      error: null,
    }),

  clearFilters: () =>
    set((state) => ({
      filters: initialFilters,
      pagination: { ...state.pagination, page: 1 },
    })),
}));
