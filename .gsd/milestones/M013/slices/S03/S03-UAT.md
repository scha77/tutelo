# S03: Test Stub Audit & Cleanup — UAT

**Milestone:** M013
**Written:** 2026-04-07T15:19:19.931Z

## Preconditions
- Working checkout of the codebase at the point after all S03 tasks completed
- Node.js 18+ and npm/pnpm installed
- `.env.local` available (or symlinked in worktree)

## Test 1: Full Suite — Zero Stubs, Zero Skips, Zero Failures
1. Run `npx vitest run`
2. **Expected:** 52 test files, 490 tests passed, 0 todo, 0 skip, 0 failures
3. **Pass criteria:** Exit code 0, no "todo" or "skip" in summary line

## Test 2: No it.todo() or it.skip() in Codebase
1. Run `rg 'it\.(todo|skip)\(' tests/ src/`
2. **Expected:** No output, exit code 1 (no matches)
3. **Pass criteria:** Zero matches across all test and source directories

## Test 3: Deleted Stub Files No Longer Exist
1. Verify these 7 files do NOT exist:
   - `tests/auth/session.test.ts`
   - `tests/onboarding/wizard.test.ts`
   - `tests/bookings/booking-calendar.test.tsx`
   - `tests/stripe/email-confirmation.test.ts`
   - `tests/stripe/email-complete.test.ts`
   - `tests/stripe/email-cancellation.test.ts`
   - `tests/stripe/connect-stripe.test.ts`
2. Run `ls tests/auth/session.test.ts tests/onboarding/wizard.test.ts tests/bookings/booking-calendar.test.tsx tests/stripe/email-confirmation.test.ts tests/stripe/email-complete.test.ts tests/stripe/email-cancellation.test.ts tests/stripe/connect-stripe.test.ts 2>&1`
3. **Expected:** All 7 report "No such file or directory"

## Test 4: Mixed Files Retain Passing Tests
1. Run `npx vitest run tests/bookings/booking-action.test.ts`
2. **Expected:** 5 tests pass (acceptBooking/declineBooking), 0 todo
3. Run `npx vitest run tests/stripe/checkout-session.test.ts`
4. **Expected:** 4 tests pass, 0 todo

## Test 5: markSessionComplete Tests Cover All Paths
1. Run `npx vitest run tests/stripe/mark-complete.test.ts`
2. **Expected:** 6 tests pass — PI capture, 7% fee, status update, email dispatch, auth guard, not-found error
3. **Pass criteria:** 0 todo, 0 skip, 0 failures

## Test 6: Cron Route Tests Cover All Paths
1. Run `npx vitest run tests/stripe/auto-cancel.test.ts tests/stripe/reminders-cron.test.ts`
2. **Expected:** 10 tests pass — auth, cancellation, skip-connected, idempotency, email-after-update, 24hr/48hr reminders
3. **Pass criteria:** 0 todo, 0 skip, 0 failures

## Test 7: OG Metadata Tests Pass Without Skips
1. Run `npx vitest run tests/unit/og-metadata.test.ts`
2. **Expected:** 4 tests pass — personalized metadata, fallback, no-subjects, null-subjects
3. **Pass criteria:** 0 skip, 0 failures

## Edge Case: Test Count Consistency
1. Run `npx vitest run 2>&1 | grep -E 'Tests|Test Files'`
2. **Expected:** "52 passed" for test files, "490 passed" for tests
3. **Rationale:** 59 original files − 7 deleted = 52; 470 original + 20 new (6 + 10 + 4) = 490
