import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PCNIDashboardPage from "../page";

// Mock the useSearchParams hook
vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(() => new URLSearchParams("")),
}));

// Mock useStatusStore
vi.mock("@/features/status/stores/status-store", () => ({
  useStatusStore: vi.fn((selector) => {
    const state = {
      currentPeriod: {
        periodType: "monthly",
        periodYear: 2024,
        periodMonth: 1,
        periodQuarter: null,
      },
      setCurrentPeriod: vi.fn(),
      isUpdateDialogOpen: false,
      openUpdateDialog: vi.fn(),
      closeUpdateDialog: vi.fn(),
      isBulkUpdateMode: false,
      setBulkUpdateMode: vi.fn(),
      selectedClientIds: new Set(),
      toggleClientSelection: vi.fn(),
      clearClientSelection: vi.fn(),
      selectedClientStatus: null,
      setSelectedClientStatus: vi.fn(),
    };
    return selector(state);
  }),
}));

// Mock status hooks
vi.mock("@/features/status/hooks/use-status", () => ({
  useDashboardSummary: vi.fn(() => ({
    data: {
      totalClients: 10,
      statusCounts: {
        PENDING: 5,
        TO_FOLLOW: 3,
        CALLED: 2,
      },
      paymentCount: 2,
      terminalCount: 0,
      byPensionType: {
        SSS: 5,
        GSIS: 5,
      },
    },
    isLoading: false,
    error: null,
  })),
  useClientStatus: vi.fn(() => ({
    data: null,
    isLoading: false,
  })),
  useUpdateStatus: vi.fn(() => ({
    mutate: vi.fn(),
  })),
  useBulkUpdateStatus: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

// Mock clients hook
vi.mock("@/features/clients/hooks/use-clients", () => ({
  useClients: vi.fn(() => ({
    data: {
      data: [
        {
          id: "1",
          clientCode: "PC001",
          fullName: "John Doe",
          pensionNumber: "123456",
          contactNumber: "123-456-7890",
          isActive: true,
        },
        {
          id: "2",
          clientCode: "PC002",
          fullName: "Jane Smith",
          pensionNumber: "234567",
          contactNumber: "234-567-8901",
          isActive: true,
        },
      ],
      meta: {
        page: 1,
        pageSize: 50,
        total: 2,
        totalPages: 1,
      },
    },
    isLoading: false,
    error: null,
  })),
}));

// Mock status components
vi.mock("@/features/status/components", () => ({
  PeriodSelector: vi.fn(({ value, onChange }) => (
    <div data-testid="period-selector">
      <select
        data-testid="period-select"
        value={value.periodMonth || ""}
        onChange={(e) =>
          onChange({ ...value, periodMonth: Number(e.target.value) })
        }
      >
        <option value="1">January</option>
        <option value="2">February</option>
      </select>
    </div>
  )),
  DashboardSummary: vi.fn(({ summary, loading }) => (
    <div data-testid="dashboard-summary">
      {loading && <div data-testid="loading">Loading...</div>}
      {!loading && (
        <div data-testid="summary-data">
          <div data-testid="total-clients">{summary.totalClients}</div>
        </div>
      )}
    </div>
  )),
  StatusUpdateDialog: vi.fn(({ open, onClose }) => (
    <div data-testid="status-update-dialog">
      {open && <div>Dialog Open</div>}
    </div>
  )),
  StatusBadge: vi.fn(({ status }) => (
    <span data-testid="status-badge">{status}</span>
  )),
}));

describe("PCNIDashboardPage", () => {
  it("renders page header", () => {
    render(<PCNIDashboardPage />);

    expect(screen.getByText("PCNI Dashboard")).toBeInTheDocument();
    expect(
      screen.getByText("Track and manage client status for PCNI company."),
    ).toBeInTheDocument();
  });

  it("renders period selector", () => {
    render(<PCNIDashboardPage />);

    expect(screen.getByTestId("period-selector")).toBeInTheDocument();
  });

  it("renders dashboard summary", () => {
    render(<PCNIDashboardPage />);

    expect(screen.getByTestId("dashboard-summary")).toBeInTheDocument();
    expect(screen.getByTestId("total-clients")).toHaveTextContent("10");
  });

  it("renders client list header", () => {
    render(<PCNIDashboardPage />);

    expect(screen.getByText("Client List")).toBeInTheDocument();
  });

  it("renders bulk update mode button", () => {
    render(<PCNIDashboardPage />);

    expect(screen.getByText("Bulk Update Mode")).toBeInTheDocument();
  });

  it("renders client table with data", () => {
    render(<PCNIDashboardPage />);

    expect(screen.getByText("PC001")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("123456")).toBeInTheDocument();
    expect(screen.getByText("123-456-7890")).toBeInTheDocument();
    expect(screen.getByText("PC002")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
  });

  it("renders update status buttons for each client", () => {
    render(<PCNIDashboardPage />);

    const updateButtons = screen.getAllByText("Update Status");
    expect(updateButtons).toHaveLength(2);
  });

  it("renders status badges for each client", () => {
    render(<PCNIDashboardPage />);

    const statusBadges = screen.getAllByTestId("status-badge");
    expect(statusBadges).toHaveLength(2);
  });
});
