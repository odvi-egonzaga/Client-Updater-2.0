import { create } from 'zustand'
import type { StatusStoreState, PeriodFilter } from '../types'

/**
 * Initial state for the status store
 */
const initialState = {
  currentPeriod: {
    periodType: 'monthly' as const,
    periodYear: new Date().getFullYear(),
    periodMonth: new Date().getMonth() + 1,
    periodQuarter: null,
  },
  selectedClientStatus: null,
  isUpdateDialogOpen: false,
  isBulkUpdateMode: false,
  selectedClientIds: new Set<string>(),
}

/**
 * Status store using Zustand
 */
export const useStatusStore = create<StatusStoreState>((set) => ({
  ...initialState,

  setCurrentPeriod: (period: PeriodFilter) => set({ currentPeriod: period }),

  setSelectedClientStatus: (status) => set({ selectedClientStatus: status }),

  openUpdateDialog: () => set({ isUpdateDialogOpen: true }),
  closeUpdateDialog: () => set({ isUpdateDialogOpen: false }),

  setBulkUpdateMode: (enabled) =>
    set({ isBulkUpdateMode: enabled, selectedClientIds: new Set() }),

  toggleClientSelection: (clientId) =>
    set((state) => {
      const newSelected = new Set(state.selectedClientIds)
      if (newSelected.has(clientId)) {
        newSelected.delete(clientId)
      } else {
        newSelected.add(clientId)
      }
      return { selectedClientIds: newSelected }
    }),

  clearClientSelection: () => set({ selectedClientIds: new Set() }),

  reset: () => set(initialState),
}))
