import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import { ClientTable } from "../client-table";
import type { Client } from "../../types";

// Mock the useClientsStore
vi.mock("../../stores/clients-store", () => ({
  useClientsStore: vi.fn((selector) => {
    const state = {
      pagination: {
        page: 1,
        pageSize: 25,
        total: 0,
        totalPages: 0,
      },
      setPagination: vi.fn(),
    };
    return selector(state);
  }),
}));

// Mock Next.js Link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

describe("ClientTable", () => {
  const mockClients: Client[] = [
    {
      id: "1",
      clientCode: "C001",
      fullName: "John Doe",
      pensionNumber: "P001",
      birthDate: new Date("1980-01-01"),
      contactNumber: "123-456-7890",
      contactNumberAlt: null,
      pensionTypeId: "pt1",
      pensionerTypeId: "prt1",
      productId: "p1",
      branchId: "b1",
      parStatusId: "ps1",
      accountTypeId: "at1",
      pastDueAmount: null,
      loanStatus: null,
      isActive: true,
      lastSyncedAt: new Date("2024-01-01"),
      syncSource: "snowflake",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      deletedAt: null,
    },
    {
      id: "2",
      clientCode: "C002",
      fullName: "Jane Smith",
      pensionNumber: "P002",
      birthDate: new Date("1985-05-15"),
      contactNumber: "098-765-4321",
      contactNumberAlt: null,
      pensionTypeId: "pt2",
      pensionerTypeId: "prt2",
      productId: "p2",
      branchId: "b2",
      parStatusId: "ps2",
      accountTypeId: "at2",
      pastDueAmount: null,
      loanStatus: null,
      isActive: false,
      lastSyncedAt: new Date("2024-01-02"),
      syncSource: "nextbank",
      createdAt: new Date("2024-01-02"),
      updatedAt: new Date("2024-01-02"),
      deletedAt: null,
    },
  ];

  it("renders loading state", () => {
    render(<ClientTable isLoading={true} />);

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders error state", () => {
    render(<ClientTable error="Failed to load clients" />);

    expect(screen.getByText(/failed to load clients/i)).toBeInTheDocument();
  });

  it("renders empty state", () => {
    render(<ClientTable clients={[]} />);

    expect(screen.getByText(/no clients found/i)).toBeInTheDocument();
  });

  it("renders client table with data", () => {
    render(<ClientTable clients={mockClients} />);

    expect(screen.getByText("C001")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("P001")).toBeInTheDocument();
    expect(screen.getByText("123-456-7890")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();

    expect(screen.getByText("C002")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("P002")).toBeInTheDocument();
    expect(screen.getByText("098-765-4321")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("renders pagination when there are multiple pages", () => {
    const { useClientsStore } = require("../../stores/clients-store");
    useClientsStore.mockImplementation((selector: any) => {
      const state = {
        pagination: {
          page: 1,
          pageSize: 25,
          total: 50,
          totalPages: 2,
        },
        setPagination: vi.fn(),
      };
      return selector(state);
    });

    render(<ClientTable clients={mockClients} />);

    expect(
      screen.getByText(/showing 1 to 2 of 50 clients/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
  });

  it("disables previous button on first page", () => {
    const { useClientsStore } = require("../../stores/clients-store");
    useClientsStore.mockImplementation((selector: any) => {
      const state = {
        pagination: {
          page: 1,
          pageSize: 25,
          total: 50,
          totalPages: 2,
        },
        setPagination: vi.fn(),
      };
      return selector(state);
    });

    render(<ClientTable clients={mockClients} />);

    const previousButton = screen.getByRole("button", { name: /previous/i });
    expect(previousButton).toBeDisabled();
  });

  it("disables next button on last page", () => {
    const { useClientsStore } = require("../../stores/clients-store");
    useClientsStore.mockImplementation((selector: any) => {
      const state = {
        pagination: {
          page: 2,
          pageSize: 25,
          total: 50,
          totalPages: 2,
        },
        setPagination: vi.fn(),
      };
      return selector(state);
    });

    render(<ClientTable clients={mockClients} />);

    const nextButton = screen.getByRole("button", { name: /next/i });
    expect(nextButton).toBeDisabled();
  });
});
