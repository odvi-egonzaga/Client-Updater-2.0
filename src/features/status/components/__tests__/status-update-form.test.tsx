import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import { StatusUpdateForm } from "../status-update-form";
import type { ClientPeriodStatus, PeriodType } from "../../types";

// Mock the useUpdateStatus hook
vi.mock("../../hooks/use-status", () => ({
  useUpdateStatus: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
}));

describe("StatusUpdateForm", () => {
  const mockClientStatus: ClientPeriodStatus = {
    id: "1",
    clientId: "client-1",
    periodType: "monthly",
    periodYear: 2024,
    periodMonth: 1,
    periodQuarter: null,
    status: {
      id: "1",
      name: "Pending",
      code: "PENDING",
      requiresRemarks: false,
      isTerminal: false,
      workflowOrder: 1,
    },
    reason: null,
    remarks: null,
    hasPayment: false,
    updateCount: 0,
    isTerminal: false,
    updatedBy: { id: "user-1", name: "Test User" },
    updatedAt: "2024-01-01T00:00:00Z",
  };

  const defaultProps = {
    clientId: "client-1",
    currentStatus: mockClientStatus,
    companyId: "company-1",
    periodType: "monthly" as PeriodType,
    onSuccess: vi.fn(),
    onCancel: vi.fn(),
  };

  it("renders form title", () => {
    render(<StatusUpdateForm {...defaultProps} />);

    expect(screen.getByText("Update Status")).toBeInTheDocument();
  });

  it("displays current status when provided", () => {
    render(<StatusUpdateForm {...defaultProps} />);

    expect(screen.getByText("Current Status")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("does not display current status when not provided", () => {
    render(<StatusUpdateForm {...defaultProps} currentStatus={undefined} />);

    expect(screen.queryByText("Current Status")).not.toBeInTheDocument();
  });

  it("renders status dropdown", () => {
    render(<StatusUpdateForm {...defaultProps} />);

    const statusLabel = screen.getByLabelText(/status/i);
    expect(statusLabel).toBeInTheDocument();
    expect(statusLabel).toHaveTextContent("*");
  });

  it("renders status options based on workflow", () => {
    render(<StatusUpdateForm {...defaultProps} />);

    const statusSelect = screen.getByLabelText(/status/i);
    fireEvent.change(statusSelect, { target: { value: "2" } });

    expect(screen.getByText("To Follow")).toBeInTheDocument();
  });

  it("renders reason dropdown when status is selected", () => {
    render(<StatusUpdateForm {...defaultProps} />);

    const statusSelect = screen.getByLabelText(/status/i);
    fireEvent.change(statusSelect, { target: { value: "2" } });

    expect(screen.getByLabelText(/reason/i)).toBeInTheDocument();
  });

  it("renders remarks textarea when required", async () => {
    render(<StatusUpdateForm {...defaultProps} />);

    const statusSelect = screen.getByLabelText(/status/i);
    fireEvent.change(statusSelect, { target: { value: "4" } }); // VISITED requires remarks

    await waitFor(() => {
      expect(screen.getByLabelText(/remarks/i)).toBeInTheDocument();
    });
  });

  it("shows validation error when status is not selected", async () => {
    render(<StatusUpdateForm {...defaultProps} />);

    const submitButton = screen.getByText("Update Status");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Status is required")).toBeInTheDocument();
    });
  });

  it("shows validation error when remarks are required but not provided", async () => {
    render(<StatusUpdateForm {...defaultProps} />);

    const statusSelect = screen.getByLabelText(/status/i);
    fireEvent.change(statusSelect, { target: { value: "4" } }); // VISITED requires remarks

    const submitButton = screen.getByText("Update Status");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Remarks are required")).toBeInTheDocument();
    });
  });

  it("renders payment toggle", () => {
    render(<StatusUpdateForm {...defaultProps} />);

    const paymentToggle = screen.getByLabelText(/payment received/i);
    expect(paymentToggle).toBeInTheDocument();
  });

  it("toggles payment status when checkbox is clicked", () => {
    render(<StatusUpdateForm {...defaultProps} />);

    const paymentToggle = screen.getByLabelText(
      /payment received/i,
    ) as HTMLInputElement;
    expect(paymentToggle.checked).toBe(false);

    fireEvent.click(paymentToggle);
    expect(paymentToggle.checked).toBe(true);
  });

  it("calls onCancel when cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(<StatusUpdateForm {...defaultProps} onCancel={onCancel} />);

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalled();
  });

  it("calls onSuccess when form is submitted successfully", async () => {
    const onSuccess = vi.fn();
    render(<StatusUpdateForm {...defaultProps} onSuccess={onSuccess} />);

    const statusSelect = screen.getByLabelText(/status/i);
    fireEvent.change(statusSelect, { target: { value: "2" } });

    const submitButton = screen.getByText("Update Status");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("displays error message when submission fails", async () => {
    // Mock failed submission
    vi.doMock("../../hooks/use-status", () => ({
      useUpdateStatus: () => ({
        mutateAsync: vi.fn().mockRejectedValue(new Error("Failed to update")),
        isPending: false,
      }),
    }));

    render(<StatusUpdateForm {...defaultProps} />);

    const statusSelect = screen.getByLabelText(/status/i);
    fireEvent.change(statusSelect, { target: { value: "2" } });

    const submitButton = screen.getByText("Update Status");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/failed to update/i)).toBeInTheDocument();
    });
  });

  it("resets reason when status changes", () => {
    render(<StatusUpdateForm {...defaultProps} />);

    const statusSelect = screen.getByLabelText(/status/i);
    fireEvent.change(statusSelect, { target: { value: "2" } });

    // Select a reason
    const reasonSelect = screen.getByLabelText(/reason/i);
    fireEvent.change(reasonSelect, { target: { value: "r3" } });

    // Change status
    fireEvent.change(statusSelect, { target: { value: "3" } });

    // Reason should be reset
    expect(reasonSelect).toHaveValue("");
  });
});
