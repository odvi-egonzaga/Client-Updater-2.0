import { create } from "zustand";

interface HealthStore {
  counter: number;
  increment: () => void;
  reset: () => void;
}

export const useHealthStore = create<HealthStore>((set) => ({
  counter: 0,
  increment: () => set((state) => ({ counter: state.counter + 1 })),
  reset: () => set({ counter: 0 }),
}));
