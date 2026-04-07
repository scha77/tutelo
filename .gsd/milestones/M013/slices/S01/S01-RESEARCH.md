# S01 Research — Fix Broken Tests

## Summary

14 failures across 4 test files. All are mock drift — production code evolved across M010-M012 but test mocks weren't updated. The fixes are mechanical: update mock shapes to match current source signatures. No technology risk, no library changes, no ambiguous decisions.

## Requirement Coverage

- **R001 (Test Suite Fully Green)** — primary deliverable. This slice must reduce failures from 14 → 0.

## Failure Inventory

### Cluster 1: admin-dashboard.test.ts (6 failures)

**Root cause:** Admin layout (`src/app/(admin)/layout.tsx`) was refactored in M012 to use `getAuthUser()` from `@/lib/supabase/auth-cache`, which internally calls `supabase.auth.getClaims()`. The test mocks `@/lib/supabase/server`'s `createClient` returning `{ auth: { getUser: ... } }` — no `getClaims` method exists on the mock.

**Error:** `supabase.auth.getClaims is not a function`

**Fix approach:** Mock `@/lib/supabase/auth-cache` directly instead of mocking `createClient`. The `getAuthUser()` function returns `{ user: { id: string } | null, supabase, error }`. Mock it to return the desired user state per test. The `setupAuth` helper needs restructuring to return the `getAuthUser` shape.

**Also:** The layout then calls `supabase.auth.getUser()` for the email — the mock supabase object returned from `getAuthUser` needs both `getClaims` (for `getAuthUser` internals) and `getUser` (for the email fetch). The simplest approach: mock `getAuthUser` at the module boundary so the test doesn't need to simulate its internals.

**Files to change:** `src/__tests__/admin-dashboard.test.ts` (mock definitions + setupAuth helper)

### Cluster 2: parent-phone-storage.test.ts (4 failures)

**Root cause:** `submitBookingRequest` in `src/actions/bookings.ts` was extended (circa M012) to call `supabase.from('teachers').select('slug').eq(...)` for slug-specific `revalidatePath()` after a successful booking. The test mock for `createClient` returns `{ rpc: rpcMock }` only — no `.from()` method.

**Error:** `supabase.from is not a function` at bookings.ts:67

**Fix approach:** Add `.from()` to the mock supabase object returned by `createClient`. The mock needs to handle the chain: `.from('teachers').select('slug').eq('id', teacherId).single()` → returning `{ data: { slug: 'test-teacher' } }` or similar. The `setupDeferredMocks` helper needs to return a supabase client with both `rpc` and `from`.

**Files to change:** `src/__tests__/parent-phone-storage.test.ts` (setupDeferredMocks helper)

### Cluster 3: messaging.test.ts (3 failures)

**Root cause:** `GET /api/conversations` was refactored (M010/S04) to batch-fetch last messages using `.or(orFilter)` on the `messages` table. The test mocks provide three `.from()` calls: teacher lookup, conversations query, and last-message-per-conv. But the mock chain for the conversations query doesn't include an `.or()` method — the conversations query itself is fine (`.select().order().eq()`), but the follow-up messages query uses `.select().or()`.

**Error:** `supabaseAdmin.from(...).select(...).or is not a function`

**Fix approach:** The mock needs a 4th `.from()` return for the `messages` query with `.select().or()` chain. Currently the test provides 3 `fromMock` calls; it needs a 4th between the conversations query and the `getUserById` call (for teacher role) or as-is for parent role. The mock chain for messages: `{ select: () => ({ or: () => resolvedValue }) }`.

Actually, looking closer: the conversations route does 2 things with supabaseAdmin.from:
1. `from('teachers')` — teacher lookup
2. `from('conversations')` — conversations query (`.select().order().eq()`)  
3. `from('messages')` — batch last-message fetch (`.select().or()`)

The test provides only 3 fromMock returns, but the 3rd is for "last message per conv" using a different chain shape (`.select().eq().order().limit().maybeSingle()`). That old chain shape predates the batch-fetch refactor. The fix: replace the 3rd mock return with `{ select: () => ({ or: () => resolvedValue }) }` matching the new `.or()` query.

