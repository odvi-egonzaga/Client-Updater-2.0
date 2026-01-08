import { describe, it, expect } from "vitest";
import type {
  Client,
  ClientWithDetails,
  LookupItem,
  Branch,
  ClientStatus,
  ClientSearchResult,
  SyncJob,
  ClientSyncHistory,
  ClientFilters,
  ClientListResponse,
  PaginatedResponse,
  ApiResponse,
  TriggerSyncInput,
} from "../types";

describe("Client types", () => {
  describe("Client interface", () => {
    it("should create a valid Client object", () => {
      const client: Client = {
        id: "123",
        clientCode: "CLIENT001",
        fullName: "John Doe",
        pensionNumber: "PEN123",
        birthDate: new Date("1990-01-01"),
        contactNumber: "1234567890",
        contactNumberAlt: "0987654321",
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
        syncSource: "snowflake",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      expect(client.id).toBe("123");
      expect(client.clientCode).toBe("CLIENT001");
      expect(client.fullName).toBe("John Doe");
      expect(client.isActive).toBe(true);
    });

    it("should create Client with null optional fields", () => {
      const client: Client = {
        id: "123",
        clientCode: "CLIENT001",
        fullName: "John Doe",
        pensionNumber: null,
        birthDate: null,
        contactNumber: null,
        contactNumberAlt: null,
        pensionTypeId: null,
        pensionerTypeId: null,
        productId: null,
        branchId: null,
        parStatusId: null,
        accountTypeId: null,
        pastDueAmount: null,
        loanStatus: null,
        isActive: true,
        lastSyncedAt: null,
        syncSource: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      expect(client.pensionNumber).toBeNull();
      expect(client.birthDate).toBeNull();
      expect(client.contactNumber).toBeNull();
    });
  });

  describe("ClientWithDetails interface", () => {
    it("should create a valid ClientWithDetails object", () => {
      const clientWithDetails: ClientWithDetails = {
        id: "123",
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
        syncSource: "snowflake",
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

      expect(clientWithDetails.pensionType?.name).toBe("Pension Type 1");
      expect(clientWithDetails.branch?.name).toBe("Branch 1");
      expect(clientWithDetails.currentStatus?.hasPayment).toBe(true);
    });
  });

  describe("LookupItem interface", () => {
    it("should create a valid LookupItem object", () => {
      const lookup: LookupItem = {
        id: "123",
        code: "CODE001",
        name: "Lookup Item",
      };

      expect(lookup.code).toBe("CODE001");
      expect(lookup.name).toBe("Lookup Item");
    });
  });

  describe("Branch interface", () => {
    it("should create a valid Branch object", () => {
      const branch: Branch = {
        id: "123",
        code: "BR001",
        name: "Branch 1",
        location: "Location 1",
        category: "Category 1",
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(branch.code).toBe("BR001");
      expect(branch.name).toBe("Branch 1");
    });
  });

  describe("ClientStatus interface", () => {
    it("should create a valid ClientStatus object", () => {
      const status: ClientStatus = {
        id: "123",
        statusTypeId: "status-type-1",
        reasonId: "reason-1",
        remarks: "Test remarks",
        hasPayment: true,
        updatedAt: new Date(),
      };

      expect(status.hasPayment).toBe(true);
      expect(status.remarks).toBe("Test remarks");
    });
  });

  describe("ClientSearchResult interface", () => {
    it("should create a valid ClientSearchResult object", () => {
      const result: ClientSearchResult = {
        id: "123",
        clientCode: "CLIENT001",
        fullName: "John Doe",
        pensionNumber: "PEN123",
      };

      expect(result.clientCode).toBe("CLIENT001");
      expect(result.fullName).toBe("John Doe");
    });
  });

  describe("SyncJob interface", () => {
    it("should create a valid SyncJob object", () => {
      const job: SyncJob = {
        id: "123",
        type: "snowflake",
        status: "completed",
        parameters: { branchCodes: ["BR001"] },
        recordsProcessed: 100,
        recordsCreated: 50,
        recordsUpdated: 50,
        startedAt: new Date(),
        completedAt: new Date(),
        error: null,
        createdBy: "user-1",
        createdAt: new Date(),
      };

      expect(job.type).toBe("snowflake");
      expect(job.status).toBe("completed");
      expect(job.recordsProcessed).toBe(100);
    });

    it("should accept all valid sync job statuses", () => {
      const statuses: Array<
        "pending" | "processing" | "completed" | "failed" | "dead"
      > = ["pending", "processing", "completed", "failed", "dead"];

      statuses.forEach((status) => {
        const job: SyncJob = {
          id: "123",
          type: "snowflake",
          status,
          parameters: null,
          recordsProcessed: 0,
          recordsCreated: 0,
          recordsUpdated: 0,
          startedAt: null,
          completedAt: null,
          error: null,
          createdBy: null,
          createdAt: new Date(),
        };

        expect(job.status).toBe(status);
      });
    });

    it("should accept all valid sync job types", () => {
      const types: Array<"snowflake" | "nextbank"> = ["snowflake", "nextbank"];

      types.forEach((type) => {
        const job: SyncJob = {
          id: "123",
          type,
          status: "pending",
          parameters: null,
          recordsProcessed: 0,
          recordsCreated: 0,
          recordsUpdated: 0,
          startedAt: null,
          completedAt: null,
          error: null,
          createdBy: null,
          createdAt: new Date(),
        };

        expect(job.type).toBe(type);
      });
    });
  });

  describe("ClientSyncHistory interface", () => {
    it("should create a valid ClientSyncHistory object", () => {
      const history: ClientSyncHistory = {
        id: "123",
        clientId: "client-1",
        fieldChanged: "fullName",
        oldValue: "Old Name",
        newValue: "New Name",
        syncJobId: "job-1",
        changedAt: new Date(),
      };

      expect(history.fieldChanged).toBe("fullName");
      expect(history.oldValue).toBe("Old Name");
      expect(history.newValue).toBe("New Name");
    });
  });

  describe("ClientFilters interface", () => {
    it("should create ClientFilters with all fields", () => {
      const filters: ClientFilters = {
        pensionTypeId: "pension-type-1",
        pensionerTypeId: "pensioner-type-1",
        productId: "product-1",
        parStatusId: "par-status-1",
        accountTypeId: "account-type-1",
        isActive: true,
        search: "john",
      };

      expect(filters.pensionTypeId).toBe("pension-type-1");
      expect(filters.isActive).toBe(true);
      expect(filters.search).toBe("john");
    });

    it("should create ClientFilters with partial fields", () => {
      const filters1: ClientFilters = {
        isActive: true,
      };

      const filters2: ClientFilters = {
        search: "john",
      };

      expect(filters1.isActive).toBe(true);
      expect(filters2.search).toBe("john");
    });

    it("should create empty ClientFilters", () => {
      const filters: ClientFilters = {};

      expect(Object.keys(filters)).toHaveLength(0);
    });
  });

  describe("ClientListResponse interface", () => {
    it("should create a valid ClientListResponse object", () => {
      const response: ClientListResponse = {
        success: true,
        data: [],
        meta: {
          page: 1,
          pageSize: 25,
          total: 0,
          totalPages: 0,
        },
      };

      expect(response.success).toBe(true);
      expect(response.data).toEqual([]);
      expect(response.meta.page).toBe(1);
    });
  });

  describe("PaginatedResponse interface", () => {
    it("should create a valid PaginatedResponse object", () => {
      const response: PaginatedResponse<string> = {
        success: true,
        data: ["item1", "item2"],
        meta: {
          page: 1,
          pageSize: 25,
          total: 2,
          totalPages: 1,
        },
      };

      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(2);
      expect(response.meta.total).toBe(2);
    });
  });

  describe("ApiResponse interface", () => {
    it("should create successful ApiResponse", () => {
      const response: ApiResponse<string> = {
        success: true,
        data: "test data",
      };

      expect(response.success).toBe(true);
      expect(response.data).toBe("test data");
      expect(response.error).toBeUndefined();
    });

    it("should create error ApiResponse", () => {
      const response: ApiResponse<string> = {
        success: false,
        error: {
          message: "Error message",
        },
      };

      expect(response.success).toBe(false);
      expect(response.data).toBeUndefined();
      expect(response.error?.message).toBe("Error message");
    });
  });

  describe("TriggerSyncInput interface", () => {
    it("should create a valid TriggerSyncInput object", () => {
      const input: TriggerSyncInput = {
        type: "snowflake",
        options: {
          branchCodes: ["BR001", "BR002"],
          dryRun: false,
          fullSync: true,
        },
      };

      expect(input.type).toBe("snowflake");
      expect(input.options?.branchCodes).toHaveLength(2);
      expect(input.options?.dryRun).toBe(false);
      expect(input.options?.fullSync).toBe(true);
    });

    it("should create TriggerSyncInput with required fields only", () => {
      const input: TriggerSyncInput = {
        type: "snowflake",
      };

      expect(input.type).toBe("snowflake");
      expect(input.options).toBeUndefined();
    });

    it("should accept all valid sync types", () => {
      const types: Array<"snowflake" | "nextbank"> = ["snowflake", "nextbank"];

      types.forEach((type) => {
        const input: TriggerSyncInput = {
          type,
        };

        expect(input.type).toBe(type);
      });
    });
  });
});
