# Client Updater Version 2 - Testing Guide

## Overview

This guide covers the testing infrastructure and practices for Client Updater Version 2. The framework includes a comprehensive test suite with Vitest, React Testing Library, and mocking utilities.

### Testing Philosophy

- **Test at the right level**: Choose unit, integration, or E2E based on what you're testing
- **Keep tests fast**: Unit tests should run in milliseconds
- **Test behavior, not implementation**: Focus on what code does, not how
- **Use meaningful names**: Test names should describe behavior
- **Aim for 80% coverage**: Target 80% coverage across lines, functions, branches, and statements

---

## Testing Infrastructure Setup

### Installed Dependencies

The framework includes the following testing dependencies:

| Tool | Purpose | Version |
|------|---------|---------|
| **Vitest** | Unit and integration test runner | ^4.0.16 |
| **@vitest/ui** | Visual test runner interface | ^4.0.16 |
| **@vitest/coverage-v8** | Code coverage reporting | ^4.0.16 |
| **@testing-library/react** | React component testing | ^16.3.1 |
| **@testing-library/jest-dom** | Custom Jest matchers | ^6.9.1 |
| **@vitejs/plugin-react** | React plugin for Vitest | ^5.1.2 |
| **jsdom** | DOM environment for tests | ^27.4.0 |
| **happy-dom** | Alternative DOM environment | ^20.0.11 |
| **msw** | API mocking service | ^2.12.7 |

### Vitest Configuration

The framework uses [`vitest.config.ts`](../../vitest.config.ts) with the following configuration:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['**/__tests__/**/*.{test,spec}.{ts,tsx}', '**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.next', 'coverage'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        '.next/',
        'dist/',
        'coverage/',
        '**/*.config.{js,ts}',
        '**/types/**',
        '**/test/**',
        '**/__tests__/**',
        '**/*.d.ts',
        '**/mockData.ts',
        'src/middleware.ts',
        'src/env.js',
      ],
      all: true,
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Test Setup File

The [`src/test/setup.ts`](../../src/test/setup.ts) file configures the test environment:

```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Mock requestAnimationFrame
global.requestAnimationFrame = (callback: FrameRequestCallback) => {
  return setTimeout(callback, 0) as unknown as number;
};

global.cancelAnimationFrame = (id: number) => {
  clearTimeout(id);
};
```

### Available Test Scripts

| Script | Description |
|---------|-------------|
| `pnpm test` | Run all tests once |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:ui` | Run tests with visual UI |
| `pnpm test:coverage` | Run tests with coverage report |

---

## Test Organization

### Directory Structure

```
src/
├── components/
│   ├── ui/
│   │   └── __tests__/          # Component tests
│   └── layouts/
│       └── __tests__/          # Layout tests
├── hooks/
│   ├── queries/
│   │   └── __tests__/          # Hook tests
│   └── utils/
│       └── __tests__/          # Utility hook tests
├── lib/
│   ├── supabase/
│   │   └── __tests__/          # Supabase client tests
│   ├── snowflake/
│   │   └── __tests__/          # Snowflake client tests
│   ├── nextbank/
│   │   └── __tests__/          # NextBank client tests
│   └── __tests__/              # Utility function tests
├── server/
│   ├── api/
│   │   └── routes/
│   │       └── __tests__/      # API route tests
│   └── db/
│       └── schema/
│           └── __tests__/  # Database schema tests
├── features/
│   └── __tests__/          # Feature tests
├── stores/
│   └── __tests__/          # Store tests
├── config/
│   └── __tests__/          # Config tests
└── test/
    ├── mocks/               # Mock files
    │   ├── supabase.ts
    │   ├── clerk.ts
    │   └── snowflake.ts
    └── utils/              # Test helpers
        └── test-helpers.ts
