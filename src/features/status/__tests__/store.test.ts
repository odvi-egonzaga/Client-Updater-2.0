import { describe, it, expect, beforeEach } from "vitest";
import { useStatusStore } from "../stores/status-store";
import type { PeriodFilter, ClientPeriodStatus } from "../types";

describe("Status store", () => {
  beforeEach(() => {
    // Reset store before each test
    useStatusStore.getState().reset();
  });

  describe("Initial state", () => {
    it("should have correct initial state", () => {
      const state = useStatusStore.getState();

      expect(state.currentPeriod.periodType).toBe("monthly");
      expect(state.currentPeriod.periodYear).toBe(new Date().getFullYear());
      expect(state.currentPeriod.periodMonth).toBe(new Date().getMonth() + 1);
      expect(state.currentPeriod.periodQuarter).toBeNull();
      expect(state.selectedClientStatus).toBeNull();
      expect(state.isUpdateDialogOpen).toBe(false);
      expect(state.isBulkUpdateMode).toBe(false);
      expect(state.selectedClientIds).toBeInstanceOf(Set);
      expect(state.selectedClientIds.size).toBe(0);
    });
  });

  describe("setCurrentPeriod", () => {
    it("should update current period", () => {
      const newPeriod: PeriodFilter = {
        periodType: "quarterly",
        periodYear: 2024,
        periodMonth: null,
        periodQuarter: 2,
      };

      useStatusStore.getState().setCurrentPeriod(newPeriod);

      const state = useStatusStore.getState();
      expect(state.currentPeriod).toEqual(newPeriod);
    });
  });

  describe("setSelectedClientStatus", () => {
    it("should set selected client status", () => {
      const mockClientStatus: ClientPeriodStatus = {
        id: "123",
        clientId: "456",
        periodType: "monthly",
        periodYear: 2024,
        periodMonth: 1,
        periodQuarter: null,
        status: {
          id: "789",
          name: "Active",
          code: "ACTIVE",
          requiresRemarks: false,
          isTerminal: false,
          workflowOrder: 1,
        },
        reason: null,
        remarks: null,
        hasPayment: true,
        updateCount: 5,
        isTerminal: false,
        updatedBy: {
          id: "012",
          name: "John Doe",
        },
        updatedAt: "2024-01-01T00:00:00Z",
      };

      useStatusStore.getState().setSelectedClientStatus(mockClientStatus);

      const state = useStatusStore.getState();
      expect(state.selectedClientStatus).toEqual(mockClientStatus);
    });

    it("should clear selected client status", () => {
      useStatusStore.getState().setSelectedClientStatus(null);

      const state = useStatusStore.getState();
      expect(state.selectedClientStatus).toBeNull();
    });
  });

  describe("openUpdateDialog", () => {
    it("should open update dialog", () => {
      useStatusStore.getState().openUpdateDialog();

      const state = useStatusStore.getState();
      expect(state.isUpdateDialogOpen).toBe(true);
    });
  });

  describe("closeUpdateDialog", () => {
    it("should close update dialog", () => {
      useStatusStore.getState().openUpdateDialog();
      expect(useStatusStore.getState().isUpdateDialogOpen).toBe(true);

      useStatusStore.getState().closeUpdateDialog();

      const state = useStatusStore.getState();
      expect(state.isUpdateDialogOpen).toBe(false);
    });
  });

  describe("setBulkUpdateMode", () => {
    it("should enable bulk update mode", () => {
      useStatusStore.getState().setBulkUpdateMode(true);

      const state = useStatusStore.getState();
      expect(state.isBulkUpdateMode).toBe(true);
      expect(state.selectedClientIds.size).toBe(0);
    });

    it("should disable bulk update mode", () => {
      useStatusStore.getState().setBulkUpdateMode(true);
      expect(useStatusStore.getState().isBulkUpdateMode).toBe(true);

      useStatusStore.getState().setBulkUpdateMode(false);

      const state = useStatusStore.getState();
      expect(state.isBulkUpdateMode).toBe(false);
      expect(state.selectedClientIds.size).toBe(0);
    });

    it("should clear selected client ids when enabling bulk update mode", () => {
      useStatusStore.getState().toggleClientSelection("client1");
      useStatusStore.getState().toggleClientSelection("client2");
      expect(useStatusStore.getState().selectedClientIds.size).toBe(2);

      useStatusStore.getState().setBulkUpdateMode(true);

      const state = useStatusStore.getState();
      expect(state.selectedClientIds.size).toBe(0);
    });
  });

  describe("toggleClientSelection", () => {
    it("should add client to selection", () => {
      useStatusStore.getState().toggleClientSelection("client1");

      const state = useStatusStore.getState();
      expect(state.selectedClientIds.has("client1")).toBe(true);
      expect(state.selectedClientIds.size).toBe(1);
    });

    it("should remove client from selection", () => {
      useStatusStore.getState().toggleClientSelection("client1");
      expect(useStatusStore.getState().selectedClientIds.has("client1")).toBe(
        true,
      );

      useStatusStore.getState().toggleClientSelection("client1");

      const state = useStatusStore.getState();
      expect(state.selectedClientIds.has("client1")).toBe(false);
      expect(state.selectedClientIds.size).toBe(0);
    });

    it("should handle multiple clients", () => {
      useStatusStore.getState().toggleClientSelection("client1");
      useStatusStore.getState().toggleClientSelection("client2");
      useStatusStore.getState().toggleClientSelection("client3");

      const state = useStatusStore.getState();
      expect(state.selectedClientIds.size).toBe(3);
      expect(state.selectedClientIds.has("client1")).toBe(true);
      expect(state.selectedClientIds.has("client2")).toBe(true);
      expect(state.selectedClientIds.has("client3")).toBe(true);
    });
  });

  describe("clearClientSelection", () => {
    it("should clear all selected clients", () => {
      useStatusStore.getState().toggleClientSelection("client1");
      useStatusStore.getState().toggleClientSelection("client2");
      useStatusStore.getState().toggleClientSelection("client3");
      expect(useStatusStore.getState().selectedClientIds.size).toBe(3);

      useStatusStore.getState().clearClientSelection();

      const state = useStatusStore.getState();
      expect(state.selectedClientIds.size).toBe(0);
    });
  });

  describe("reset", () => {
    it("should reset store to initial state", () => {
      // Modify state
      const newPeriod: PeriodFilter = {
        periodType: "quarterly",
        periodYear: 2025,
        periodMonth: null,
        periodQuarter: 3,
      };
      useStatusStore.getState().setCurrentPeriod(newPeriod);
      useStatusStore.getState().openUpdateDialog();
      useStatusStore.getState().setBulkUpdateMode(true);
      useStatusStore.getState().toggleClientSelection("client1");

      // Verify state is modified
      expect(useStatusStore.getState().isUpdateDialogOpen).toBe(true);
      expect(useStatusStore.getState().isBulkUpdateMode).toBe(true);
      expect(useStatusStore.getState().selectedClientIds.size).toBe(1);

      // Reset state
      useStatusStore.getState().reset();

      // Verify state is reset
      const state = useStatusStore.getState();
      expect(state.currentPeriod.periodType).toBe("monthly");
      expect(state.selectedClientStatus).toBeNull();
      expect(state.isUpdateDialogOpen).toBe(false);
      expect(state.isBulkUpdateMode).toBe(false);
      expect(state.selectedClientIds.size).toBe(0);
    });
  });

  describe("State persistence", () => {
    it("should maintain state across multiple operations", () => {
      const newPeriod: PeriodFilter = {
        periodType: "quarterly",
        periodYear: 2024,
        periodMonth: null,
        periodQuarter: 1,
      };

      useStatusStore.getState().setCurrentPeriod(newPeriod);
      useStatusStore.getState().openUpdateDialog();
      useStatusStore.getState().toggleClientSelection("client1");
      useStatusStore.getState().toggleClientSelection("client2");

      const state = useStatusStore.getState();
      expect(state.currentPeriod).toEqual(newPeriod);
      expect(state.isUpdateDialogOpen).toBe(true);
      expect(state.selectedClientIds.size).toBe(2);
    });
  });
});
