import { create } from 'zustand'

/**
 * Config store state
 */
export interface ConfigStore {
  // UI State
  activeTab: string
  selectedCategoryId: string | null
  isLoading: boolean
  error: string | null
  
  // Actions
  setActiveTab: (tab: string) => void
  setSelectedCategoryId: (categoryId: string | null) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

/**
 * Initial state
 */
const initialState = {
  activeTab: 'options',
  selectedCategoryId: null,
  isLoading: false,
  error: null,
}

/**
 * Config store using Zustand
 */
export const useConfigStore = create<ConfigStore>((set) => ({
  // Initial state
  ...initialState,
  
  // Actions
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  setSelectedCategoryId: (categoryId) => set({ selectedCategoryId: categoryId }),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),
  
  reset: () => set(initialState),
}))
