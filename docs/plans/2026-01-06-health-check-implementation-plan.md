# Health Check System - Implementation Plan

## Overview

This document provides a step-by-step implementation plan for the Health Check System. The implementation should be carried out in **Code mode** following the architecture defined in [`2026-01-06-health-check-system-architecture.md`](./2026-01-06-health-check-system-architecture.md).

## Implementation Steps

### Step 1: Create Directory Structure

Create the health utilities directory under `src/lib/`:

```
src/lib/health/
```

**Action:** Create the directory structure using the file system.

---

### Step 2: Implement Type Definitions

Create `src/lib/health/types.ts` with all type definitions and error classes.

**File:** `src/lib/health/types.ts`

**Content:** Use the type definitions from the architecture document:
- `HealthStatus` type
- `HealthCheckResult` interface
- `EdgeFunctionHealthResult` interface
- `DatabaseHealthResult` interface
- `UnifiedHealthResult` interface
- `EdgeFunctionCheckConfig` interface
- `DatabaseCheckConfig` interface
- `HealthCheckOptions` interface
- `HealthCheckError` class
- `EdgeFunctionHealthError` class
- `DatabaseHealthError` class

**Validation:** Run `pnpm typecheck` to ensure no TypeScript errors.

---

### Step 3: Implement Logger Utility

Create `src/lib/health/logger.ts` with the logging utility.

**File:** `src/lib/health/logger.ts`

**Content:** Implement the logger object with methods:
- `info(message, meta?)` - Log informational messages
- `success(message, meta?)` - Log successful operations
- `warn(message, meta?)` - Log warnings
- `error(message, meta?)` - Log errors
- `debug(message, meta?)` - Log debug info (development only)

**Validation:** Run `pnpm typecheck` to ensure no TypeScript errors.

---

### Step 4: Implement Edge Functions Health Check

Create `src/lib/health/edge-functions.ts` with Edge Functions health check utilities.

**File:** `src/lib/health/edge-functions.ts`

**Content:** Implement the following functions:

1. **`pingEdgeFunction(config: EdgeFunctionCheckConfig): Promise<EdgeFunctionHealthResult>`**
   - Pings the specified Edge Function
   - Measures response time
   - Returns detailed result with status and error information
   - Logs all operations

2. **`validateEdgeFunctionAuth(config: EdgeFunctionCheckConfig): Promise<EdgeFunctionHealthResult>`**
   - Validates JWT authentication with Edge Function
   - Returns warning if no auth token provided
   - Uses custom header `x-test-auth` to avoid gateway interference
   - Logs all operations

3. **`runEdgeFunctionHealthChecks(configs: EdgeFunctionCheckConfig[]): Promise<EdgeFunctionHealthResult[]>`**
   - Runs multiple Edge Function health checks in parallel
   - Aggregates results
   - Handles both ping and auth validation

**Dependencies:**
- Import from `@/lib/supabase/admin`
- Import from `@/config/env`
- Import types from `./types`
- Import logger from `./logger`

**Validation:** Run `pnpm typecheck` to ensure no TypeScript errors.

---

### Step 5: Implement Database Health Check

Create `src/lib/health/database.ts` with Database health check utilities.

**File:** `src/lib/health/database.ts`

**Content:** Implement the following functions:

1. **`writeTestRow(config: DatabaseCheckConfig): Promise<DatabaseHealthResult>`**
   - Deletes any existing test row first (clean state)
   - Inserts a new test row using Drizzle ORM
   - Returns result with record ID
   - Uses `db.insert()` and `db.delete()` syntax

2. **`readTestRow(config: DatabaseCheckConfig): Promise<DatabaseHealthResult>`**
   - Retrieves the test row by test key
   - Returns result with found status and details
   - Uses `db.select()` and `.where()` syntax

3. **`deleteTestRow(config: DatabaseCheckConfig): Promise<DatabaseHealthResult>`**
   - Checks if row exists first
   - Deletes the test row by test key
   - Returns result with deleted status
   - Uses `db.delete()` and `.where()` syntax

4. **`runDatabaseHealthChecks(config: DatabaseCheckConfig): Promise<DatabaseHealthResult[]>`**
   - Runs full CRUD health check
   - Only proceeds with read/delete if write succeeded
   - Returns array of all results

**Dependencies:**
- Import `db` from `@/server/db`
- Import `healthCheckTests` schema from `@/server/db/schema`
- Import `eq` from `drizzle-orm`
- Import types from `./types`
- Import logger from `./logger`

**Validation:** Run `pnpm typecheck` to ensure no TypeScript errors.

---

### Step 6: Implement Unified Health Check

Create `src/lib/health/index.ts` with the unified health check function.

**File:** `src/lib/health/index.ts`

**Content:** Implement the following:

1. **`checkHealth(options: HealthCheckOptions): Promise<UnifiedHealthResult>`**
   - Main unified health check function
   - Runs Edge Function checks (if configured)
   - Runs Database checks (if configured)
   - Aggregates all errors into a single array
   - Determines overall health status:
     - `unhealthy` if any errors
     - `warning` if any warnings
     - `healthy` if all healthy
     - `pending` if no checks or mixed state
   - Returns complete `UnifiedHealthResult`

2. **Export all types from `./types`**

**Dependencies:**
- Import types from `./types`
- Import `runEdgeFunctionHealthChecks` from `./edge-functions`
- Import `runDatabaseHealthChecks` from `./database`
- Import logger from `./logger`

**Validation:** Run `pnpm typecheck` to ensure no TypeScript errors.

