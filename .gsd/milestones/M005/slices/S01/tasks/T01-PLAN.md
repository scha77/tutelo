---
estimated_steps: 5
estimated_files: 5
---

# T01: DB migration and SMS module with unit tests

**Slice:** S01 — SMS Infrastructure & Teacher Phone Collection
**Milestone:** M005

## Description

Install dependencies, create the DB migration for all M005 columns, build `src/lib/sms.ts` with both SMS functions, and write comprehensive unit tests. This is the foundation task — everything in S01 depends on the migration columns and SMS module existing.

## Steps

1. Run `npm install twilio libphonenumber-js` to add both dependencies
2. Create `supabase/migrations/0008_sms_and_verification.sql` adding 5 columns: `teachers.phone_number TEXT`, `teachers.sms_opt_in BOOLEAN DEFAULT FALSE`, `teachers.verified_at TIMESTAMPTZ` (nullable), `bookings.parent_phone TEXT`, `bookings.parent_sms_opt_in BOOLEAN DEFAULT FALSE` — all additive, no existing data modified
3. Create `src/lib/sms.ts` with:
   - Module-level `const twilio = new Twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)` (mirrors email.ts Resend pattern)
   - `TWILIO_PHONE_NUMBER` from env for `from:` field
   - `sendSmsReminder(bookingId: string)` — fetches booking + teacher from `supabaseAdmin`, guards on teacher `phone_number IS NOT NULL AND sms_opt_in = true`, also checks `parent_phone IS NOT NULL AND parent_sms_opt_in = true` for parent SMS, formats E.164 via `parsePhoneNumber`, calls `twilio.messages.create()` for each opted-in recipient
   - `sendSmsCancellation(bookingId: string)` — fetches booking + teacher, sends SMS to parent if `parent_phone` + `parent_sms_opt_in`, sends to teacher if `phone_number` + `sms_opt_in`, plain string template body
   - `[sms]` console.warn prefix for skipped sends, console.error for failures
   - Never log phone numbers — only booking/teacher IDs
4. Create `src/__tests__/sms.test.ts` using `vi.hoisted()` class-based mock for Twilio (same pattern as `MockStripeClass` in cancel-session.test.ts), chainable Supabase mock for `supabaseAdmin.from()`. Test cases:
   - Sends SMS when teacher has phone + opt-in (happy path)
   - Skips SMS when teacher has no phone number (opt-in guard)
   - Skips SMS when teacher has `sms_opt_in = false`
   - Sends cancellation SMS to parent when parent has phone + opt-in
   - Skips parent SMS when `parent_sms_opt_in = false`
   - Handles Twilio error gracefully (does not throw)
5. Run tests to confirm all pass

## Must-Haves

- [ ] Migration 0008 is valid SQL with all 5 columns
- [ ] `twilio` and `libphonenumber-js` installed in package.json
- [ ] `sendSmsReminder` and `sendSmsCancellation` exported from `src/lib/sms.ts`
- [ ] Both functions guard on `phone_number IS NOT NULL AND sms_opt_in = true`
- [ ] Phone numbers formatted to E.164 before Twilio call
- [ ] Unit tests cover opt-in guard, happy path, error handling
- [ ] `supabaseAdmin` used (not `createClient`) — matches email.ts pattern

## Verification

- `npx vitest run src/__tests__/sms.test.ts` — all tests pass
- `cat supabase/migrations/0008_sms_and_verification.sql` — valid SQL with 5 ALTER TABLE ADD COLUMN statements
- `npm ls twilio libphonenumber-js` — both installed

## Observability Impact

- Signals added/changed: `[sms]` prefixed console.warn for opt-in guard skips, console.error for Twilio failures
- How a future agent inspects this: grep logs for `[sms]` prefix; check `teachers.phone_number` / `sms_opt_in` in Supabase
- Failure state exposed: Twilio SDK error message logged via console.error at call site; SMS sends never block — fire-and-forget pattern

## Inputs

- `src/lib/email.ts` — structural template (module-level client, supabaseAdmin, named async exports)
- `src/__tests__/cancel-session.test.ts` — `vi.hoisted()` + class mock pattern for constructor mocking
- `src/__tests__/reminders.test.ts` — chainable Supabase mock pattern
- `supabase/migrations/0007_availability_overrides.sql` — migration style reference

## Expected Output

- `supabase/migrations/0008_sms_and_verification.sql` — additive migration with 5 columns across teachers and bookings tables
- `src/lib/sms.ts` — SMS module with `sendSmsReminder` and `sendSmsCancellation` exports
- `src/__tests__/sms.test.ts` — 6+ unit tests all passing
- `package.json` — `twilio` and `libphonenumber-js` in dependencies
