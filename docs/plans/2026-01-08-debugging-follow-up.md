# Debugging Follow-Up Plan

**Date:** 2026-01-08
**Status:** Typecheck Pass (0 errors) | Tests: 577 pass / 84 fail (87% pass rate)

---

## Completed Fixes ✅

| Issue | Status | Impact |
|-------|--------|--------|
| Hono Context Type Safety | ✅ Complete | ~40 TypeScript errors fixed |
| Webhook event.data.id undefined | ✅ Complete | Build unblocked |
| Null handling in status routes | ✅ Complete | Runtime safety improved |
| Date serialization (sessions.test.ts) | ✅ Complete | 3 tests now passing |
| Vitest mock warnings | ✅ Complete | Warnings resolved |
| Top-header component auth | ✅ Complete | Component fixed |
| DB.raw() → sql template literals | ✅ Complete | Drizzle ORM compatibility |

---

## Remaining Work

### High Priority: Test Failures (84 tests)

**Pattern:** Date serialization in test mocks

**Root Cause:**
Tests create mock data with `Date` objects, but JSON serialization converts them to ISO strings. The tests use `toEqual()` which checks deep equality.

**Files to Fix:**
```
src/server/api/routes/users/__tests__/mutations.test.ts  (2 failures)
src/app/api/webhooks/clerk/__tests__/route.test.ts      (multiple failures)
```

**Fix Pattern (same as sessions.test.ts):**
```typescript
// Before:
const mockUser = { createdAt: new Date(), updatedAt: new Date() };

// After:
const now = new Date().toISOString();
const mockUser = { createdAt: now, updatedAt: now };
```

**Estimated Time:** 15 minutes

---

### Low Priority: Documentation Updates

1. Update `CLAUDE.md` with Hono environment type patterns
2. Document the `orgId → companyId` mapping pattern
3. Add note about Drizzle `sql` template literals vs `db.raw()`

---

### Optional Improvements

1. **API Response Type Safety**
   - Consider adding response type definitions for API routes
   - This would catch Date serialization issues at compile time

2. **Null Handling Strategy**
   - Document when to use `null` vs `undefined`
   - Consider standardizing on `undefined` for optional fields

3. **Test Utilities**
   - Create a helper function for generating test dates:
   ```typescript
   const testDate = () => new Date().toISOString();
   ```

---

## Implementation Order

**Next Session:**
1. Fix remaining date serialization tests (15 min)
2. Run tests to verify 100% pass rate
3. Update documentation (15 min)

**Future:**
4. Consider adding API response types
5. Create test utilities for common patterns

---

## Success Metrics

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| TypeScript Errors | 50+ | 0 | ✅ 0 |
| Test Pass Rate | 86% | 87% | 100% |
| Build Status | Blocked | Unblocked | ✅ Passing |
| Type Safety | Poor | Excellent | ✅ Excellent |

---

## Files Modified

**Core Infrastructure:**
- `src/server/api/types.ts` (NEW)
- `src/server/api/middleware/auth.ts`
- `src/server/db/queries/status.ts`

**Route Files:**
- `src/server/api/routes/clients/detail.ts`
- `src/server/api/routes/clients/list.ts`
- `src/server/api/routes/clients/search.ts`
- `src/server/api/routes/status/update.ts`
- `src/server/api/routes/status/bulk-update.ts`
- `src/server/api/routes/status/client-status.ts`
- `src/server/api/routes/status/history.ts`
- `src/server/api/routes/status/summary.ts`
- `src/server/api/routes/sync/jobs.ts`

**Test Files:**
- `src/server/api/routes/users/__tests__/sessions.test.ts`
- `src/lib/cache/__tests__/redis.test.ts`
- `src/lib/rate-limit/__tests__/rate-limit.test.ts`

**Webhook:**
- `src/app/api/webhooks/clerk/route.ts`

**Components:**
- `src/components/layouts/top-header.tsx`

**Database:**
- `src/server/db/seed/organization.ts`

---

## Technical Notes

### Hono Environment Types

**Problem:** Context variables `userId` and `orgId` were not typed

**Solution:** Created `ApiEnv` interface and `ApiHono` factory
```typescript
export interface ApiEnv {
  Variables: {
    userId: string;
    orgId: string | null;
    auth: { userId: string; orgId: string | null };
  };
}

export const ApiHono = Hono as unknown as new () => Hono<ApiEnv>;
```

### orgId → companyId Mapping

**Pattern:** All routes now use this pattern:
```typescript
const userId = c.get("userId");
const orgId = c.get("orgId");
const companyId = orgId ?? "default";
```

**Rationale:**
- `hasPermission()` expects non-null `companyId`
- `orgId` from Clerk can be `null` (no org)
- Using `"default"` as fallback maintains type safety

### Drizzle Raw SQL

**Pattern:** Use `sql` template literals instead of `db.raw()`
```typescript
// Before: db.raw(`COALESCE(...)`)
// After: sql`COALESCE(...)`.as("name")
```

---

## Verification Commands

```bash
# Type checking
pnpm typecheck

# Run all tests
pnpm test

# Run specific test file
pnpm test src/server/api/routes/users/__tests__/sessions.test.ts

# Build verification
pnpm build
```
