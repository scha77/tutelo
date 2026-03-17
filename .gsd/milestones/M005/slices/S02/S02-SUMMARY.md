---
id: S02
parent: M005
milestone: M005
provides:
  - Optional phone number input + TCPA-compliant SMS consent checkbox on BookingCalendar form
  - Parent phone/consent forwarded through both deferred (submitAction) and direct (createPaymentIntent) booking paths
  - Server-side storage of parent_phone and parent_sms_opt_in on bookings row for both paths
  - shadcn/ui Checkbox component added to project
  - 6 new unit tests covering phone storage, skip-when-absent, graceful failure, and direct path defaults
requires:
  - slice: S01
    provides: src/lib/sms.ts (sendSmsReminder/sendSmsCancellation read parent_phone/parent_sms_opt_in from bookings row), DB columns bookings.parent_phone and bookings.parent_sms_opt_in from migration 0008, BookingRequestSchema with parent_phone/parent_sms_opt_in fields
affects: []
key_files:
  - src/components/profile/BookingCalendar.tsx
  - src/components/ui/checkbox.tsx
  - src/actions/bookings.ts
  - src/app/api/direct-booking/create-intent/route.ts
  - src/__tests__/parent-phone-storage.test.ts
key_decisions:
  - Consent checkbox conditionally rendered (not just disabled) when phone field is empty — cleaner UX; smsOptIn is forced false in payload logic regardless
  - Phone UPDATE in deferred path uses supabaseAdmin (service role) because anon RLS is INSERT-only on bookings
  - Phone storage failure in deferred path is wrapped in try/catch — non-blocking so booking always succeeds
  - Post-insert UPDATE pattern used for deferred path because the create_booking() RPC doesn't accept phone params
patterns_established:
  - TCPA-compliant SMS consent: checkbox unchecked by default, only visible when phone has content, consent forced false in payload when phone cleared
  - Post-insert UPDATE pattern for RPC-created rows that need additional fields the RPC doesn't accept (use supabaseAdmin, wrap in try/catch, never block booking return)
  - Conditional checkbox render (not disable) for optional-dependent fields — avoids confusing disabled state
observability_surfaces:
  - console.warn "[submitBookingRequest] Failed to store parent phone" — logged with booking ID (no PII) when UPDATE fails on deferred path
  - bookings table — query parent_phone IS NOT NULL to see stored phone numbers
  - Browser DevTools Network tab — inspect POST body to /api/direct-booking/create-intent for parentPhone/parentSmsOptIn
drill_down_paths:
  - .gsd/milestones/M005/slices/S02/tasks/T01-SUMMARY.md
  - .gsd/milestones/M005/slices/S02/tasks/T02-SUMMARY.md
duration: 30m
verification_result: passed
completed_at: 2026-03-17
---

# S02: Parent Phone Collection & Booking SMS

**Parent can optionally provide a phone number with TCPA-compliant SMS consent on the booking form; phone is stored on the bookings row for both deferred and direct booking paths, completing the parent leg of the SMS notification pipeline.**

## What Happened

**T01** added the user-visible form fields and wired both submission paths. The shadcn/ui Checkbox component was installed (`src/components/ui/checkbox.tsx`). `BookingCalendar.tsx` gained `phone: ''` and `smsOptIn: false` state fields (also reset in `handleBookAnother`). An optional phone input appears below the Notes textarea, and an SMS consent checkbox conditionally renders only when the phone field has content — it is unchecked by default with TCPA-compliant language ("Msg & data rates may apply. Reply STOP to opt out."). Both the deferred path (`submitAction`) and direct path (`createPaymentIntent` fetch body) forward `parent_phone` / `parent_sms_opt_in` with the empty-phone guard applied: consent is forced to `false` if phone is empty.

**T02** wired server-side storage. The deferred path (`submitBookingRequest` in `bookings.ts`) runs a post-insert UPDATE via `supabaseAdmin` after `create_booking()` RPC succeeds — phone storage failure is caught and logged but never blocks booking confirmation. The direct path (`create-intent/route.ts`) includes `parent_phone` and `parent_sms_opt_in` directly in the INSERT object, defaulting to `null` / `false` when absent. Six unit tests in `src/__tests__/parent-phone-storage.test.ts` cover: phone stored when provided, skipped when absent, skipped when empty string, booking succeeds when UPDATE fails, direct path includes phone fields, direct path defaults when fields absent.

## Verification

