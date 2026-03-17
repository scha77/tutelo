# S01: SMS Infrastructure & Teacher Phone Collection

**Goal:** Build the SMS sending module, collect teacher phone numbers with opt-in, extend the cancellation and reminder flows to send SMS, and fix the hardcoded "Verified Teacher" badge — all gated on explicit consent.
**Demo:** Teacher adds phone number in onboarding or account settings with SMS opt-in; `src/lib/sms.ts` sends SMS via Twilio SDK; session-reminders cron sends texts alongside emails; `cancelSession` sends SMS alongside cancellation email; CredentialsBar badge only shows when `verified_at` is set; all unit tests pass; build passes.

## Must-Haves

- DB migration 0008 adds `phone_number`, `sms_opt_in`, `verified_at` to teachers and `parent_phone`, `parent_sms_opt_in` to bookings
- `src/lib/sms.ts` with `sendSmsReminder(bookingId)` and `sendSmsCancellation(bookingId)` using Twilio SDK, all gated on `phone_number IS NOT NULL AND sms_opt_in = true`
- Phone numbers stored in E.164 format via `libphonenumber-js`
- `Step1Schema` and `ProfileUpdateSchema` extended with optional phone + sms_opt_in fields (US-only validation)
- `BookingRequestSchema` extended with optional `parent_phone` + `parent_sms_opt_in` (schema only — UI wired in S02)
- WizardStep1 has optional phone input + SMS opt-in checkbox
- AccountSettings has optional phone input + SMS opt-in checkbox, persisted via `updateProfile`
- Session-reminders cron calls `sendSmsReminder` after email for opted-in recipients
- `cancelSession` calls `sendSmsCancellation` fire-and-forget alongside email
- CredentialsBar renders "Verified Teacher" badge only when `isVerified` prop is true
- `[slug]/page.tsx` passes `isVerified={!!teacher.verified_at}` to CredentialsBar
- Unit tests for SMS functions (opt-in guard, phone normalization, happy-path Twilio call)
- Existing cancel-session tests updated with SMS mock (all 8 pass)
- Existing reminder tests updated with SMS mock (all 4 pass)
- `npm run build` passes with zero errors

## Proof Level

- This slice proves: integration (SMS module wired into real action/cron call sites with mocked Twilio client)
- Real runtime required: no (Twilio trial + A2P registration are external blockers; code is complete and testable with mocked client)
- Human/UAT required: yes (end-to-end SMS delivery requires Twilio account upgrade + verified recipient number)

## Verification

- `npx vitest run src/__tests__/sms.test.ts` — SMS module unit tests (opt-in guard, E.164 formatting, happy-path send, cancellation send)
- `npx vitest run src/__tests__/cancel-session.test.ts` — all 8 existing tests pass with new SMS mock
- `npx vitest run src/__tests__/reminders.test.ts` — all existing tests pass with new SMS mock + at least one SMS assertion
- `npm run build` — zero errors
- Manual check: CredentialsBar without `isVerified` shows no badge; with `isVerified` shows badge

## Observability / Diagnostics

- Runtime signals: `[sms]` prefixed console.warn for skipped sends (no phone, no opt-in), console.error for Twilio failures — mirrors existing `[email]` prefix pattern
- Inspection surfaces: Twilio dashboard for delivery status; `teachers.phone_number` and `teachers.sms_opt_in` columns in Supabase for per-teacher state; `bookings.parent_phone` and `bookings.parent_sms_opt_in` for per-booking state
- Failure visibility: Twilio SDK errors surfaced via `.catch(console.error)` at call sites; SMS sends are fire-and-forget so failures don't block parent actions
- Redaction constraints: Phone numbers are PII — never log full phone numbers; log only teacher/booking IDs in warn/error messages

## Integration Closure

- Upstream surfaces consumed: `src/lib/supabase/service.ts` (supabaseAdmin), `src/lib/email.ts` (pattern template), `src/actions/bookings.ts` (cancelSession insertion point), `src/app/api/cron/session-reminders/route.ts` (cron insertion point)
- New wiring introduced in this slice: `src/lib/sms.ts` module; `cancelSession` → `sendSmsCancellation` call; cron → `sendSmsReminder` call; WizardStep1 + AccountSettings phone/opt-in fields; CredentialsBar `isVerified` prop gating
- What remains before the milestone is truly usable end-to-end: S02 (parent phone collection on booking form + parent SMS delivery), S03 (school email verification flow + badge earned through verification), Twilio account provisioning (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER env vars), A2P 10DLC registration for production SMS delivery

