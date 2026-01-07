import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import { SyncStatus } from "../sync-status";
import type { SyncJob } from "../../types";

// Mock the hooks
vi.mock("../../hooks/use-clients", () => ({
  useSyncJobs: vi.fn(() => ({
    data: { success: true, data: [] },
    isLoading: false,
    error: null,
  })),
  useTriggerSync: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

describe("SyncStatus", () => {
  it("renders loading state", () => {
    const { useSyncJobs } = require("../../hooks/use-clients");
    useSyncJobs.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<SyncStatus />);

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders error state", () => {
    const { useSyncJobs } = require("../../hooks/use-clients");
    useSyncJobs.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Failed to load sync jobs"),
    });

    render(<SyncStatus />);

    expect(screen.getByText(/failed to load sync jobs/i)).toBeInTheDocument();
  });

  it("renders sync actions card", () => {
    const { useSyncJobs } = require("../../hooks/use-clients");
    useSyncJobs.mockReturnValue({
      data: { success: true, data: [] },
      isLoading: false,
      error: null,
    });

    render(<SyncStatus />);

    expect(screen.getByText(/sync actions/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /start snowflake sync/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /start nextbank sync/i }),
    ).toBeInTheDocument();
  });

  it("renders recent jobs card", () => {
    const { useSyncJobs } = require("../../hooks/use-clients");
    useSyncJobs.mockReturnValue({
      data: { success: true, data: [] },
      isLoading: false,
      error: null,
    });

    render(<SyncStatus />);

    expect(screen.getByText(/recent sync jobs/i)).toBeInTheDocument();
  });

  it("renders empty state when no jobs", () => {
    const { useSyncJobs } = require("../../hooks/use-clients");
    useSyncJobs.mockReturnValue({
      data: { success: true, data: [] },
      isLoading: false,
      error: null,
    });

    render(<SyncStatus />);

    expect(screen.getByText(/no sync jobs found/i)).toBeInTheDocument();
  });

  it("renders sync jobs list", () => {
    const mockJobs: SyncJob[] = [
      {
        id: "1",
        type: "snowflake",
        status: "completed",
        parameters: null,
        recordsProcessed: 100,
        recordsCreated: 50,
        recordsUpdated: 50,
        startedAt: new Date("2024-01-01T10:00:00"),
        completedAt: new Date("2024-01-01T10:05:00"),
        error: null,
        createdBy: "user1",
        createdAt: new Date("2024-01-01T10:00:00"),
      },
      {
        id: "2",
        type: "nextbank",
        status: "processing",
        parameters: null,
        recordsProcessed: 50,
        recordsCreated: 25,
        recordsUpdated: 25,
        startedAt: new Date("2024-01-01T11:00:00"),
        completedAt: null,
        error: null,
        createdBy: "user2",
        createdAt: new Date("2024-01-01T11:00:00"),
      },
    ];

    const { useSyncJobs } = require("../../hooks/use-clients");
    useSyncJobs.mockReturnValue({
      data: { success: true, data: mockJobs },
      isLoading: false,
      error: null,
    });

    render(<SyncStatus />);

    expect(screen.getByText("SNOWFLAKE")).toBeInTheDocument();
    expect(screen.getByText("NEXTBANK")).toBeInTheDocument();
    expect(screen.getByText(/completed/i)).toBeInTheDocument();
    expect(screen.getByText(/processing/i)).toBeInTheDocument();
  });

  it("calls trigger sync when snowflake sync button is clicked", async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ success: true });
    const { useTriggerSync, useSyncJobs } = require("../../hooks/use-clients");
    useTriggerSync.mockReturnValue({
      mutateAsync,
      isPending: false,
    });
    useSyncJobs.mockReturnValue({
      data: { success: true, data: [] },
      isLoading: false,
      error: null,
    });

    render(<SyncStatus />);

    const snowflakeButton = screen.getByRole("button", {
      name: /start snowflake sync/i,
    });
    fireEvent.click(snowflakeButton);

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({ type: "snowflake" });
    });
  });

  it("calls trigger sync when nextbank sync button is clicked", async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ success: true });
    const { useTriggerSync, useSyncJobs } = require("../../hooks/use-clients");
    useTriggerSync.mockReturnValue({
      mutateAsync,
      isPending: false,
    });
    useSyncJobs.mockReturnValue({
      data: { success: true, data: [] },
      isLoading: false,
      error: null,
    });

    render(<SyncStatus />);

    const nextbankButton = screen.getByRole("button", {
      name: /start nextbank sync/i,
    });
    fireEvent.click(nextbankButton);

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({ type: "nextbank" });
    });
  });

  it("disables sync buttons when sync is pending", () => {
    const { useTriggerSync, useSyncJobs } = require("../../hooks/use-clients");
    useTriggerSync.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true,
    });
    useSyncJobs.mockReturnValue({
      data: { success: true, data: [] },
      isLoading: false,
      error: null,
    });

    render(<SyncStatus />);

    expect(
      screen.getByRole("button", { name: /start snowflake sync/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /start nextbank sync/i }),
    ).toBeDisabled();
  });

  it("renders job error message", () => {
    const mockJobs: SyncJob[] = [
      {
        id: "1",
        type: "snowflake",
        status: "failed",
        parameters: null,
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        startedAt: new Date("2024-01-01T10:00:00"),
        completedAt: new Date("2024-01-01T10:05:00"),
        error: "Connection failed",
        createdBy: "user1",
        createdAt: new Date("2024-01-01T10:00:00"),
      },
    ];

    const { useSyncJobs } = require("../../hooks/use-clients");
    useSyncJobs.mockReturnValue({
      data: { success: true, data: mockJobs },
      isLoading: false,
      error: null,
    });

    render(<SyncStatus />);

    expect(screen.getByText(/connection failed/i)).toBeInTheDocument();
  });
});
