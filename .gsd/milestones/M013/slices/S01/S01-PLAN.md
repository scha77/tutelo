# S01: Fix Broken Tests

**Goal:** All 14 test failures across 4 test files are resolved. `npx vitest run` reports 0 failures.
**Demo:** After this: npx vitest run shows 0 failures across all test files.

## Tasks
- [x] **T01: Replaced stale createClient mock with getAuthUser mock in admin layout access gate tests — all 9 tests pass** — Replace the `@/lib/supabase/server` mock with a `@/lib/supabase/auth-cache` mock. Mock `getAuthUser` to return `{ user, supabase, error }` where `supabase` has `auth.getUser()` for the email fetch. Restructure the `setupAuth` helper. Re-register the `auth-cache` mock in `beforeEach` after `resetModules()`. The admin page metrics tests (3 tests) are already passing — do not change them.
  - Estimate: 30m
  - Files: src/__tests__/admin-dashboard.test.ts
  - Verify: npx vitest run src/__tests__/admin-dashboard.test.ts — 0 failures
- [ ] **T02: Fix messaging.test.ts — update conversations mock chain for batch .or() pattern** — In the 'GET /api/conversations' describe block, replace the 3rd `fromMock.mockReturnValueOnce(...)` in each of the 3 failing tests with the new `.select().or()` chain shape. The `.or()` call returns an array of `{ conversation_id, body, sender_id, created_at }` objects (one per conversation). All other test blocks (POST /api/messages, email rate-limiting, GET /api/messages) are already passing — do not change them.
  - Estimate: 25m
  - Files: src/__tests__/messaging.test.ts
  - Verify: npx vitest run src/__tests__/messaging.test.ts — 0 failures
- [ ] **T03: Fix parent-phone-storage and recurring-charges tests** — (1) In `parent-phone-storage.test.ts`, add `.from()` to the mock supabase returned by `setupDeferredMocks` — it needs to handle `.from('teachers').select('slug').eq('id', teacherId).single()`. Also fix the 2 'skips phone UPDATE' tests that incorrectly assert `supabaseAdmin.from` was not called — the slug revalidation uses the SSR `supabase` client, not `supabaseAdmin`. (2) In `recurring-charges.test.ts`, fix the `idempotencyKey` assertion to exact match `'recurring-charge-booking-recurring-1'` and use plain object match instead of `expect.objectContaining`.
  - Estimate: 20m
  - Files: src/__tests__/parent-phone-storage.test.ts, src/__tests__/recurring-charges.test.ts
  - Verify: npx vitest run src/__tests__/parent-phone-storage.test.ts src/__tests__/recurring-charges.test.ts — 0 failures
