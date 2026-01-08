import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  useDashboardSummary,
  useClientStatus,
  useClientStatusHistory,
  useStatusEvent,
  useUpdateStatus,
  useBulkUpdateStatus,
  useAvailableYears,
} from "../hooks/use-status";

// Mock fetch globally
global.fetch = vi.fn();

// Helper function to create a wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  };
}

// Import React for createElement
import React from "react";

describe("useDashboardSummary hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch dashboard summary successfully", async () => {
    const mockSummary = {
      totalClients: 100,
      statusCounts: {
        ACTIVE: 50,
        INACTIVE: 30,
        PENDING: 20,
      },
      paymentCount: 60,
      terminalCount: 10,
      byPensionType: {
        SSS: 50,
        GSIS: 30,
        PAGIBIG: 20,
      },
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: mockSummary,
      }),
    } as Response);

    const periodFilter = {
      periodType: "monthly" as const,
      periodYear: 2024,
      periodMonth: 1,
      periodQuarter: null,
    };

    const { result } = renderHook(
      () => useDashboardSummary("company123", periodFilter),
      {
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockSummary);
  });

  it("should handle fetch errors", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    } as Response);

    const periodFilter = {
      periodType: "monthly" as const,
      periodYear: 2024,
      periodMonth: 1,
      periodQuarter: null,
    };

    const { result } = renderHook(
      () => useDashboardSummary("company123", periodFilter),
      {
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
  });
});

describe("useClientStatus hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch client status successfully", async () => {
    const mockClientStatus = {
      id: "123",
      clientId: "456",
      periodType: "monthly" as const,
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

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: mockClientStatus,
      }),
    } as Response);

    const periodFilter = {
      periodType: "monthly" as const,
      periodYear: 2024,
      periodMonth: 1,
      periodQuarter: null,
    };

    const { result } = renderHook(
      () => useClientStatus("client123", periodFilter),
      {
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockClientStatus);
  });

  it("should not fetch when clientId is not provided", () => {
    const periodFilter = {
      periodType: "monthly" as const,
      periodYear: 2024,
      periodMonth: 1,
      periodQuarter: null,
    };

    const { result } = renderHook(() => useClientStatus("", periodFilter), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useClientStatusHistory hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch client status history successfully", async () => {
    const mockHistory = [
      {
        id: "123",
        eventSequence: 1,
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
        createdBy: {
          id: "012",
          name: "John Doe",
        },
        createdAt: "2024-01-01T00:00:00Z",
      },
    ];

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: mockHistory,
      }),
    } as Response);

    const { result } = renderHook(
      () => useClientStatusHistory("client123", 50),
      {
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockHistory);
  });

  it("should not fetch when clientId is not provided", () => {
    const { result } = renderHook(() => useClientStatusHistory("", 50), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useStatusEvent hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch status event successfully", async () => {
    const mockEvent = {
      id: "123",
      eventSequence: 1,
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
      createdBy: {
        id: "012",
        name: "John Doe",
      },
      createdAt: "2024-01-01T00:00:00Z",
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: mockEvent,
      }),
    } as Response);

    const { result } = renderHook(() => useStatusEvent("event123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockEvent);
  });

  it("should not fetch when eventId is not provided", () => {
    const { result } = renderHook(() => useStatusEvent(""), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useUpdateStatus mutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update status successfully", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { success: true },
      }),
    } as Response);

    const { result } = renderHook(() => useUpdateStatus(), {
      wrapper: createWrapper(),
    });

    const input = {
      clientId: "client123",
      periodType: "monthly" as const,
      periodYear: 2024,
      periodMonth: 1,
      periodQuarter: null,
      statusId: "status123",
      reasonId: null,
      remarks: null,
      hasPayment: true,
    };

    await result.current.mutateAsync(input);

    expect(fetch).toHaveBeenCalledWith("/api/status/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  });

  it("should handle update errors", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: {
          message: "Failed to update status",
        },
      }),
    } as Response);

    const { result } = renderHook(() => useUpdateStatus(), {
      wrapper: createWrapper(),
    });

    const input = {
      clientId: "client123",
      periodType: "monthly" as const,
      periodYear: 2024,
      periodMonth: 1,
      periodQuarter: null,
      statusId: "status123",
      reasonId: null,
      remarks: null,
      hasPayment: true,
    };

    await expect(result.current.mutateAsync(input)).rejects.toThrow(
      "Failed to update status",
    );
  });
});

describe("useBulkUpdateStatus mutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should bulk update status successfully", async () => {
    const mockResult = {
      successful: 8,
      failed: 2,
      results: [
        {
          clientId: "client1",
          success: true,
          error: null,
        },
        {
          clientId: "client2",
          success: false,
          error: "Invalid status",
        },
      ],
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: mockResult,
      }),
    } as Response);

    const { result } = renderHook(() => useBulkUpdateStatus(), {
      wrapper: createWrapper(),
    });

    const input = {
      updates: [
        {
          clientId: "client1",
          periodType: "monthly" as const,
          periodYear: 2024,
          periodMonth: 1,
          periodQuarter: null,
          statusId: "status123",
          reasonId: null,
          remarks: null,
          hasPayment: true,
        },
        {
          clientId: "client2",
          periodType: "monthly" as const,
          periodYear: 2024,
          periodMonth: 1,
          periodQuarter: null,
          statusId: "status123",
          reasonId: null,
          remarks: null,
          hasPayment: false,
        },
      ],
    };

    const response = await result.current.mutateAsync(input);

    expect(fetch).toHaveBeenCalledWith("/api/status/bulk-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    expect(response).toEqual(mockResult);
  });

  it("should handle bulk update errors", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: {
          message: "Failed to bulk update status",
        },
      }),
    } as Response);

    const { result } = renderHook(() => useBulkUpdateStatus(), {
      wrapper: createWrapper(),
    });

    const input = {
      updates: [
        {
          clientId: "client1",
          periodType: "monthly" as const,
          periodYear: 2024,
          periodMonth: 1,
          periodQuarter: null,
          statusId: "status123",
          reasonId: null,
          remarks: null,
          hasPayment: true,
        },
      ],
    };

    await expect(result.current.mutateAsync(input)).rejects.toThrow(
      "Failed to bulk update status",
    );
  });
});

describe("useAvailableYears hook", () => {
  it("should return available years for September onwards", () => {
    // Mock current date to be September 2024
    const originalDate = Date;
    const mockDate = class extends Date {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(2024, 8, 1); // September 2024 (month is 0-indexed)
        } else {
          // @ts-ignore
          super(...args);
        }
      }
    };
    global.Date = mockDate as any;

    const { result } = renderHook(() => useAvailableYears());

    expect(result.current).toEqual([2023, 2024, 2025]);

    // Restore original Date
    global.Date = originalDate;
  });

  it("should return available years for before September", () => {
    // Mock current date to be January 2024
    const originalDate = Date;
    const mockDate = class extends Date {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(2024, 0, 1); // January 2024 (month is 0-indexed)
        } else {
          // @ts-ignore
          super(...args);
        }
      }
    };
    global.Date = mockDate as any;

    const { result } = renderHook(() => useAvailableYears());

    expect(result.current).toEqual([2022, 2023, 2024]);

    // Restore original Date
    global.Date = originalDate;
  });
});
