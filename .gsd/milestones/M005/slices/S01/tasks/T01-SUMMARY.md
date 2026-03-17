---
id: T01
parent: S01
milestone: M005
provides:
  - DB migration 0008 adding phone_number, sms_opt_in, verified_at to teachers; parent_phone, parent_sms_opt_in to bookings
  - src/lib/sms.ts with sendSmsReminder and sendSmsCancellation using Twilio SDK
  - E.164 phone formatting via libphonenumber-js (toE164 helper)
  - All SMS sends gated on phone_number IS NOT NULL AND sms_opt_in = true
  - 8 unit tests covering opt-in guard, happy path, parent/teacher send, error handling
requires: []
affects: [S02, S03]
key_files:
  - supabase/migrations/0008_sms_and_verification.sql
  - src/lib/sms.ts
  - src/__tests__/sms.test.ts
key_decisions:
  - "Module-level Twilio client instantiation (mirrors Resend pattern in email.ts)"
  - "supabaseAdmin for DB reads inside SMS functions — SMS module is infrastructure, not user-scoped"
  - "Fire-and-forget pattern — SMS failures logged but never block calling action/cron"
  - "vi.hoisted() class-based mock for Twilio (constructor not mockable with vi.fn())"
patterns_established:
  - "SMS opt-in guard: check phone_number && sms_opt_in before every send — pattern used by both sendSmsReminder and sendSmsCancellation"
  - "E.164 normalization via libphonenumber-js parsePhoneNumber(phone, 'US') before Twilio call"
drill_down_paths:
  - .gsd/milestones/M005/slices/S01/tasks/T01-PLAN.md
duration: 30min
verification_result: pass
completed_at: 2026-03-16T22:00:00Z
---

# T01: DB migration and SMS module with Twilio SDK and 8 unit tests

**Twilio-backed SMS infrastructure: migration 0008 adds 5 columns across teachers/bookings tables, `sms.ts` exports `sendSmsReminder` and `sendSmsCancellation` with E.164 formatting and opt-in gating, all validated by 8 passing unit tests.**

## What Happened

Installed `twilio@5.13.0` and `libphonenumber-js@1.12.40`. Created migration `0008_sms_and_verification.sql` with 5 additive ALTER TABLE statements: `teachers.phone_number TEXT`, `teachers.sms_opt_in BOOLEAN DEFAULT FALSE`, `teachers.verified_at TIMESTAMPTZ` (for S03), `bookings.parent_phone TEXT`, `bookings.parent_sms_opt_in BOOLEAN DEFAULT FALSE`.

Built `src/lib/sms.ts` (133 lines) with module-level Twilio client (`Twilio(SID, TOKEN)`), a private `toE164()` helper using `parsePhoneNumber` from libphonenumber-js, and a private `sendSms(to, body)` wrapper. Two exported functions:

- `sendSmsReminder(bookingId)` — fetches booking + teacher join from supabaseAdmin, sends to teacher if `phone_number && sms_opt_in`, sends to parent if `parent_phone && parent_sms_opt_in`, with E.164 formatting and try/catch per send.
- `sendSmsCancellation(bookingId)` — same fetch pattern, sends cancellation text to parent then teacher, same opt-in guards.

Unit tests in `src/__tests__/sms.test.ts` (238 lines, 8 tests across 2 describe blocks) cover: both recipients opted in (happy path), teacher phone null, teacher opt-in false, parent opt-in false, booking not found, cancellation parent send, cancellation skip, and Twilio error graceful handling.

## Deviations

None. Implementation matched the plan.

## Files Created/Modified

- `supabase/migrations/0008_sms_and_verification.sql` — 5 additive columns across teachers and bookings tables
- `src/lib/sms.ts` — SMS module with sendSmsReminder, sendSmsCancellation, toE164, sendSms
- `src/__tests__/sms.test.ts` — 8 unit tests with vi.hoisted() class-based Twilio mock
- `package.json` — Added twilio and libphonenumber-js dependencies