```

### Naming Conventions

- **Component tests**: `*.test.tsx` or `*.spec.tsx`
- **Unit tests**: `*.test.ts` or `*.spec.ts`
- **Test files location**: `__tests__/` directories next to source files

---

## Running Tests

### Run All Tests

```bash
pnpm test
```

### Run Tests in Watch Mode

```bash
pnpm test:watch
```

### Run Tests with UI

```bash
pnpm test:ui
```

### Run Specific Test File

```bash
pnpm test src/lib/__tests__/utils.test.ts
```

### Run Tests Matching Pattern

```bash
pnpm test -- health
```

### Generate Coverage Report

```bash
pnpm test:coverage
```

This generates:
- Terminal output with coverage summary
- HTML report in `coverage/index.html`
- JSON report in `coverage/coverage-final.json`
- LCOV report in `coverage/lcov.info`

---

## Test Files Overview

### Utility Tests

**File**: [`src/lib/__tests__/utils.test.ts`](../../src/lib/__tests__/utils.test.ts)

Tests the `cn` utility function for merging Tailwind CSS classes:
- Merging class names correctly
- Handling conditional classes
- Handling undefined and null values
- Merging Tailwind classes (later classes override earlier ones)
- Handling arrays and objects of classes
- Handling conflicting Tailwind utility classes

**File**: [`src/lib/__tests__/validators.test.ts`](../../src/lib/__tests__/validators.test.ts)

Tests the `healthCheckSchema` Zod validator:
- Validating healthy, unhealthy, error, pending, and unconfigured statuses
- Rejecting invalid status values
- Validating optional fields (responseTimeMs, message, error)
- Providing detailed error messages

### Hook Tests

**File**: [`src/hooks/__tests__/use-debounce.test.tsx`](../../src/hooks/__tests__/use-debounce.test.tsx)

Tests the `useDebounce` hook:
- Returning initial value immediately
- Cleaning up timer on unmount
- Handling different delay values

### Store Tests

**File**: [`src/stores/__tests__/ui-store.test.ts`](../../src/stores/__tests__/ui-store.test.ts)

Tests the Zustand UI store:
- Initial state with sidebar closed
- Toggling sidebar from closed to open
- Toggling sidebar from open to closed
- Multiple toggle operations
- Providing toggleSidebar function
- Maintaining state consistency
- Handling rapid state changes
- Direct state setting

### Config Tests

**File**: [`src/config/__tests__/env.test.ts`](../../src/config/__tests__/env.test.ts)

Tests the environment configuration schema:
- Validating environment schema structure
- Validating NODE_ENV enum values
- Validating URL fields
- Validating Clerk key prefixes
- Allowing optional NextBank fields
- Validating Snowflake configuration fields
- Using default values when environment variables are not set

**File**: [`src/config/__tests__/site.test.ts`](../../src/config/__tests__/site.test.ts)

Tests the site configuration:
- Having name and description properties
- Having a url property
- Having links object with twitter and github links
- Valid URL formats for url and links

### Health Check Tests

**File**: [`src/features/__tests__/health-check-types.test.ts`](../../src/features/__tests__/health-check-types.test.ts)

Tests health check types:
- Accepting valid health status values
- Having exactly 5 valid health status values
- Creating valid ServiceCheck objects
- Creating ServiceCheck with and without optional fields
- Accepting all valid HealthStatus values in ServiceHealth

**File**: [`src/features/__tests__/health-check-config.test.ts`](../../src/features/__tests__/health-check-config.test.ts)

Tests health check service configuration:
- Having 6 services configured
- Having Clerk Authentication, Supabase Database, Supabase Storage, Supabase Edge Functions, Snowflake, and NextBank services
- Having all services with required properties
- Having all checks with required properties
- Having unique service names and icons
- Having correct endpoints for all checks

### Schema Tests

**File**: [`src/server/db/schema/__tests__/users.test.ts`](../../src/server/db/schema/__tests__/users.test.ts)

Tests the users database schema:
- Exporting User type
- Exporting NewUser type
- Allowing NewUser without optional fields

**File**: [`src/server/db/schema/__tests__/health-checks.test.ts`](../../src/server/db/schema/__tests__/health-checks.test.ts)

Tests the health checks database schema:
- Exporting HealthCheckTest type
- Allowing HealthCheckTest with null testValue

---

## Test Mocks

### Supabase Mock

**File**: [`src/test/mocks/supabase.ts`](../../src/test/mocks/supabase.ts)

Provides a mock Supabase client with:
- Database methods (from, select, insert, update, delete, eq, order, limit, single, maybeSingle, rpc)
- Auth methods (getUser, signInWithPassword, signOut, onAuthStateChange)
- Storage methods (upload, download, remove, list, getPublicUrl)

### Clerk Mock

**File**: [`src/test/mocks/clerk.ts`](../../src/test/mocks/clerk.ts)

Provides a mock Clerk client with:
- User methods (getUser, getUserList)
- Organization methods (getOrganizationMembershipList, getOrganizationList)
- React components (ClerkProvider, SignedIn, SignedOut, UserButton, SignIn, SignUp)
- Hooks (useUser, useAuth)

### Snowflake Mock

**File**: [`src/test/mocks/snowflake.ts`](../../src/test/mocks/snowflake.ts)

Provides a mock Snowflake connection with:
- Connection methods (connect, destroy, isUp, getId)
- Query execution methods (execute)
- SDK methods (createConnection, createConnector)

### Test Helpers

**File**: [`src/test/utils/test-helpers.ts`](../../src/test/utils/test-helpers.ts)

Provides utility functions for testing:
- `renderWithProviders`: Custom render function with providers
- `mockResolved`: Create a mock function that returns a resolved value
- `mockRejected`: Create a mock function that returns a rejected value
- `wait`: Wait for a specified amount of time
- `createMockUser`: Create a mock user object
- `createMockHealthCheck`: Create a mock health check result
- `createMockServiceHealth`: Create a mock service health object
- `suppressConsoleWarnings`: Mock console methods to suppress warnings
- `createMockResponse`: Create a mock fetch response
- `mockLocalStorage`: Mock localStorage
- `createMockRouter`: Create a mock router

---

## Testing Best Practices

### 1. Test Behavior, Not Implementation

```typescript
// ✅ Good - Tests behavior
it('displays user email', () => {
  render(<UserProfile user={user} />)
  expect(screen.getByText('user@example.com')).toBeInTheDocument()
})