## Tasks

- [x] **T01: DB migration and SMS module with unit tests** `est:1h`
  - Why: Everything downstream depends on the DB columns existing and the SMS module being importable. Tests written first ensure the module contract is locked before wiring.
  - Files: `supabase/migrations/0008_sms_and_verification.sql`, `src/lib/sms.ts`, `src/__tests__/sms.test.ts`, `package.json`
  - Do: Install `twilio` + `libphonenumber-js`. Write migration 0008 (5 additive columns). Build `sms.ts` with module-level Twilio client, `sendSmsReminder(bookingId)` and `sendSmsCancellation(bookingId)` — both fetch from `supabaseAdmin`, guard on opt-in, format E.164. Write unit tests using `vi.hoisted()` class mock (same pattern as cancel-session.test.ts MockStripeClass). Guard empty-string phone with `IS NOT NULL` check.
  - Verify: `npx vitest run src/__tests__/sms.test.ts` all pass; migration SQL is valid
  - Done when: SMS module exports both functions, unit tests prove opt-in guard + E.164 formatting + happy-path Twilio call + error handling

- [x] **T02: Zod schemas, WizardStep1 phone UI, and AccountSettings phone UI** `est:45m`
  - Why: Teachers need to provide phone numbers to receive SMS. Schema validation and UI must exist before any server-side persistence works.
  - Files: `src/lib/schemas/onboarding.ts`, `src/lib/schemas/booking.ts`, `src/actions/profile.ts`, `src/components/onboarding/WizardStep1.tsx`, `src/components/dashboard/AccountSettings.tsx`
  - Do: Extend `Step1Schema` with optional `phone_number` (libphonenumber-js US validation + `.or(z.literal(''))` for empty input) and `sms_opt_in` boolean. Extend `ProfileUpdateSchema` with same fields. Extend `BookingRequestSchema` with optional `parent_phone` + `parent_sms_opt_in` (S02 wires UI). Add phone input + opt-in checkbox to WizardStep1 below photo upload. Add phone input + opt-in checkbox to AccountSettings with state management. Checkbox disabled when phone empty.
  - Verify: `npm run build` passes; WizardStep1 and AccountSettings render phone fields; schema rejects non-US phone numbers
  - Done when: Both forms collect phone + opt-in; schemas validate US phones and reject invalid; `saveWizardStep` and `updateProfile` persist the fields automatically (spread pattern)

- [x] **T03: CredentialsBar badge gating and cancellation/cron SMS wiring** `est:45m`
  - Why: Fixes the hardcoded trust badge (every teacher currently shows "Verified") and wires SMS sends into the two existing notification paths — completing the slice integration.
  - Files: `src/components/profile/CredentialsBar.tsx`, `src/app/[slug]/page.tsx`, `src/actions/bookings.ts`, `src/app/api/cron/session-reminders/route.ts`, `src/__tests__/cancel-session.test.ts`, `src/__tests__/reminders.test.ts`
  - Do: Add `isVerified: boolean` prop to CredentialsBar, wrap badge in `{isVerified && ...}`. Pass `isVerified={!!teacher.verified_at}` from `[slug]/page.tsx`. Add `sendSmsCancellation(bookingId).catch(console.error)` to `cancelSession` after email call (dynamic import pattern). Add `sendSmsReminder(session.id).catch(console.error)` to cron loop after email. Update cancel-session test to mock `@/lib/sms`. Update reminders test to mock `@/lib/sms` + add SMS assertion.
  - Verify: `npx vitest run src/__tests__/cancel-session.test.ts` — all 8 pass; `npx vitest run src/__tests__/reminders.test.ts` — all pass; `npm run build` — zero errors
  - Done when: Badge only renders when isVerified=true; cancelSession dispatches SMS; cron dispatches SMS; all existing tests pass with SMS mocks

## Files Likely Touched

- `supabase/migrations/0008_sms_and_verification.sql`
- `src/lib/sms.ts`
- `src/__tests__/sms.test.ts`
- `src/lib/schemas/onboarding.ts`
- `src/lib/schemas/booking.ts`
- `src/actions/profile.ts`
- `src/components/onboarding/WizardStep1.tsx`
- `src/components/dashboard/AccountSettings.tsx`
- `src/components/profile/CredentialsBar.tsx`
- `src/app/[slug]/page.tsx`
- `src/actions/bookings.ts`
- `src/app/api/cron/session-reminders/route.ts`
- `src/__tests__/cancel-session.test.ts`
- `src/__tests__/reminders.test.ts`
- `package.json`
