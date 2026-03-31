---
id: S03
parent: M009
milestone: M009
provides:
  - cancel_token column on recurring_schedules with fast partial index
  - manageUrl embedded in parent recurring booking confirmation emails
  - cancelSingleRecurringSession and cancelRecurringSeries server actions for teacher dashboard use
  - RecurringCancellationEmail template and sendRecurringCancellationEmail helper
  - Recurring badge and Payment Failed badge on ConfirmedSessionCard
  - Cancel Series button on ConfirmedSessionCard wired to cancelRecurringSeries
  - /manage/[token] self-service page for parents (no login required)
  - /api/manage/cancel-session and /api/manage/cancel-series token-gated API routes
  - 26 passing unit tests covering all cancellation paths
requires:
  - slice: S01
    provides: recurring_schedules table with teacher_id, student_name, subject, start_time; createRecurring route structure
  - slice: S02
    provides: Stripe Customer per recurring schedule; payment_failed booking status; auto-charge infrastructure
affects:
  []
key_files:
  - supabase/migrations/0016_cancel_token.sql
  - src/app/api/direct-booking/create-recurring/route.ts
  - src/emails/RecurringBookingConfirmationEmail.tsx
  - src/lib/email.ts
  - src/emails/RecurringCancellationEmail.tsx
  - src/actions/bookings.ts
  - src/app/(dashboard)/dashboard/sessions/page.tsx
  - src/components/dashboard/ConfirmedSessionCard.tsx
  - src/app/api/manage/cancel-session/route.ts
  - src/app/api/manage/cancel-series/route.ts
  - src/app/manage/[token]/page.tsx
  - src/app/manage/[token]/CancelSeriesForm.tsx
  - src/__tests__/cancel-recurring.test.ts
  - src/__tests__/manage-cancel.test.ts
key_decisions:
  - cancel_token uses randomBytes(32).toString('hex') for 64-char hex tokens — same crypto pattern as review tokens elsewhere in the codebase (D022)
  - Token-gated /manage/[token] routes use fetch() not server actions — pages reached via email links have no auth session, so server actions would fail silently
  - cancelSingleRecurringSession and cancelRecurringSeries use supabaseAdmin for multi-status booking queries, bypassing RLS for teacher-gated server actions
  - cancelRecurringSeries batch-updates future bookings via .in('id', bookingIds) to minimize DB round-trips
  - CancelSeriesForm only renders after RSC validates the token — invalid/expired tokens never reach client-side JavaScript
