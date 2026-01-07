import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import {
  useClients,
  useClient,
  useClientSyncHistory,
  useClientSearch,
  useSyncJobs,
  useSyncJob,
  useTriggerSync,
  usePreviewSync,
} from "../hooks/use-clients";

// Mock fetch
global.fetch = vi.fn();

describe("useClients hook", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  describe("useClients", () => {
    it("should fetch clients successfully", async () => {
      const mockResponse = {
        success: true,
        data: [
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
        ],
        meta: {
          page: 1,
          pageSize: 25,
          total: 1,
          totalPages: 1,
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const { result } = renderHook(() => useClients(1, 25, {}), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data).toEqual(mockResponse);
      });
    });

    it("should handle fetch errors", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            message: "Failed to fetch clients",
          },
        }),
      } as Response);

      const { result } = renderHook(() => useClients(1, 25, {}), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toBeTruthy();
      });
    });
  });

  describe("useClient", () => {
    it("should fetch single client successfully", async () => {
      const mockResponse = {
        success: true,
        data: {
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
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const { result } = renderHook(() => useClient("1"), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data).toEqual(mockResponse);
      });
    });

    it("should not fetch when clientId is empty", () => {
      const { result } = renderHook(() => useClient(""), { wrapper });

      expect(result.current.fetchStatus).toBe("idle");
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe("useClientSyncHistory", () => {
    it("should fetch client sync history successfully", async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            id: "1",
            clientId: "client-1",
            fieldChanged: "fullName",
            oldValue: "Old Name",
            newValue: "New Name",
            syncJobId: "job-1",
            changedAt: new Date(),
          },
        ],
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const { result } = renderHook(() => useClientSyncHistory("client-1"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data).toEqual(mockResponse);
      });
    });
  });

  describe("useClientSearch", () => {
    it("should search clients successfully", async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            id: "1",
            clientCode: "CLIENT001",
            fullName: "John Doe",
            pensionNumber: "PEN123",
          },
        ],
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const { result } = renderHook(() => useClientSearch("John", true), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data).toEqual(mockResponse);
      });
    });

    it("should not search with query less than 2 characters", () => {
      const { result } = renderHook(() => useClientSearch("J", true), {
        wrapper,
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(fetch).not.toHaveBeenCalled();
    });

    it("should not search when disabled", () => {
      const { result } = renderHook(() => useClientSearch("John", false), {
        wrapper,
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe("useSyncJobs", () => {
    it("should fetch sync jobs successfully", async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            id: "1",
            type: "snowflake" as const,
            status: "completed" as const,
            parameters: { branchCodes: ["BR001"] },
            recordsProcessed: 100,
            recordsCreated: 50,
            recordsUpdated: 50,
            startedAt: new Date(),
            completedAt: new Date(),
            error: null,
            createdBy: "user-1",
            createdAt: new Date(),
          },
        ],
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const { result } = renderHook(() => useSyncJobs(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data).toEqual(mockResponse);
      });
    });
  });

  describe("useSyncJob", () => {
    it("should fetch single sync job successfully", async () => {
      const mockResponse = {
        success: true,
        data: {
          id: "1",
          type: "snowflake" as const,
          status: "completed" as const,
          parameters: { branchCodes: ["BR001"] },
          recordsProcessed: 100,
          recordsCreated: 50,
          recordsUpdated: 50,
          startedAt: new Date(),
          completedAt: new Date(),
          error: null,
          createdBy: "user-1",
          createdAt: new Date(),
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const { result } = renderHook(() => useSyncJob("1"), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data).toEqual(mockResponse);
      });
    });

    it("should not fetch when jobId is empty", () => {
      const { result } = renderHook(() => useSyncJob(""), { wrapper });

      expect(result.current.fetchStatus).toBe("idle");
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe("useTriggerSync", () => {
    it("should trigger sync successfully", async () => {
      const mockResponse = {
        success: true,
        data: {
          id: "1",
          type: "snowflake" as const,
          status: "processing" as const,
          parameters: { branchCodes: ["BR001"] },
          recordsProcessed: 0,
          recordsCreated: 0,
          recordsUpdated: 0,
          startedAt: new Date(),
          completedAt: null,
          error: null,
          createdBy: "user-1",
          createdAt: new Date(),
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const { result } = renderHook(() => useTriggerSync(), { wrapper });

      result.current.mutateAsync({
        type: "snowflake",
        options: {
          branchCodes: ["BR001"],
          dryRun: false,
        },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data).toEqual(mockResponse);
      });

      expect(fetch).toHaveBeenCalledWith(
        "/api/sync/jobs",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      );
    });
  });

  describe("usePreviewSync", () => {
    it("should preview sync successfully", async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            clientCode: "CLIENT001",
            fullName: "John Doe",
            pensionNumber: "PEN123",
          },
        ],
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const { result } = renderHook(() => usePreviewSync(), { wrapper });

      result.current.mutateAsync({
        type: "snowflake",
        options: {
          branchCodes: ["BR001"],
          dryRun: true,
        },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data).toEqual(mockResponse);
      });

      expect(fetch).toHaveBeenCalledWith(
        "/api/sync/jobs/preview",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      );
    });
  });
});
