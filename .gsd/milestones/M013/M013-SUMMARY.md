---
id: M013
title: "Codebase Cohesion & Observability"
status: complete
completed_at: 2026-04-07T15:57:04.033Z
key_decisions:
  - D060: M013 scope fence — internal quality only, no UI changes, no features, no migrations
  - D061: Sentry chosen for error tracking (free tier, first-class Next.js SDK)
  - tunnelRoute /monitoring for ad-blocker bypass on Sentry event delivery
  - errorHandler warns instead of failing build without SENTRY_AUTH_TOKEN — graceful degradation
  - Replays disabled (0 sample rate) — error capture only, no session recording
  - Fire-and-forget .catch(console.error) upgraded to include Sentry before console.error
  - JSON parse guards and timezone/Intl fallbacks correctly excluded from Sentry instrumentation
  - Call-order tracking array pattern for verifying async operation sequencing in cron tests
  - 29 test stubs deleted as covered/obsolete vs 16 converted to real tests — pragmatic triage
key_files:
  - sentry.client.config.ts
  - sentry.server.config.ts
  - sentry.edge.config.ts
  - src/instrumentation.ts
  - next.config.ts
  - src/app/error.tsx
  - src/app/global-error.tsx
  - src/actions/bookings.ts
  - src/app/api/stripe/webhook/route.ts
  - src/app/api/cron/recurring-charges/route.ts
  - tests/stripe/mark-complete.test.ts
  - tests/stripe/auto-cancel.test.ts
  - tests/stripe/reminders-cron.test.ts
  - tests/unit/og-metadata.test.ts
  - .gsd/REQUIREMENTS.md
lessons_learned:
  - Mock drift is the #1 cause of test rot — when production code changes an import path or query shape, the test mock must update in the same commit
  - Supabase mock .single()/.maybeSingle() must return {data, error} envelope, not raw data — this burned two separate slices (S01 messaging, S03 og-metadata)
  - vi.mock('@sentry/nextjs') factory must export captureException, init, and captureRequestError to cover all import patterns across test files
  - Call-order tracking arrays are cleaner than mock call index inspection for verifying async operation sequencing
  - Requirements rebuild from scratch is faster than incrementally fixing a damaged REQUIREMENTS.md — 151 entries in 3 tasks
---

# M013: Codebase Cohesion & Observability

**Brought the codebase from 'features work' to 'maintainable and observable' — fixed all 14 broken tests, integrated Sentry across 3 runtimes with 44 instrumented catch blocks, resolved all 45 test stubs, and rebuilt the full 151-entry capability contract.**

## What Happened

M013 was a pure maintenance milestone — no new features, no UI changes, no schema migrations. Four slices addressed the technical debt accumulated across M001–M012.

**S01 — Fix Broken Tests** resolved 14 test failures across 4 files. All were mock drift: production code moved import paths or changed query patterns (M010–M012) without updating corresponding test mocks. admin-dashboard tests needed getAuthUser mock instead of createClient; messaging tests needed batch .select().or() instead of per-conversation chains; parent-phone-storage needed a .from() chain for slug revalidation; recurring-charges needed exact idempotencyKey match. All fixes were mock-only — no production code changed. Suite went from 14 failures to 0 across 48 files, 470 tests.

**S02 — Sentry Integration** installed @sentry/nextjs and created client/server/edge config files plus an instrumentation.ts hook. next.config.ts was wrapped with withSentryConfig including tunnelRoute '/monitoring' for ad-blocker bypass. Both error boundaries (error.tsx, global-error.tsx) received captureException calls. All 18 server-side production files were audited: 44 catch blocks received Sentry.captureException, fire-and-forget .catch(console.error) patterns were upgraded to include Sentry reporting, and known-safe catches (JSON parse guards, timezone fallbacks, clipboard API) were correctly excluded. A uniform vi.mock('@sentry/nextjs') factory was added to all 20 affected test files.