// ❌ Bad - Tests implementation
it('renders a div with class email', () => {
  render(<UserProfile user={user} />)
  expect(screen.getByRole('div')).toHaveClass('email')
})
```

### 2. Use Descriptive Test Names

```typescript
// ✅ Good - Descriptive
it('returns 404 when user does not exist', async () => {})

// ❌ Bad - Vague
it('handles missing user', async () => {})
```

### 3. Test Edge Cases

```typescript
describe('formatDate', () => {
  it('handles null input', () => {})
  it('handles undefined input', () => {})
  it('handles invalid date', () => {})
  it('handles leap year', () => {})
})
```

### 4. Use beforeEach and afterEach

```typescript
describe('User Queries', () => {
  beforeEach(async () => {
    // Setup test data
    await setupTestData()
  })

  afterEach(async () => {
    // Cleanup test data
    await cleanupTestData()
  })

  it('fetches user by id', async () => {})
})
```

### 5. Mock External Dependencies

```typescript
// Mock external services to avoid making real API calls
vi.mock('@/lib/snowflake/client')
vi.mock('@/lib/supabase/admin')
vi.mock('@/lib/nextbank/client')
```

### 6. Keep Tests Isolated

Each test should be independent:

```typescript
// ✅ Good - Each test is independent
it('creates user', async () => {
  const result = await createUser({ email: 'test@example.com' })
  expect(result.email).toBe('test@example.com')
})

it('creates another user', async () => {
  const result = await createUser({ email: 'another@example.com' })
  expect(result.email).toBe('another@example.com')
})
```

---

## Coverage Goals

The framework aims for the following coverage targets:

| Metric | Target |
|--------|--------|
| Lines | 80% |
| Functions | 80% |
| Branches | 80% |
| Statements | 80% |

### Viewing Coverage

Run the coverage report:

```bash
pnpm test:coverage
```

---

## Troubleshooting

### Tests Not Running

If tests are not running, check:
1. Vitest is installed: `pnpm list | grep vitest`
2. Configuration file exists: `vitest.config.ts`
3. Test files are in the correct location: `**/__tests__/**/*.{test,spec}.{ts,tsx}`

### Mocks Not Working

If mocks are not working:
1. Ensure mocks are defined before importing module
2. Use `vi.mock()` at the top of the file
3. Clear mocks in `beforeEach()`: `vi.clearAllMocks()`

### Coverage Not Meeting Targets

If coverage is below targets:
1. Identify uncovered code in HTML report
2. Write tests for uncovered branches
3. Refactor complex functions to be more testable

---

## Related Documentation

- [API Layer](./api-layer.md) - API route structure
- [State Management](./state-management.md) - Testing hooks and stores
- [Implementation](./implementation.md) - Framework architecture
- [Environment Variables](./environment-variables.md) - Configuration setup