- `npx vitest run src/__tests__/parent-phone-storage.test.ts` — **6/6 tests pass**
- `npx vitest run` — **402 tests pass, 0 failures** (57 test files pass, 20 skipped)
- `npm run build` — **zero errors**, compiled successfully
- Browser verification (T01): phone input visible below Notes, consent checkbox hidden when phone empty, appears when phone has content, unchecked by default, TCPA text displayed, clearing phone hides checkbox

## Requirements Advanced

- **SMS-03** (parent phone collection) — parent phone + SMS opt-in now collected on booking form and stored on bookings row; both booking paths fully wired

## Requirements Validated

- **SMS-03** — both deferred and direct booking paths store parent_phone and parent_sms_opt_in; combined with S01's sms.ts functions reading those columns, the full parent SMS notification pipeline is wired end-to-end (delivery gated on opt-in)
- **SMS-01** (SMS session reminders) — parent leg complete; S01 established the cron path; parent_phone/parent_sms_opt_in now reachable from sendSmsReminder
- **SMS-02** / **CANCEL-02** (SMS cancellation alerts) — parent leg complete; cancelSession calls sendSmsCancellation which reads parent phone from the bookings row

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

None. All tasks executed within planned scope.

## Known Limitations

- **SMS delivery not testable without Twilio credentials and A2P registration** — the storage and opt-in pipeline is complete, but production SMS delivery to non-test numbers requires carrier A2P 10DLC registration (2–4 weeks) or a toll-free number. This was a known milestone risk, not a slice gap.
- **Phone number is stored as-is** — no server-side format normalization (e.g. E.164). S01's `libphonenumber-js` validation is in the Zod schema for teacher phone; the booking form uses the same schema but the input is free-text with a US placeholder. Malformed numbers would be stored and silently not reach Twilio.
- **Parent phone on deferred path is best-effort** — if the post-insert UPDATE fails (DB issue, RLS conflict), the phone number is lost but the booking succeeds. Only a `console.warn` is emitted. There is no retry or fallback.

## Follow-ups

- Consider adding server-side phone number normalization (E.164 via `libphonenumber-js`) to the booking schema validation — currently validated only for teacher phone in S01.
- When A2P 10DLC registration is complete, run an end-to-end SMS smoke test with a real Twilio number to confirm the full parent notification pipeline.
- S03 is independent of S02 — can proceed immediately.

## Files Created/Modified

- `src/components/ui/checkbox.tsx` — new shadcn/ui Checkbox component (installed via CLI)
- `src/components/profile/BookingCalendar.tsx` — phone input + SMS consent checkbox, state fields, handleBookAnother reset, both submission paths wired
- `src/actions/bookings.ts` — post-insert phone UPDATE block after create_booking() RPC success
- `src/app/api/direct-booking/create-intent/route.ts` — parentPhone/parentSmsOptIn destructuring; parent_phone/parent_sms_opt_in in INSERT
- `src/__tests__/parent-phone-storage.test.ts` — 6 unit tests for both booking paths

## Forward Intelligence

### What the next slice should know
- S03 (school email verification + badge gating) is independent of S02 — the only S01 dependency for S03 is the `teachers.verified_at` column from migration 0008, which was delivered in S01.
- The `supabaseAdmin` pattern for service-role writes established in S02 (post-insert UPDATE) mirrors the same pattern in S01's phone storage for teachers. Future slices needing to write around RLS should follow this pattern.
- The `BookingRequestSchema` in `src/lib/schemas/booking.ts` already includes `parent_phone` and `parent_sms_opt_in` (added in S01) — S02 consumed these without modification.

### What's fragile
- **Phone storage on deferred path** — the post-insert UPDATE is fire-and-forget. If the booking row is deleted or fails between RPC return and UPDATE, the UPDATE will succeed against a deleted row silently. Acceptable for now but worth noting.
- **Conditional checkbox render** — the checkbox disappears (DOM removal, not just hidden) when phone is cleared. Any autofill or password manager behavior that fills phone but doesn't trigger React state change would leave the checkbox non-renderable. Standard browser autofill triggers onChange correctly; edge cases with non-standard fill tools exist.

### Authoritative diagnostics
- `bookings` table → `parent_phone`, `parent_sms_opt_in` columns — ground truth for what was stored
- Server logs → grep `[submitBookingRequest] Failed to store parent phone` — only failure signal for deferred path phone storage
- `src/__tests__/parent-phone-storage.test.ts` — 6 tests document exact expected behavior of both paths; read before modifying storage logic

### What assumptions changed
- No assumptions changed. S01's delivered schema and sms.ts functions matched the S02 plan exactly. Both tasks completed faster than estimated (30m total vs 90m estimated).
