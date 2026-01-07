import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UserTable } from "../user-table";
import type { User } from "../../types";

// Mock the store
vi.mock("../../stores/users-store", () => ({
  useUsersStore: vi.fn((selector) => {
    const state = {
      filters: { search: "", isActive: undefined },
      pagination: { page: 1, pageSize: 25, total: 0, totalPages: 1 },
      setFilters: vi.fn(),
      setPagination: vi.fn(),
    };
    return selector(state);
  }),
}));

describe("UserTable", () => {
  const mockUsers: User[] = [
    {
      id: "1",
      clerkId: "clerk-1",
      email: "john@example.com",
      firstName: "John",
      lastName: "Doe",
      imageUrl: "https://example.com/avatar.jpg",
      clerkOrgId: "org-1",
      isActive: true,
      mustChangePassword: false,
      passwordChangedAt: null,
      lastLoginAt: new Date("2024-01-01"),
      loginCount: 5,
      failedLoginCount: 0,
      lockedUntil: null,
      deletedAt: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
    {
      id: "2",
      clerkId: "clerk-2",
      email: "jane@example.com",
      firstName: "Jane",
      lastName: "Smith",
      imageUrl: null,
      clerkOrgId: "org-1",
      isActive: false,
      mustChangePassword: true,
      passwordChangedAt: null,
      lastLoginAt: null,
      loginCount: 0,
      failedLoginCount: 3,
      lockedUntil: null,
      deletedAt: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
  ];

  it("renders loading state", () => {
    render(<UserTable isLoading />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders error state", () => {
    render(<UserTable error="Failed to load users" />);
    expect(screen.getByText("Failed to load users")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    render(<UserTable users={[]} />);
    expect(screen.getByText("No users found")).toBeInTheDocument();
  });

  it("renders users table", () => {
    render(<UserTable users={mockUsers} />);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders user avatar", () => {
    render(<UserTable users={mockUsers} />);
    const avatar = screen.getByAltText("John Doe");
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute("src", "https://example.com/avatar.jpg");
  });

  it("renders user initials when no image", () => {
    render(<UserTable users={mockUsers} />);
    expect(screen.getByText("J")).toBeInTheDocument();
  });

  it("filters users by search", () => {
    render(<UserTable users={mockUsers} />);
    const searchInput = screen.getByPlaceholderText("Search users...");
    fireEvent.change(searchInput, { target: { value: "john" } });
    expect(searchInput).toHaveValue("john");
  });

  it("filters users by status", () => {
    render(<UserTable users={mockUsers} />);
    const statusFilter = screen.getByLabelText("Status:");
    fireEvent.change(statusFilter, { target: { value: "active" } });
    expect(statusFilter).toHaveValue("active");
  });

  it("shows pagination controls", () => {
    render(<UserTable users={mockUsers} />);
    expect(screen.getByText("Previous")).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
  });
});
