---
id: S03
parent: M013
milestone: M013
provides:
  - (none)
requires:
  []
affects:
  []
key_files:
  - tests/stripe/mark-complete.test.ts
  - tests/stripe/auto-cancel.test.ts
  - tests/stripe/reminders-cron.test.ts
  - tests/unit/og-metadata.test.ts
  - tests/bookings/booking-action.test.ts
  - tests/stripe/checkout-session.test.ts
key_decisions:
  - Used call-order tracking array to verify email-after-update sequencing in cron tests rather than brittle mock call index inspection
patterns_established:
  - Call-order tracking array for verifying async operation sequencing in cron tests
  - Supabase mock must return { data, error } envelope — not raw data — for .single()/.maybeSingle() chains
observability_surfaces:
  - none
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-04-07T15:19:19.931Z
blocker_discovered: false
---

# S03: Test Stub Audit & Cleanup

**Resolved all 45 it.todo() stubs and 4 it.skip() tests — 29 stubs deleted as covered/obsolete, 16 converted to real passing tests, 4 skipped tests fixed — full suite at 490 passing with 0 todo and 0 skip.**

## What Happened

The slice resolved every orphaned test stub in the codebase across four tasks.

**T01 — Bulk deletion (29 stubs removed).** Deleted 7 files that contained only it.todo() stubs with no passing tests: session auth (E2E scope), onboarding wizard (stale component), booking-calendar (decomposed in M011), three email test files (covered by integration tests), and connect-stripe (trivial action). Removed 6 more stubs from 2 mixed files (booking-action.test.ts and checkout-session.test.ts) while preserving their 9 passing tests. The submitBookingRequest stubs were obsolete — that code path migrated to the direct-booking API route.

**T02 — markSessionComplete tests (6 stubs → 6 passing).** Implemented full tests for the mark-complete server action: PI retrieve + capture with correct amount, 7% platform fee calculation, booking status update to 'completed', sendSessionCompleteEmail dispatch, auth guard, and booking-not-found error path. Required building Supabase chain mocks for teachers and bookings queries plus supabaseAdmin mock for review insert.

**T03 — Cron route tests (10 stubs → 10 passing).** Built 5 tests for auto-cancel cron (auth rejection, cancels unconnected-teacher bookings >48hr, skips connected teachers, idempotency on re-run, email-after-update ordering) and 5 for stripe-reminders cron (auth rejection, 24hr gentle reminder, 48hr urgent email, no-email-under-24hr, skip-on-connected). Used a call-order tracking array to verify email sends happen after status updates, which is cleaner than inspecting mock call indices.

**T04 — OG metadata skipped tests (4 skip → 4 passing).** Root cause was the Supabase mock returning raw teacher data instead of the `{ data, error }` envelope. Production code destructures `{ data }`, so raw data yielded undefined and metadata always fell back to defaults. Fixed by wrapping mock returns in the correct envelope shape.

## Verification

1. `npx vitest run` — 52 test files, 490 tests passed, 0 todo, 0 skip, 0 failures.
2. `rg 'it\.(todo|skip)\(' tests/ src/` — 0 matches (exit code 1, confirming no stubs remain).
3. Each task independently verified its subset: T01 confirmed 470→470 (no regressions from deletions), T02 confirmed 470→476, T03 confirmed targeted 10 passing, T04 confirmed 476→490 final total.

## Requirements Advanced

None.

## Requirements Validated

- R004 — 52 test files, 490 tests, 0 it.todo(), 0 it.skip(), 0 failures. rg confirms zero stubs remain in tests/ and src/.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

None.

## Known Limitations

None.

## Follow-ups

None.

## Files Created/Modified

None.
