---
id: T02
parent: S02
milestone: M005
provides:
  - Server-side storage of parent_phone and parent_sms_opt_in on bookings row for both deferred and direct booking paths
key_files:
  - src/actions/bookings.ts
  - src/app/api/direct-booking/create-intent/route.ts
  - src/__tests__/parent-phone-storage.test.ts
key_decisions:
  - Phone UPDATE in deferred path uses supabaseAdmin (service role) because anon RLS is INSERT-only
  - Phone storage failure wrapped in try/catch — non-blocking so booking always succeeds
patterns_established:
  - Post-insert UPDATE pattern for RPC-created rows that need additional fields the RPC doesn't accept
observability_surfaces:
  - console.warn on phone UPDATE failure in submitBookingRequest — includes booking ID (no PII)
duration: 10m
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T02: Wire server-side phone storage for both booking paths and add unit tests

**Added post-insert phone UPDATE to deferred path and phone fields to direct path INSERT, with 6 passing unit tests**

## What Happened

1. **Deferred path** (`submitBookingRequest` in `src/actions/bookings.ts`): Added a post-insert UPDATE block after `create_booking()` RPC succeeds. When `parsed.data.parent_phone` is non-empty, it runs `supabaseAdmin.from('bookings').update({parent_phone, parent_sms_opt_in}).eq('id', booking_id)`. Wrapped in try/catch with `console.warn` — failure does not block booking confirmation.

2. **Direct path** (`create-intent/route.ts`): Added `parentPhone` and `parentSmsOptIn` to the destructured body, and `parent_phone: parentPhone ?? null` + `parent_sms_opt_in: parentSmsOptIn ?? false` to the `.insert()` object.

3. **Unit tests** (`src/__tests__/parent-phone-storage.test.ts`): Created 6 tests covering both paths — phone storage when provided, skip when absent/empty, graceful failure, direct path inclusion, and direct path defaults.

## Verification

- `npx vitest run src/__tests__/parent-phone-storage.test.ts` — **6/6 tests pass**
- `npx vitest run` — **402 tests pass**, 0 failures (57 test files pass, 20 skipped)
- `npm run build` — **zero errors**, compiled successfully

## Diagnostics

- Query `bookings` table for `parent_phone IS NOT NULL` to see stored phone numbers
- Grep server logs for `[submitBookingRequest] Failed to store parent phone` to find failed UPDATE attempts (includes booking ID, no PII)
- In direct path, phone is stored inline with the booking INSERT — no separate failure mode

## Deviations

None

## Known Issues

None

## Files Created/Modified

- `src/actions/bookings.ts` — Added post-insert phone UPDATE block after RPC success
- `src/app/api/direct-booking/create-intent/route.ts` — Added parentPhone/parentSmsOptIn destructuring and INSERT fields
- `src/__tests__/parent-phone-storage.test.ts` — New test file with 6 tests covering both booking paths
