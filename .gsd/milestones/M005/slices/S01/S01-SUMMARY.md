---
id: S01
parent: M005
milestone: M005
provides:
  - DB migration 0008 adding phone_number, sms_opt_in, verified_at to teachers; parent_phone, parent_sms_opt_in to bookings
  - src/lib/sms.ts with sendSmsReminder and sendSmsCancellation (Twilio SDK, E.164 formatting, opt-in gated)
  - Zod schemas extended — Step1Schema, ProfileUpdateSchema, BookingRequestSchema — with phone/opt-in fields
  - Teacher phone collection UI in WizardStep1 (onboarding) and AccountSettings (dashboard)
  - CredentialsBar badge gated on isVerified prop (no hardcoded badge)
  - cancelSession wired to send SMS alongside email; session-reminders cron wired to send SMS alongside email
  - 8 SMS unit tests; cancel-session and reminders tests updated with SMS mocks
requires: []
affects: [S02, S03]
key_files:
  - supabase/migrations/0008_sms_and_verification.sql
  - src/lib/sms.ts
  - src/__tests__/sms.test.ts
  - src/lib/schemas/onboarding.ts
  - src/lib/schemas/booking.ts
  - src/actions/profile.ts
  - src/components/onboarding/WizardStep1.tsx
  - src/components/dashboard/AccountSettings.tsx
  - src/components/profile/CredentialsBar.tsx
  - src/app/[slug]/page.tsx
  - src/actions/bookings.ts
  - src/app/api/cron/session-reminders/route.ts
key_decisions:
  - Module-level Twilio client instantiation (mirrors Resend pattern in email.ts)
  - supabaseAdmin for DB reads inside SMS functions — infrastructure, not user-scoped
  - Fire-and-forget pattern — SMS failures logged but never block calling action/cron
  - Dynamic import for sendSmsCancellation in cancelSession; static import in cron
  - US-only phone validation via libphonenumber-js; international deferred
  - Badge gating via isVerified boolean prop rather than passing verified_at directly
patterns_established:
  - SMS opt-in guard: check phone_number && sms_opt_in before every send
  - E.164 normalization via libphonenumber-js parsePhoneNumber(phone, 'US')
  - Zod phone validation: optional string with libphonenumber-js refine, empty coerced to null
  - Phone + opt-in paired fields — opt-in forced false when phone is empty
  - Fire-and-forget SMS: dynamic import + .catch(console.error) in actions; static import in cron
observability_surfaces:
  - console.warn/error prefixed [sms] for skipped sends and Twilio failures
  - teachers.phone_number and teachers.sms_opt_in in Supabase
  - bookings.parent_phone and bookings.parent_sms_opt_in in Supabase
  - Twilio dashboard for delivery status
drill_down_paths:
  - .gsd/milestones/M005/slices/S01/tasks/T01-SUMMARY.md
  - .gsd/milestones/M005/slices/S01/tasks/T02-SUMMARY.md
  - .gsd/milestones/M005/slices/S01/tasks/T03-SUMMARY.md
duration: 70min
verification_result: passed
completed_at: 2026-03-16T22:59:20.267Z
---

# S01: SMS Infrastructure & Teacher Phone Collection

**Twilio SMS pipeline built end-to-end: migration adds 5 DB columns, `sms.ts` sends reminders and cancellation alerts with E.164 formatting and opt-in gating, teacher phone collected in onboarding and settings, CredentialsBar badge fixed to be verification-aware, and both cancelSession and reminder cron extended to dispatch SMS alongside email.**

## What Happened

**T01** installed `twilio@5.13.0` and `libphonenumber-js@1.12.40`, created migration 0008 with 5 additive columns (`teachers.phone_number`, `teachers.sms_opt_in`, `teachers.verified_at`, `bookings.parent_phone`, `bookings.parent_sms_opt_in`), and built `src/lib/sms.ts` (133 lines) with module-level Twilio client, `toE164()` helper, `sendSmsReminder(bookingId)` and `sendSmsCancellation(bookingId)`. Both functions fetch from supabaseAdmin, guard on phone + opt-in, format to E.164, and call Twilio. Eight unit tests validate opt-in guards, happy paths, parent/teacher send paths, and graceful error handling.

