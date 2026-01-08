import { vi } from "vitest";

// Mock headers object
export const mockHeaders = {
  get: vi.fn(),
};

// Mock Next.js headers function
export const mockHeadersFn = vi.fn(() => Promise.resolve(mockHeaders));

// Mock next/headers module
vi.mock("next/headers", () => ({
  headers: mockHeadersFn,
}));