**Files to change:** `src/__tests__/messaging.test.ts` (3 test cases in "GET /api/conversations" describe block)

### Cluster 4: recurring-charges.test.ts (1 failure)

**Root cause:** The "successful charge" test expects the Stripe `paymentIntents.create` call to use `idempotencyKey: expect.stringContaining('recurring-charge-booking-recurring-1-')` (with trailing dash, implying a date suffix). The actual route code uses `{ idempotencyKey: \`recurring-charge-${bookingId}\` }` — no date suffix.

This is a straightforward assertion mismatch — the KNOWLEDGE.md entry describes the date-suffix pattern (`recurring-charge-{bookingId}-{tomorrowUtc}`), but the actual implementation uses only the booking ID. The test was written from KNOWLEDGE.md expectations rather than the actual source.

**Error:** `AssertionError: expected "vi.fn()" to be called with arguments: [ ObjectContaining{…}, …(1) ]`

**Fix approach:** Change the assertion from `expect.stringContaining('recurring-charge-booking-recurring-1-')` to exact match `'recurring-charge-booking-recurring-1'`. Also switch from `expect.objectContaining` wrappers to plain object match since the Stripe call passes the exact object (the diff shows no extra keys).

**Files to change:** `src/__tests__/recurring-charges.test.ts` (1 assertion in "successful charge" test)

## Recommendation

All four clusters are mechanical mock-shape fixes. No production code changes needed — only test files. The natural task decomposition follows the four files, but clusters 2 and 4 are small enough to combine.

**Suggested task split:**
- **T01:** Fix admin-dashboard.test.ts (6 failures) — mock `getAuthUser` instead of `createClient`
- **T02:** Fix messaging.test.ts (3 failures) — update conversations mock chain for `.or()` batch-fetch pattern
- **T03:** Fix parent-phone-storage.test.ts (4 failures) + recurring-charges.test.ts (1 failure) — add `.from()` to supabase mock + fix idempotency key assertion

**Verification:** `npx vitest run` → 0 failures. The 11 skipped files and 45 todo stubs are S03 scope.

## Implementation Landscape

### Files needing changes (test files only — no production code)

| File | Failures | Root cause |
|------|----------|-----------|
| `src/__tests__/admin-dashboard.test.ts` | 6 | Mock missing `getClaims` — layout uses `getAuthUser()` now |
| `src/__tests__/parent-phone-storage.test.ts` | 4 | Mock missing `.from()` on supabase client — bookings.ts added slug revalidation |
| `src/__tests__/messaging.test.ts` | 3 | Mock missing `.or()` — conversations route uses batch `.or()` for messages |
| `src/__tests__/recurring-charges.test.ts` | 1 | Assertion expects date-suffix idempotency key; actual uses booking-ID-only |

### Key patterns

- **getAuthUser mock pattern:** `vi.mock('@/lib/supabase/auth-cache', () => ({ getAuthUser: vi.fn() }))` — returns `{ user: { id: string } | null, supabase: mockSupabaseClient, error: null }`. This insulates tests from auth-cache internals.
- **Chainable Supabase mock:** The `makeChain` pattern in recurring-charges.test.ts is the cleanest chainable mock in the codebase — consider reusing it in other test fixes.
- **Resend mock pattern:** Already established in KNOWLEDGE.md — class-based mock in `vi.hoisted()`. No changes needed for this slice.

### Constraints

- `vi.resetModules()` is used in admin-dashboard and parent-phone-storage tests — mocks must be re-registered inside `beforeEach` after `resetModules()`.
- The admin layout calls `getUser()` on the supabase instance returned by `getAuthUser()` — the mock supabase needs an `auth.getUser` method returning email.
- Messaging tests mock `supabaseAdmin.auth.admin.getUserById` — this must stay since the conversations route uses it for parent name resolution.

## Skills Discovered

No new skills needed. The work is pure Vitest mock maintenance using patterns already established in the codebase.