**T02** extended three Zod schemas: `Step1Schema` with optional US phone + sms_opt_in, `ProfileUpdateSchema` with nullable phone + opt-in, and `BookingRequestSchema` with parent_phone + parent_sms_opt_in (schema only, UI in S02). Added phone input and SMS opt-in checkbox to `WizardStep1.tsx` (below photo upload, checkbox disabled when phone empty) and `AccountSettings.tsx` (controlled state, opt-in forced false when phone cleared). Settings page select query updated to include phone fields.

**T03** fixed the hardcoded CredentialsBar badge by adding `isVerified: boolean` prop and wrapping in `{isVerified && ...}`. Public profile passes `!!teacher.verified_at`. Wired `sendSmsCancellation` into `cancelSession` (dynamic import, fire-and-forget after email) and `sendSmsReminder` into the session-reminders cron (static import, after email in loop). Updated both `cancel-session.test.ts` and `reminders.test.ts` with SMS mocks; all existing tests pass.

## Verification

- `npx vitest run src/__tests__/sms.test.ts` — **8/8 tests pass**
- `npx vitest run src/__tests__/cancel-session.test.ts` — all 8 tests pass with SMS mock
- `npx vitest run src/__tests__/reminders.test.ts` — all tests pass with SMS assertion
- `npm run build` — zero errors
- CredentialsBar badge: `{isVerified && (` at line 22 — conditional render confirmed
- Public profile: `isVerified={!!teacher.verified_at}` at line 178 — wiring confirmed

## Deviations

None. All three tasks executed within planned scope.

## Known Limitations

- **SMS delivery requires Twilio credentials and A2P registration** — code is complete and testable with mocked client, but production SMS to non-test numbers requires A2P 10DLC registration (2–4 weeks) or toll-free number.
- **US-only phone validation** — libphonenumber-js validates against 'US' country code only. International phone numbers rejected.
- **Phone numbers stored as-is for parents** — teacher phone uses Zod + libphonenumber-js validation, but BookingRequestSchema's parent_phone is an unvalidated optional string (S02 adds UI but not strict validation).

## Follow-ups

- S02 wires parent phone collection UI on the booking form (both deferred and direct paths)
- S03 builds the school email verification flow that earns the verified_at timestamp gating the badge
- Server-side E.164 normalization for parent phone numbers (currently free-text)

## Files Created/Modified

- `supabase/migrations/0008_sms_and_verification.sql` — 5 additive ALTER TABLE columns
- `src/lib/sms.ts` — SMS module: sendSmsReminder, sendSmsCancellation, toE164, sendSms
- `src/__tests__/sms.test.ts` — 8 unit tests with class-based Twilio mock
- `src/lib/schemas/onboarding.ts` — Step1Schema with phone_number + sms_opt_in
- `src/lib/schemas/booking.ts` — BookingRequestSchema with parent_phone + parent_sms_opt_in
- `src/actions/profile.ts` — ProfileUpdateSchema with phone_number + sms_opt_in
- `src/components/onboarding/WizardStep1.tsx` — Phone input + opt-in checkbox
- `src/components/dashboard/AccountSettings.tsx` — Phone input + opt-in checkbox with controlled state
- `src/components/profile/CredentialsBar.tsx` — Badge gated on isVerified prop
- `src/app/[slug]/page.tsx` — Passes isVerified={!!teacher.verified_at}
- `src/actions/bookings.ts` — cancelSession calls sendSmsCancellation fire-and-forget
- `src/app/api/cron/session-reminders/route.ts` — Cron calls sendSmsReminder after email
- `src/__tests__/cancel-session.test.ts` — Added @/lib/sms mock
- `src/__tests__/reminders.test.ts` — Added @/lib/sms mock + SMS assertion
- `package.json` — Added twilio and libphonenumber-js

## Forward Intelligence

### What the next slice should know
- `src/lib/sms.ts` exports `sendSmsReminder(bookingId)` and `sendSmsCancellation(bookingId)` — both do their own supabaseAdmin fetch internally.
- `BookingRequestSchema` already has `parent_phone` and `parent_sms_opt_in` fields — S02 only needs to add UI.
- `teachers.verified_at` column exists from migration 0008 — S03 does not need to re-add it.
- The `vi.hoisted()` class-based mock pattern is documented in KNOWLEDGE.md for Resend; Twilio uses a different pattern (function call, not constructor).

### What's fragile
- SMS sends are fire-and-forget with `.catch(console.error)` — silent failures are intentional but mean no retry or alerting on send failure.
- Module-level `Twilio(SID, TOKEN)` will throw at import time if env vars are undefined — acceptable for server-only code but would break client bundles if imported there.
