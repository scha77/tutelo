---
id: T03
parent: S01
milestone: M005
provides:
  - CredentialsBar badge gated on isVerified prop (no more hardcoded badge)
  - Public profile passes isVerified={!!teacher.verified_at} to CredentialsBar
  - cancelSession calls sendSmsCancellation fire-and-forget after email
  - Session-reminders cron calls sendSmsReminder after email in the loop
  - cancel-session.test.ts mocks @/lib/sms — all 8 tests pass
  - reminders.test.ts mocks @/lib/sms with SMS send assertion
requires:
  - slice: S01/T01
    provides: src/lib/sms.ts (sendSmsReminder, sendSmsCancellation)
affects: [S03]
key_files:
  - src/components/profile/CredentialsBar.tsx
  - src/app/[slug]/page.tsx
  - src/actions/bookings.ts
  - src/app/api/cron/session-reminders/route.ts
  - src/__tests__/cancel-session.test.ts
  - src/__tests__/reminders.test.ts
key_decisions:
  - "Dynamic import for sendSmsCancellation in cancelSession (same pattern as sendCancellationEmail) — avoids top-level import of Twilio in actions bundle"
  - "Static import for sendSmsReminder in cron route — cron always needs it, no bundle concern"
  - "Badge gating via isVerified prop (boolean) rather than passing full teacher.verified_at — simpler component interface"
patterns_established:
  - "Fire-and-forget SMS: dynamic import + .catch(console.error) in server actions; static import + .catch(console.error) in cron routes"
  - "SMS mock pattern for tests: vi.mock('@/lib/sms', () => ({ sendSmsCancellation: vi.fn(), sendSmsReminder: vi.fn() }))"
drill_down_paths:
  - .gsd/milestones/M005/slices/S01/tasks/T03-PLAN.md
duration: 20min
verification_result: pass
completed_at: 2026-03-16T22:59:00Z
---

# T03: CredentialsBar badge gated on verification status; SMS wired into cancelSession and reminder cron

**Hardcoded "Verified Teacher" badge replaced with `{isVerified && ...}` conditional; `cancelSession` dispatches SMS cancellation alongside email; session-reminders cron dispatches SMS reminder alongside email; all existing tests pass with SMS mocks.**

## What Happened

Fixed `CredentialsBar.tsx` by adding `isVerified: boolean` to the props interface and wrapping the badge div in `{isVerified && (<div>...</div>)}`. Updated `src/app/[slug]/page.tsx` to pass `isVerified={!!teacher.verified_at}` — the wildcard select already includes `verified_at` from migration 0008.

Wired SMS into `cancelSession` in `src/actions/bookings.ts` using the same dynamic import + fire-and-forget pattern as the existing email call: `const { sendSmsCancellation } = await import('@/lib/sms'); sendSmsCancellation(bookingId).catch(console.error)`. Placed after the email dispatch.

Wired SMS into the session-reminders cron in `src/app/api/cron/session-reminders/route.ts` with a static import at the top (`import { sendSmsReminder } from '@/lib/sms'`) and `sendSmsReminder(session.id).catch(console.error)` after the email call in the session loop.

Updated `src/__tests__/cancel-session.test.ts` to mock `@/lib/sms` with `sendSmsCancellation: vi.fn().mockResolvedValue(undefined)` — all 8 existing tests continue to pass since SMS is fire-and-forget.

Updated `src/__tests__/reminders.test.ts` with `vi.hoisted()` mock for `sendSmsReminder` and added assertion `expect(mockSendSmsReminder).toHaveBeenCalledWith('booking-1')` in the happy-path test.

## Deviations

None. Implementation matched the plan.

## Files Created/Modified

- `src/components/profile/CredentialsBar.tsx` — Badge wrapped in `{isVerified && ...}` conditional; isVerified prop added
- `src/app/[slug]/page.tsx` — Passes `isVerified={!!teacher.verified_at}` to CredentialsBar
- `src/actions/bookings.ts` — cancelSession calls sendSmsCancellation via dynamic import, fire-and-forget
- `src/app/api/cron/session-reminders/route.ts` — Static import of sendSmsReminder; called after email in loop
- `src/__tests__/cancel-session.test.ts` — Added @/lib/sms mock
- `src/__tests__/reminders.test.ts` — Added @/lib/sms mock with hoisted fn + SMS assertion