**S03 — Test Stub Audit** eliminated all 45 it.todo() and 4 it.skip() stubs. 29 stubs were deleted (7 entire files of pure stubs + 6 individual stubs from mixed files) as obsolete or covered by integration tests. 16 stubs were converted to real passing tests: 6 for markSessionComplete (PI capture, fee calculation, status update, email dispatch, auth guard, not-found), 10 for cron routes (auto-cancel and stripe-reminders with auth, filtering, idempotency, and email ordering). 4 skipped og-metadata tests were fixed by correcting the Supabase mock return shape from raw data to {data, error} envelope. Suite grew from 470 to 490 tests, all passing.

**S04 — Requirements Rebuild** reconstructed the full capability contract from scratch after the M011 restructuring hollowed it to 14 entries. Three tasks registered 151 requirements across all M001–M012 milestones with stable IDs, class/status/ownership metadata, and legacy ID traceability. Every entry has a primary_owner linking to its source milestone.

## Success Criteria Results

### S01: npx vitest run shows 0 failures across all test files
✅ **MET** — `npx vitest run` reports 52 files passed, 490 tests passed, 0 failures. All 14 original failures resolved via mock realignment.

### S02: All catch blocks either re-throw, report to Sentry, or log with structured context
✅ **MET** — 44 catch blocks instrumented with Sentry.captureException across 18 production files. Error boundaries report to Sentry. Known-safe catches (JSON parse, timezone fallback) correctly excluded. SDK integrated across client/server/edge runtimes. Note: "appears in Sentry dashboard" requires DSN configuration (operational follow-up) — the code-level integration is complete and correct.

### S03: npx vitest run shows 0 todo stubs, every test either passes or was deliberately removed with justification
✅ **MET** — `rg 'it\.(todo|skip)\(' tests/ src/` returns 0 matches. 29 stubs removed with documented justification (obsolete, covered by integration, stale component). 16 stubs converted to real tests. 4 skips fixed. 490 tests pass.

### S04: REQUIREMENTS.md contains 124+ validated requirements with stable IDs, ownership traceability, and coverage summary
✅ **MET** — `grep -c '^### ' .gsd/REQUIREMENTS.md` returns 151 (exceeds 124 threshold). Every entry has stable ID, class, status, primary_owner milestone, and legacy ID notes.

## Definition of Done Results

### All slices complete
✅ S01 ✅, S02 ✅, S03 ✅, S04 ✅ — 4/4 slices complete, 13/13 tasks complete.

### All slice summaries exist
✅ S01-SUMMARY.md, S02-SUMMARY.md, S03-SUMMARY.md, S04-SUMMARY.md all present.

### Test suite green
✅ 52 files, 490 tests, 0 failures, 0 todo, 0 skip.

### No schema migrations
✅ No migration files created in this milestone. Pure code and test changes.

### No UI changes
✅ No user-facing component changes. Error boundaries are the only code touching app/ UI files, and they add Sentry reporting without visual changes.

## Requirement Outcomes

### R001 (Test Suite Health)
**Status: Validated** — npx vitest run: 52 files, 490 tests, 0 failures. All 14 mock-drift failures resolved in S01.

### R002 (Error Tracking Integration)
**Status: Validated** — Sentry SDK initialized on client/server/edge. Error boundaries call captureException. Source maps configured with errorHandler fallback. sendDefaultPii: false. 44 catch blocks instrumented.

### R003 (Error Handling Coverage)
**Status: Validated** — 44 catch blocks instrumented across 18 files. Catch block audit confirms no silent catch-and-ignore patterns. Fire-and-forget patterns upgraded.

### R004 (Test Completeness)
**Status: Validated** — 52 test files, 490 tests, 0 it.todo(), 0 it.skip(), 0 failures. rg confirms zero stubs remain.

### R005 (Capability Contract)
**Status: Validated** — REQUIREMENTS.md contains 151 entries with stable IDs, ownership traceability across M001–M012, and coverage summary.

## Deviations

None. All four slices executed as planned. S01/T03 had a minor deviation (planned assertion fixes were already correct — tests were crashing before reaching assertions), but no impact on deliverables.

## Follow-ups

Set NEXT_PUBLIC_SENTRY_DSN and SENTRY_AUTH_TOKEN in Vercel production environment. Create a Sentry project and configure alert rules. Consider adding Sentry.setUser() with non-PII identifier (user ID, role) after auth for richer error context.