patterns_established:
  - Token-gated self-service pages: RSC shell resolves token via supabaseAdmin, renders error/empty/active states, passes pre-fetched data to client component; client component uses fetch() for mutations against /api/* routes with token in body
  - Dual-variant React Email templates follow the established CancellationEmail pattern: isTeacher prop switches between teacher and parent copy, same styling vars (520px container, #f9fafb bg, sans-serif)
  - Series cancellation scope: 'future' means booking_date >= today (UTC date string, inclusive) — past sessions in a recurring series are never retroactively cancelled
  - Stripe PI void is non-blocking in all cancellation paths — try/catch with console.error, DB update + email always proceed regardless of Stripe response
observability_surfaces:
  - console.error logs on Stripe PI void failures in both server actions and API routes — these are the primary failure signal for partial cancellation issues
  - sendCancellationEmail and sendRecurringCancellationEmail are fire-and-forget — email delivery failures are not surfaced to the UI but will appear in Resend dashboard logs
  - cancelledCount returned by /api/manage/cancel-series response body for client-side success messaging
drill_down_paths:
  - .gsd/milestones/M009/slices/S03/tasks/T01-SUMMARY.md
  - .gsd/milestones/M009/slices/S03/tasks/T02-SUMMARY.md
  - .gsd/milestones/M009/slices/S03/tasks/T03-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-03-31T14:53:38.345Z
blocker_discovered: false
---

# S03: Cancellation & Dashboard Series UX

**Built end-to-end recurring series cancellation: cancel_token infrastructure, teacher dashboard badges + server actions, and parent self-service /manage/[token] page — all verified with 26 passing tests, zero type errors, and a clean production build.**

## What Happened

S03 delivered three cohesive layers of cancellation capability for recurring sessions.

**T01 — cancel_token Foundation**
Migration 0016 added `cancel_token` (TEXT UNIQUE) and `cancel_token_created_at` (TIMESTAMPTZ) to `recurring_schedules`, plus a partial index for fast token lookups. The create-recurring route generates a 64-char hex token via `randomBytes(32).toString('hex')` at schedule creation time, stores it, computes the manage URL, and passes it through `email.ts` to the parent's confirmation email. `RecurringBookingConfirmationEmail.tsx` gained an optional `manageUrl` prop that renders a "Manage your series" link only in the parent variant — never shown to teachers.

**T02 — Teacher Cancellation Actions + Dashboard UX**
`RecurringCancellationEmail.tsx` was created as a dual-variant React Email template (parent and teacher variants), following the established CancellationEmail pattern. `sendRecurringCancellationEmail({ scheduleId })` was added to `email.ts` — it fetches all relevant data internally via supabaseAdmin.

Two new server actions were added to `src/actions/bookings.ts`:
- `cancelSingleRecurringSession`: teacher-authenticated, handles confirmed/requested/payment_failed statuses, voids Stripe PI if present (try/catch, non-blocking), updates booking to cancelled, fires `sendCancellationEmail` fire-and-forget, revalidates paths.
- `cancelRecurringSeries`: teacher-authenticated, verifies schedule ownership via supabaseAdmin, fetches all future non-cancelled bookings (booking_date >= today), voids PIs per-booking (non-blocking), batch-updates all to cancelled via `.in('id', bookingIds)`, fires `sendRecurringCancellationEmail` fire-and-forget.

The sessions page query was extended to include `recurring_schedule_id`, `is_recurring_first`, and `status`, with the status filter broadened to include `payment_failed`. `ConfirmedSessionCard` gained three new optional props: a "Recurring" amber badge when `recurringScheduleId` is set, a "Payment Failed" amber badge replacing the green "Confirmed" badge when `status === 'payment_failed'`, and a "Cancel Series" button that calls `cancelSeriesAction(recurringScheduleId)` with a confirm dialog. 16 tests pass covering both server actions across all edge cases.

**T03 — Parent Self-Service /manage/[token] Page**
Two token-gated API routes were created under `/api/manage/`:
- `cancel-session`: POST, resolves cancel_token → schedule → verifies booking belongs to schedule + is in cancellable status → voids PI (non-blocking) → cancels booking → fires `sendCancellationEmail`.
- `cancel-series`: POST, resolves token → fetches all future non-cancelled bookings → voids PIs → batch-cancels → fires `sendRecurringCancellationEmail`. Returns `cancelledCount`.

The RSC shell at `src/app/manage/[token]/page.tsx` follows the `review/[token]` pattern: resolves `cancel_token` via supabaseAdmin, shows "Invalid or expired link" for bad tokens, "All sessions already cancelled" when no future bookings remain, or renders `CancelSeriesForm` with the sessions list.

`CancelSeriesForm.tsx` (client component) renders each upcoming session row with date, student name, status badge (Confirmed / Payment Failed), and a per-row "Cancel This Session" button. A "Cancel All Remaining" button appears at the bottom. Both actions show a confirm dialog, use `fetch()` for API calls (not server actions — no auth session exists on this page), remove cancelled sessions from local state reactively, and show a completion state when all sessions are cancelled. 10 tests pass covering both API routes with all edge cases including invalid tokens, ownership mismatches, non-cancellable statuses, and Stripe resilience.

## Verification

Three-gate verification run at slice close:

1. `npx vitest run cancel-recurring --reporter=verbose` → 16/16 tests pass (cancelSingleRecurringSession: 9 tests, cancelRecurringSeries: 7 tests)
2. `npx vitest run manage-cancel --reporter=verbose` → 10/10 tests pass (POST /api/manage/cancel-session: 5, POST /api/manage/cancel-series: 5)
3. `npx tsc --noEmit` → zero errors
4. `npm run build` → all 56 pages compile clean; `/api/manage/cancel-series`, `/api/manage/cancel-session`, and `/manage/[token]` confirmed in route manifest

## Requirements Advanced

None.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

None. All tasks completed without plan deviations. T01 renumbered inline step comments in create-recurring/route.ts (cosmetic only).

## Known Limitations

1. cancel_token is non-expiring — if a parent's email is compromised, the token remains valid for the life of the series. Rate-limiting or optional expiry can be added later if abuse is detected (noted in D022). 2. The /manage/[token] page has no SSR caching — each visit queries supabaseAdmin directly. For high-traffic scenarios, an ISR strategy or edge caching could reduce DB load. 3. cancelRecurringSeries via the teacher dashboard shows a confirm dialog but does not preview which sessions will be cancelled before confirming — a follow-up improvement.

## Follow-ups

1. Add rate-limiting middleware to `/api/manage/*` routes if token abuse is detected in production logs. 2. Consider adding a cancel-series preview modal to ConfirmedSessionCard showing the list of sessions to be cancelled before the teacher confirms. 3. Token expiry (optional, configurable) could be added as a migration if security policy requires it.

## Files Created/Modified

- `supabase/migrations/0016_cancel_token.sql` — New migration: adds cancel_token TEXT UNIQUE, cancel_token_created_at TIMESTAMPTZ, and partial index to recurring_schedules
- `src/app/api/direct-booking/create-recurring/route.ts` — Generates cancel_token via randomBytes(32), stores on schedule insert, computes manageUrl, passes to email helper
- `src/emails/RecurringBookingConfirmationEmail.tsx` — Added optional manageUrl prop; renders 'Manage your series' link in parent variant only
- `src/lib/email.ts` — Added manageUrl param to sendRecurringBookingConfirmationEmail; added sendRecurringCancellationEmail helper
- `src/emails/RecurringCancellationEmail.tsx` — New dual-variant React Email template for recurring series cancellation (parent + teacher)
- `src/actions/bookings.ts` — Added cancelSingleRecurringSession and cancelRecurringSeries server actions
- `src/app/(dashboard)/dashboard/sessions/page.tsx` — Extended query to include recurring_schedule_id, is_recurring_first; broadened status filter to include payment_failed; passes cancelSeriesAction to ConfirmedSessionCard
- `src/components/dashboard/ConfirmedSessionCard.tsx` — Added recurringScheduleId, bookingStatus, cancelSeriesAction props; Recurring badge, Payment Failed badge, Cancel Series button
- `src/app/api/manage/cancel-session/route.ts` — New token-gated POST route: validates token owns booking, voids PI, cancels booking, fires email
- `src/app/api/manage/cancel-series/route.ts` — New token-gated POST route: resolves token, cancels all future bookings, voids PIs, fires series email, returns cancelledCount
- `src/app/manage/[token]/page.tsx` — New RSC page: resolves cancel_token, handles invalid/empty states, renders CancelSeriesForm
- `src/app/manage/[token]/CancelSeriesForm.tsx` — New client component: session list with per-session and cancel-all-remaining buttons, fetch()-based mutations, reactive state
- `src/__tests__/cancel-recurring.test.ts` — 16 tests for cancelSingleRecurringSession and cancelRecurringSeries server actions
- `src/__tests__/manage-cancel.test.ts` — 10 tests for /api/manage/cancel-session and /api/manage/cancel-series routes
