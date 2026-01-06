import { create } from 'zustand'
import type { Area, AreaFilters } from '../types'

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
 * Areas store state
 */
export interface AreasStore {
  // Data
  areas: Area[]
  selectedAreaId: string | null
  selectedArea: Area | null
  
  // UI State
  filters: AreaFilters
  pagination: PaginationState
  isLoading: boolean
  error: string | null
  
  // Actions
  setAreas: (areas: Area[]) => void
  setSelectedAreaId: (areaId: string | null) => void
  setSelectedArea: (area: Area | null) => void
  setFilters: (filters: AreaFilters) => void
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
const initialFilters: AreaFilters = {}

/**
 * Areas store using Zustand
 */
export const useAreasStore = create<AreasStore>((set) => ({
  // Initial state
  areas: [],
  selectedAreaId: null,
  selectedArea: null,
  filters: initialFilters,
  pagination: initialPagination,
  isLoading: false,
  error: null,
  
  // Actions
  setAreas: (areas) => set({ areas }),
  
  setSelectedAreaId: (areaId) => set({ selectedAreaId: areaId }),
  
  setSelectedArea: (area) => set({ selectedArea: area }),
  
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
    areas: [],
    selectedAreaId: null,
    selectedArea: null,
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