---

### Step 7: Update Existing Health Check Routes

Update the existing health check routes to use the new utilities.

#### 7a. Update Edge Functions Routes

**File:** `src/server/api/routes/health/edge-functions.ts`

**Changes:**
- Replace Supabase direct calls with utility functions
- Import `pingEdgeFunction` and `validateEdgeFunctionAuth` from `@/lib/health`
- Simplify route handlers to delegate to utilities

**Before:**
```typescript
const { data, error } = await supabaseAdmin.functions.invoke('health-check', { ... })
```

**After:**
```typescript
const result = await pingEdgeFunction({ functionName: 'health-check' })
return c.json(result)
```

**Validation:** Run `pnpm typecheck` to ensure no TypeScript errors.

#### 7b. Update Database Routes

**File:** `src/server/api/routes/health/database.ts`

**Changes:**
- Replace Supabase direct calls with utility functions
- Import `writeTestRow`, `readTestRow`, `deleteTestRow` from `@/lib/health`
- Simplify route handlers to delegate to utilities

**Before:**
```typescript
await supabaseAdmin.from('health_check_tests').insert({ ... })
```

**After:**
```typescript
const result = await writeTestRow()
return c.json(result)
```

**Validation:** Run `pnpm typecheck` to ensure no TypeScript errors.

#### 7c. Update Health Index Routes

**File:** `src/server/api/routes/health/index.ts`

**Changes:**
- Add new `/unified` endpoint that uses `checkHealth()` function
- Import `checkHealth` from `@/lib/health`

**Add:**
```typescript
healthRoutes.get('/unified', async (c) => {
  const authHeader = c.req.header('authorization')
  const result = await checkHealth({
    edgeFunctions: [
      { functionName: 'health-check', validateAuth: true, authToken: authHeader }
    ],
  })
  return c.json(result)
})
```

**Validation:** Run `pnpm typecheck` to ensure no TypeScript errors.

---

### Step 8: Add Unit Tests

Create test files for each utility.

#### 8a. Edge Functions Tests

**File:** `src/lib/health/__tests__/edge-functions.test.ts`

**Test Cases:**
- `pingEdgeFunction` success case
- `pingEdgeFunction` error case (function not found)
- `validateEdgeFunctionAuth` with valid token
- `validateEdgeFunctionAuth` without token (warning)
- `validateEdgeFunctionAuth` with invalid token (error)
- `runEdgeFunctionHealthChecks` with multiple configs

**Validation:** Run `pnpm test src/lib/health/__tests__/edge-functions.test.ts`

#### 8b. Database Tests

**File:** `src/lib/health/__tests__/database.test.ts`

**Test Cases:**
- `writeTestRow` success case
- `writeTestRow` error case (database connection failure)
- `readTestRow` with existing row
- `readTestRow` without existing row
- `deleteTestRow` with existing row
- `deleteTestRow` without existing row
- `runDatabaseHealthChecks` full CRUD flow
- `runDatabaseHealthChecks` when write fails

**Validation:** Run `pnpm test src/lib/health/__tests__/database.test.ts`

#### 8c. Unified Check Tests

**File:** `src/lib/health/__tests__/index.test.ts`

**Test Cases:**
- `checkHealth` with all healthy checks
- `checkHealth` with edge function errors
- `checkHealth` with database errors
- `checkHealth` with mixed results
- `checkHealth` with no checks configured
- `checkHealth` with warnings only

**Validation:** Run `pnpm test src/lib/health/__tests__/index.test.ts`

---

### Step 9: Update Type Exports

Update `src/features/health-check/types.ts` to export new types if needed for UI components.

**File:** `src/features/health-check/types.ts`

**Changes:**
- Consider adding new types if UI components need them
- Ensure compatibility with existing `HealthStatus`, `ServiceCheck`, `ServiceHealth` types

**Validation:** Run `pnpm typecheck` to ensure no TypeScript errors.

---

### Step 10: Documentation

Update the existing health check documentation.

**File:** `docs/framework/health-check-system.md`

**Changes:**
- Add section on new health utilities
- Document the `checkHealth()` function
- Add usage examples
- Update architecture diagram if needed

**Validation:** Review documentation for clarity and completeness.

---

## Testing Strategy

### Unit Tests

Each utility function should have comprehensive unit tests covering:
- Success cases
- Error cases
- Edge cases (missing data, timeouts, etc.)

### Integration Tests

Integration tests should verify:
- Full CRUD flow works end-to-end
- Edge Function invocation with and without auth
- Error aggregation in unified check

### Test Coverage Goals

- Edge Functions: 90%+ coverage
- Database: 90%+ coverage
- Unified check: 95%+ coverage

---

## Validation Checklist

After completing each step, validate:

- [ ] TypeScript compiles without errors (`pnpm typecheck`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Unit tests pass (`pnpm test`)
- [ ] No console errors or warnings
- [ ] All imports resolve correctly

---

## Order of Execution

1. Create directory structure
2. Implement type definitions
3. Implement logger utility
4. Implement edge functions health check
5. Implement database health check
6. Implement unified health check
7. Update existing routes
8. Add unit tests
9. Update type exports
10. Update documentation

---

## Notes for Code Mode

- Use the exact type definitions and function signatures from the architecture document
- Follow the existing code style in the project (Prettier, ESLint)
- Ensure all error messages are descriptive and actionable
- Log all operations using the logger utility
- Clean up test data after each health check
- Handle all error cases gracefully
- Return consistent response formats
