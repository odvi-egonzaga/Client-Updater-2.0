import { create } from 'zustand'
import type { Branch, BranchFilters } from '../types'

/**
 * Pagination state
 */
export interface PaginationState {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

/**
 * Branches store state
 */
export interface BranchesStore {
  // Data
  branches: Branch[]
  selectedBranchId: string | null
  selectedBranch: Branch | null
  
  // UI State
  filters: BranchFilters
  pagination: PaginationState
  isLoading: boolean
  error: string | null
  
  // Actions
  setBranches: (branches: Branch[]) => void
  setSelectedBranchId: (branchId: string | null) => void
  setSelectedBranch: (branch: Branch | null) => void
  setFilters: (filters: BranchFilters) => void
  setPagination: (pagination: Partial<PaginationState>) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
  clearFilters: () => void
}

/**
 * Initial pagination state
 */
const initialPagination: PaginationState = {
  page: 1,
  pageSize: 25,
  total: 0,
  totalPages: 0,
}

/**
 * Initial filters state
 */
const initialFilters: BranchFilters = {}

/**
 * Branches store using Zustand
 */
export const useBranchesStore = create<BranchesStore>((set) => ({
  // Initial state
  branches: [],
  selectedBranchId: null,
  selectedBranch: null,
  filters: initialFilters,
  pagination: initialPagination,
  isLoading: false,
  error: null,
  
  // Actions
  setBranches: (branches) => set({ branches }),
  
  setSelectedBranchId: (branchId) => set({ selectedBranchId: branchId }),
  
  setSelectedBranch: (branch) => set({ selectedBranch: branch }),
  
  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters },
    pagination: { ...state.pagination, page: 1 }, // Reset to first page on filter change
  })),
  
  setPagination: (pagination) => set((state) => ({
    pagination: { ...state.pagination, ...pagination },
  })),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),
  
  reset: () => set({
    branches: [],
    selectedBranchId: null,
    selectedBranch: null,
    filters: initialFilters,
    pagination: initialPagination,
    isLoading: false,
    error: null,
  }),
  
  clearFilters: () => set((state) => ({
    filters: initialFilters,
    pagination: { ...state.pagination, page: 1 },
  })),
}))
