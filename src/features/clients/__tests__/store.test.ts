import { describe, it, expect, beforeEach } from "vitest";
import { useClientsStore } from "../stores/clients-store";

describe("useClientsStore", () => {
  beforeEach(() => {
    // Reset store state before each test
    useClientsStore.getState().reset();
  });

  describe("initial state", () => {
    it("should have initial state with empty clients array", () => {
      const state = useClientsStore.getState();
      expect(state.clients).toEqual([]);
    });

    it("should have initial state with null selectedClientId", () => {
      const state = useClientsStore.getState();
      expect(state.selectedClientId).toBeNull();
    });

    it("should have initial state with null selectedClient", () => {
      const state = useClientsStore.getState();
      expect(state.selectedClient).toBeNull();
    });

    it("should have initial state with empty filters", () => {
      const state = useClientsStore.getState();
      expect(state.filters).toEqual({});
    });

    it("should have initial pagination state", () => {
      const state = useClientsStore.getState();
      expect(state.pagination).toEqual({
        page: 1,
        pageSize: 25,
        total: 0,
        totalPages: 0,
      });
    });

    it("should have initial loading state as false", () => {
      const state = useClientsStore.getState();
      expect(state.isLoading).toBe(false);
    });

    it("should have initial error state as null", () => {
      const state = useClientsStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe("setClients action", () => {
    it("should set clients array", () => {
      const { setClients } = useClientsStore.getState();
      const clients = [
        {
          id: "1",
          clientCode: "CLIENT001",
          fullName: "John Doe",
          pensionNumber: "PEN123",
          birthDate: new Date("1990-01-01"),
          contactNumber: "1234567890",
          contactNumberAlt: null,
          pensionTypeId: "pension-type-1",
          pensionerTypeId: "pensioner-type-1",
          productId: "product-1",
          branchId: "branch-1",
          parStatusId: "par-status-1",
          accountTypeId: "account-type-1",
          pastDueAmount: "1000.00",
          loanStatus: "active",
          isActive: true,
          lastSyncedAt: new Date(),
          syncSource: "snowflake" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];

      setClients(clients);

      const state = useClientsStore.getState();
      expect(state.clients).toEqual(clients);
      expect(state.clients).toHaveLength(1);
    });

    it("should replace existing clients", () => {
      const { setClients } = useClientsStore.getState();

      // Set initial clients
      setClients([
        {
          id: "1",
          clientCode: "CLIENT001",
          fullName: "John Doe",
          pensionNumber: "PEN123",
          birthDate: new Date("1990-01-01"),
          contactNumber: "1234567890",
          contactNumberAlt: null,
          pensionTypeId: "pension-type-1",
          pensionerTypeId: "pensioner-type-1",
          productId: "product-1",
          branchId: "branch-1",
          parStatusId: "par-status-1",
          accountTypeId: "account-type-1",
          pastDueAmount: "1000.00",
          loanStatus: "active",
          isActive: true,
          lastSyncedAt: new Date(),
          syncSource: "snowflake" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ]);

      // Replace with new clients
      const newClients = [
        {
          id: "2",
          clientCode: "CLIENT002",
          fullName: "Jane Smith",
          pensionNumber: "PEN456",
          birthDate: new Date("1995-05-15"),
          contactNumber: "0987654321",
          contactNumberAlt: null,
          pensionTypeId: "pension-type-2",
          pensionerTypeId: "pensioner-type-2",
          productId: "product-2",
          branchId: "branch-2",
          parStatusId: "par-status-2",
          accountTypeId: "account-type-2",
          pastDueAmount: "2000.00",
          loanStatus: "inactive",
          isActive: true,
          lastSyncedAt: new Date(),
          syncSource: "snowflake" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];

      setClients(newClients);

      const state = useClientsStore.getState();
      expect(state.clients).toEqual(newClients);
      expect(state.clients).toHaveLength(1);
      expect(state.clients[0]?.id).toBe("2");
    });
  });

  describe("setSelectedClientId action", () => {
    it("should set selectedClientId", () => {
      const { setSelectedClientId } = useClientsStore.getState();
      setSelectedClientId("client-123");

      const state = useClientsStore.getState();
      expect(state.selectedClientId).toBe("client-123");
    });

    it("should set selectedClientId to null", () => {
      const { setSelectedClientId } = useClientsStore.getState();

      // First set a client ID
      setSelectedClientId("client-123");

      // Then set to null
      setSelectedClientId(null);

      const state = useClientsStore.getState();
      expect(state.selectedClientId).toBeNull();
    });
  });

  describe("setSelectedClient action", () => {
    it("should set selectedClient", () => {
      const { setSelectedClient } = useClientsStore.getState();
      const client = {
        id: "1",
        clientCode: "CLIENT001",
        fullName: "John Doe",
        pensionNumber: "PEN123",
        birthDate: new Date("1990-01-01"),
        contactNumber: "1234567890",
        contactNumberAlt: null,
        pensionTypeId: "pension-type-1",
        pensionerTypeId: "pensioner-type-1",
        productId: "product-1",
        branchId: "branch-1",
        parStatusId: "par-status-1",
        accountTypeId: "account-type-1",
        pastDueAmount: "1000.00",
        loanStatus: "active",
        isActive: true,
        lastSyncedAt: new Date(),
        syncSource: "snowflake" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        pensionType: {
          id: "pension-type-1",
          code: "PT001",
          name: "Pension Type 1",
        },
        pensionerType: {
          id: "pensioner-type-1",
          code: "PET001",
          name: "Pensioner Type 1",
        },
        product: {
          id: "product-1",
          code: "PRD001",
          name: "Product 1",
        },
        branch: {
          id: "branch-1",
          code: "BR001",
          name: "Branch 1",
          location: "Location 1",
          category: "Category 1",
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        parStatus: {
          id: "par-status-1",
          code: "PAR001",
          name: "PAR Status 1",
        },
        accountType: {
          id: "account-type-1",
          code: "AT001",
          name: "Account Type 1",
        },
        currentStatus: {
          id: "status-1",
          statusTypeId: "status-type-1",
          reasonId: "reason-1",
          remarks: "Test remarks",
          hasPayment: true,
          updatedAt: new Date(),
        },
      };

      setSelectedClient(client);

      const state = useClientsStore.getState();
      expect(state.selectedClient).toEqual(client);
    });

    it("should set selectedClient to null", () => {
      const { setSelectedClient } = useClientsStore.getState();

      // First set a client
      setSelectedClient({
        id: "1",
        clientCode: "CLIENT001",
        fullName: "John Doe",
        pensionNumber: "PEN123",
        birthDate: new Date("1990-01-01"),
        contactNumber: "1234567890",
        contactNumberAlt: null,
        pensionTypeId: "pension-type-1",
        pensionerTypeId: "pensioner-type-1",
        productId: "product-1",
        branchId: "branch-1",
        parStatusId: "par-status-1",
        accountTypeId: "account-type-1",
        pastDueAmount: "1000.00",
        loanStatus: "active",
        isActive: true,
        lastSyncedAt: new Date(),
        syncSource: "snowflake" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        pensionType: {
          id: "pension-type-1",
          code: "PT001",
          name: "Pension Type 1",
        },
        pensionerType: {
          id: "pensioner-type-1",
          code: "PET001",
          name: "Pensioner Type 1",
        },
        product: {
          id: "product-1",
          code: "PRD001",
          name: "Product 1",
        },
        branch: {
          id: "branch-1",
          code: "BR001",
          name: "Branch 1",
          location: "Location 1",
          category: "Category 1",
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        parStatus: {
          id: "par-status-1",
          code: "PAR001",
          name: "PAR Status 1",
        },
        accountType: {
          id: "account-type-1",
          code: "AT001",
          name: "Account Type 1",
        },
        currentStatus: {
          id: "status-1",
          statusTypeId: "status-type-1",
          reasonId: "reason-1",
          remarks: "Test remarks",
          hasPayment: true,
          updatedAt: new Date(),
        },
      });

      // Then set to null
      setSelectedClient(null);

      const state = useClientsStore.getState();
      expect(state.selectedClient).toBeNull();
    });
  });

  describe("setFilters action", () => {
    it("should set filters", () => {
      const { setFilters } = useClientsStore.getState();
      const filters = {
        pensionTypeId: "pension-type-1",
        isActive: true,
        search: "john",
      };

      setFilters(filters);

      const state = useClientsStore.getState();
      expect(state.filters).toEqual(filters);
    });

    it("should merge filters with existing filters", () => {
      const { setFilters } = useClientsStore.getState();

      // Set initial filters
      setFilters({ pensionTypeId: "pension-type-1" });

      // Add more filters
      setFilters({ isActive: true, search: "john" });

      const state = useClientsStore.getState();
      expect(state.filters).toEqual({
        pensionTypeId: "pension-type-1",
        isActive: true,
        search: "john",
      });
    });

    it("should reset page to 1 when filters change", () => {
      const { setFilters, setPagination } = useClientsStore.getState();

      // Set page to 5
      setPagination({ page: 5 });

      // Change filters
      setFilters({ isActive: true });

      const state = useClientsStore.getState();
      expect(state.pagination.page).toBe(1);
    });
  });

  describe("setPagination action", () => {
    it("should set pagination", () => {
      const { setPagination } = useClientsStore.getState();
      const pagination = {
        page: 2,
        pageSize: 50,
        total: 100,
        totalPages: 2,
      };

      setPagination(pagination);

      const state = useClientsStore.getState();
      expect(state.pagination).toEqual(pagination);
    });

    it("should merge pagination with existing pagination", () => {
      const { setPagination } = useClientsStore.getState();

      // Set initial pagination
      setPagination({ page: 2, pageSize: 50 });

      // Update total and totalPages
      setPagination({ total: 100, totalPages: 2 });

      const state = useClientsStore.getState();
      expect(state.pagination).toEqual({
        page: 2,
        pageSize: 50,
        total: 100,
        totalPages: 2,
      });
    });
  });

  describe("setLoading action", () => {
    it("should set loading to true", () => {
      const { setLoading } = useClientsStore.getState();
      setLoading(true);

      const state = useClientsStore.getState();
      expect(state.isLoading).toBe(true);
    });

    it("should set loading to false", () => {
      const { setLoading } = useClientsStore.getState();
      setLoading(true);
      setLoading(false);

      const state = useClientsStore.getState();
      expect(state.isLoading).toBe(false);
    });
  });

  describe("setError action", () => {
    it("should set error message", () => {
      const { setError } = useClientsStore.getState();
      const errorMessage = "Failed to fetch clients";
      setError(errorMessage);

      const state = useClientsStore.getState();
      expect(state.error).toBe(errorMessage);
    });

    it("should set error to null", () => {
      const { setError } = useClientsStore.getState();
      setError("Error message");
      setError(null);

      const state = useClientsStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe("reset action", () => {
    it("should reset all state to initial values", () => {
      const store = useClientsStore.getState();

      // Set various state values
      store.setClients([
        {
          id: "1",
          clientCode: "CLIENT001",
          fullName: "John Doe",
          pensionNumber: "PEN123",
          birthDate: new Date("1990-01-01"),
          contactNumber: "1234567890",
          contactNumberAlt: null,
          pensionTypeId: "pension-type-1",
          pensionerTypeId: "pensioner-type-1",
          productId: "product-1",
          branchId: "branch-1",
          parStatusId: "par-status-1",
          accountTypeId: "account-type-1",
          pastDueAmount: "1000.00",
          loanStatus: "active",
          isActive: true,
          lastSyncedAt: new Date(),
          syncSource: "snowflake" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ]);
      store.setSelectedClientId("client-123");
      store.setSelectedClient({
        id: "1",
        clientCode: "CLIENT001",
        fullName: "John Doe",
        pensionNumber: "PEN123",
        birthDate: new Date("1990-01-01"),
        contactNumber: "1234567890",
        contactNumberAlt: null,
        pensionTypeId: "pension-type-1",
        pensionerTypeId: "pensioner-type-1",
        productId: "product-1",
        branchId: "branch-1",
        parStatusId: "par-status-1",
        accountTypeId: "account-type-1",
        pastDueAmount: "1000.00",
        loanStatus: "active",
        isActive: true,
        lastSyncedAt: new Date(),
        syncSource: "snowflake" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        pensionType: {
          id: "pension-type-1",
          code: "PT001",
          name: "Pension Type 1",
        },
        pensionerType: {
          id: "pensioner-type-1",
          code: "PET001",
          name: "Pensioner Type 1",
        },
        product: {
          id: "product-1",
          code: "PRD001",
          name: "Product 1",
        },
        branch: {
          id: "branch-1",
          code: "BR001",
          name: "Branch 1",
          location: "Location 1",
          category: "Category 1",
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        parStatus: {
          id: "par-status-1",
          code: "PAR001",
          name: "PAR Status 1",
        },
        accountType: {
          id: "account-type-1",
          code: "AT001",
          name: "Account Type 1",
        },
        currentStatus: {
          id: "status-1",
          statusTypeId: "status-type-1",
          reasonId: "reason-1",
          remarks: "Test remarks",
          hasPayment: true,
          updatedAt: new Date(),
        },
      });
      store.setFilters({ isActive: true });
      store.setPagination({ page: 5 });
      store.setLoading(true);
      store.setError("Error message");

      // Reset state
      store.reset();

      const state = useClientsStore.getState();
      expect(state.clients).toEqual([]);
      expect(state.selectedClientId).toBeNull();
      expect(state.selectedClient).toBeNull();
      expect(state.filters).toEqual({});
      expect(state.pagination).toEqual({
        page: 1,
        pageSize: 25,
        total: 0,
        totalPages: 0,
      });
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe("clearFilters action", () => {
    it("should clear all filters and reset page to 1", () => {
      const { setFilters, setPagination, clearFilters } =
        useClientsStore.getState();

      // Set filters and page
      setFilters({
        pensionTypeId: "pension-type-1",
        isActive: true,
        search: "john",
      });
      setPagination({ page: 5 });

      // Clear filters
      clearFilters();

      const state = useClientsStore.getState();
      expect(state.filters).toEqual({});
      expect(state.pagination.page).toBe(1);
    });
  });

  describe("state consistency", () => {
    it("should maintain state consistency across multiple store accesses", () => {
      const state1 = useClientsStore.getState();
      const state2 = useClientsStore.getState();

      expect(state1.clients).toBe(state2.clients);
      expect(state1.selectedClientId).toBe(state2.selectedClientId);
      expect(state1.selectedClient).toBe(state2.selectedClient);
      expect(state1.filters).toBe(state2.filters);
      expect(state1.pagination).toBe(state2.pagination);
      expect(state1.isLoading).toBe(state2.isLoading);
      expect(state1.error).toBe(state2.error);
    });
  });
});
