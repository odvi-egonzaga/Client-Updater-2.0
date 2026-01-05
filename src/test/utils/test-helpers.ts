import type { RenderOptions } from '@testing-library/react';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { vi, beforeEach, afterEach } from 'vitest';

/**
 * Custom render function that includes providers if needed
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, options);
}

/**
 * Create a mock function that returns a resolved value
 */
export function mockResolved<T>(value: T) {
  return vi.fn().mockResolvedValue(value);
}

/**
 * Create a mock function that returns a rejected value
 */
export function mockRejected(error: Error | string) {
  return vi.fn().mockRejectedValue(error instanceof Error ? error : new Error(error));
}

/**
 * Wait for a specified amount of time
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a mock user object
 */
export function createMockUser(overrides: Partial<any> = {}) {
  return {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    imageUrl: 'https://example.com/avatar.jpg',
    clerkOrgId: 'org-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock health check result
 */
export function createMockHealthCheck(overrides: Partial<any> = {}) {
  return {
    status: 'healthy',
    responseTimeMs: 100,
    message: 'Service is healthy',
    ...overrides,
  };
}

/**
 * Create a mock service health object
 */
export function createMockServiceHealth(overrides: Partial<any> = {}) {
  return {
    name: 'Test Service',
    icon: 'test-icon',
    status: 'healthy',
    responseTimeMs: 100,
    checks: [
      {
        name: 'Test Check',
        endpoint: '/test/endpoint',
        status: 'healthy',
        responseTimeMs: 50,
      },
    ],
    ...overrides,
  };
}

/**
 * Mock console methods to suppress warnings in tests
 */
export function suppressConsoleWarnings() {
  const originalWarn = console.warn;
  const originalError = console.error;

  beforeEach(() => {
    console.warn = vi.fn();
    console.error = vi.fn();
  });

  afterEach(() => {
    console.warn = originalWarn;
    console.error = originalError;
  });
}

/**
 * Create a mock fetch response
 */
export function createMockResponse(
  data: any,
  status: number = 200,
  ok: boolean = true
) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
  };
}

/**
 * Mock localStorage
 */
export function mockLocalStorage() {
  const store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((key) => delete store[key]);
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
}

/**
 * Create a mock router
 */
export function createMockRouter() {
  return {
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  };
}
