# S01: Fix Broken Tests — UAT

**Milestone:** M013
**Written:** 2026-04-07T14:03:29.941Z

## UAT: Fix Broken Tests (S01)

### Preconditions
- Node.js 18+ installed with `node_modules` present
- `.env.local` available (or symlinked if in a worktree)
- `.gsd/**` excluded in `vitest.config.ts`

### Test 1: Full Suite Green
1. Run `npx vitest run`
2. **Expected:** 48 test files pass, 470 tests pass, 0 failures
3. **Expected:** Exit code 0

### Test 2: Admin Dashboard Tests
1. Run `npx vitest run src/__tests__/admin-dashboard.test.ts`
2. **Expected:** 9/9 tests pass — access gate tests mock `getAuthUser` from `@/lib/supabase/auth-cache`
3. **Expected:** Access denied test returns 404 (not redirect) for unauthorized users
4. **Expected:** Metrics tests (3) pass without changes

### Test 3: Messaging Tests
1. Run `npx vitest run src/__tests__/messaging.test.ts`
2. **Expected:** 21/21 tests pass
3. **Expected:** GET /api/conversations tests use `.select().or()` mock shape for batch message fetch
4. **Expected:** POST /api/messages and email rate-limiting tests unchanged and passing

### Test 4: Parent Phone Storage Tests
1. Run `npx vitest run src/__tests__/parent-phone-storage.test.ts`
2. **Expected:** 6/6 tests pass
3. **Expected:** Mock supabase includes `.from('teachers').select('slug')` chain for slug revalidation

### Test 5: Recurring Charges Tests
1. Run `npx vitest run src/__tests__/recurring-charges.test.ts`
2. **Expected:** 8/8 tests pass
3. **Expected:** `idempotencyKey` assertion uses exact match `'recurring-charge-booking-recurring-1'` (no date suffix)

### Edge Cases
- **Worktree execution:** If running inside `.gsd/worktrees/`, `.env.local` must be symlinked from main project root
- **Stale test discovery:** `.gsd/**` must be in vitest exclude list to prevent phantom failures from old worktree test files
- **Todo stubs:** 45 `it.todo()` stubs remain across `tests/` — these are deferred to S03 and do not count as failures
