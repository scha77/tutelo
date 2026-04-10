---
id: T03
parent: S05
milestone: M015
key_files:
  - tests/e2e/booking-e2e.spec.ts
key_decisions:
  - Used h1 locator for sessions heading to avoid strict mode violation
  - Moved cleanup to Teacher Cancellation afterAll so booking survives between describe blocks
  - Separate browser page for teacher login to avoid parent session cookie conflicts
duration: 
verification_result: passed
completed_at: 2026-04-10T06:47:20.865Z
blocker_discovered: false
---

# T03: Added teacher cancellation flow — full E2E suite 10 passed, 1 skipped (Stripe card fill)

**Added teacher cancellation flow — full E2E suite 10 passed, 1 skipped (Stripe card fill)**

## What Happened

Added a second test.describe.serial('Teacher Cancellation') block with 4 serial tests: teacher login, find-and-cancel booking on /dashboard/sessions, DB status verification, and soft cancellation email check. Used a fresh browser page for teacher auth, moved data cleanup from Booking Flow to Cancellation afterAll so the booking survives between blocks, added cache-aware reload pattern for unstable_cache, and set up dialog handler for window.confirm(). Fixed strict mode violation by using h1 locator for sessions heading.

## Verification

Full suite: E2E_STRIPE_CONNECTED_ACCOUNT_ID=acct_1T9GPSIvlkImC13E npx playwright test booking-e2e --reporter=list — 10 passed, 1 skipped, 0 failed in 48.8s

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `E2E_STRIPE_CONNECTED_ACCOUNT_ID=acct_1T9GPSIvlkImC13E npx playwright test booking-e2e --reporter=list` | 0 | ✅ pass (10 passed, 1 skipped) | 48800ms |

## Deviations

Used h1 locator instead of getByText for sessions heading; no seed.ts changes needed (teacher auth already existed from T01)

## Known Issues

Resend API returns 401 — email verification is soft-asserted. Stripe card fill remains skipped (T02 known issue).

## Files Created/Modified

- `tests/e2e/booking-e2e.spec.ts`
