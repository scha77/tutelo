# S01: SMS Infrastructure & Teacher Phone Collection — Research

**Date:** 2026-03-11

## Summary

S01 is the highest-confidence slice in M005. The Twilio integration mirrors the existing `src/lib/email.ts` / Resend pattern exactly — same module-level client instantiation, same `supabaseAdmin` data fetches, same fire-and-forget dispatch at call sites, same plain-function exports. The SMS module (`src/lib/sms.ts`) will be the most structurally predictable file in M005.

The database migration (0008) is a clean additive operation: five new nullable/defaulted columns across two existing tables. No existing rows are touched, no existing columns change. The migration can be written and applied before any code touches it. `CredentialsBar` currently hardcodes the "Verified Teacher" badge unconditionally — this trust liability must be fixed as part of S01 even though the full verification feature is in S03. The fix is one prop change and two lines of conditional rendering.

Teacher phone collection slots into `WizardStep1` (new optional field + checkbox) and `AccountSettings` (same). Both feed the existing `saveWizardStep` / `updateProfile` server actions which spread `...data` into the DB update — phone and opt-in fields will persist automatically once the Zod schemas accept them. The `cancelSession` action and the session-reminders cron both have clear, tested insertion points for SMS calls with no structural changes required.

## Recommendation

Build in this order within the slice:

1. **Migration 0008** — additive columns only; unblock everything downstream
2. **`src/lib/sms.ts`** — Twilio client + `sendSmsReminder(bookingId)` + `sendSmsCancellation(bookingId)` with full data fetches from `supabaseAdmin`, opt-in guards, and E.164 formatting via `libphonenumber-js`
3. **Vitest unit tests** — `src/__tests__/sms.test.ts` covering opt-in guard, phone normalization, and happy-path Twilio call using vi.hoisted class mock (same pattern as Stripe/Resend tests)
4. **Zod schema extension** — add `phone_number` (optional, US only, libphonenumber-js validated) to `Step1Schema` and `ProfileUpdateSchema`; add `parent_phone` + `parent_sms_opt_in` to `BookingRequestSchema` (both optional, for S02 wiring)
5. **WizardStep1 UI** — optional phone field + "Text me session reminders and alerts" checkbox
6. **AccountSettings UI** — same optional phone + opt-in checkbox alongside existing fields
7. **CredentialsBar fix** — add `isVerified: boolean` prop, gate badge render on it; update `[slug]/page.tsx` to pass `isVerified={!!teacher.verified_at}`
8. **Cron extension** — add `sendSmsReminder` call after existing `sendSessionReminderEmail` in same loop; extend bookings select to include `parent_phone`, `parent_sms_opt_in`, `teachers(phone_number, sms_opt_in)`
9. **`cancelSession` extension** — add `sendSmsCancellation` fire-and-forget alongside existing `sendCancellationEmail` call

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| SMS delivery | `twilio` npm package (not installed yet) — `new Twilio(sid, token).messages.create({ to, from, body })` | Industry standard; STOP/HELP auto-handled; A2P 10DLC registration path via Twilio Console |
| Phone number validation | `libphonenumber-js` (not installed yet) — `parsePhoneNumber(input, 'US')` then `.isValid()` + `.format('E.164')` | Handles all US format variants correctly; converts to E.164 for Twilio `to` field |
| ESM class-mock for `new Twilio(...)` in Vitest | `vi.hoisted()` + class-based mock (same pattern as `MockStripeClass` in cancel-session.test.ts) | Module-level `const client = new Twilio(...)` requires constructor mock; `vi.fn().mockImplementation()` is not a constructor in Vitest SSR transform |
| SMS opt-in compliance | Explicit checkbox UI + DB `sms_opt_in BOOLEAN DEFAULT FALSE` + guard in every `sendSms*` fn | TCPA requires prior express written consent; Twilio handles STOP keywords at carrier level |

## Existing Code and Patterns

- `src/lib/email.ts` — Direct template for `src/lib/sms.ts`. Module-level client (`const twilio = new Twilio(...)`), named async exports, `supabaseAdmin` for all data fetches (not `createClient`), fire-and-forget at call sites. SMS departs from email in one way: no React Email templates — SMS bodies are plain string template literals.
- `src/app/api/cron/session-reminders/route.ts` — Idempotency via `.is('reminder_sent_at', null)` guard + `.select('id')` on update. SMS reminder extends this cron: after `sendSessionReminderEmail(session.id)`, add `sendSmsReminder(session.id).catch(console.error)`. The bookings select query must be extended to join `teachers(phone_number, sms_opt_in)` so `sendSmsReminder` can access both teacher and parent phone without a second query. (Alternatively, `sendSmsReminder` does its own `supabaseAdmin` fetch internally — same as email functions — which is cleaner and keeps the cron lean.)
- `src/actions/bookings.ts` `cancelSession` — Fire-and-forget pattern: `const { sendCancellationEmail } = await import('@/lib/email'); sendCancellationEmail(bookingId).catch(console.error)`. Add `sendSmsCancellation(bookingId)` with the same dynamic import + `.catch(console.error)` immediately after, before `revalidatePath` calls.
- `src/components/onboarding/WizardStep1.tsx` — Currently has: full_name, school, city, state, years_experience, photo_upload. Add `phone_number` (text input, optional) and `sms_opt_in` (checkbox) below photo. Uses `useFormContext<FullOnboardingData>()` so new fields wire automatically once added to `Step1Schema`.
- `src/components/dashboard/AccountSettings.tsx` — State-managed form with `updateProfile` server action. Add `phoneNumber` / `smsOptIn` state, controlled inputs, and include in the `updateProfile` call payload. The `ProfileUpdateSchema` in `src/actions/profile.ts` must accept `phone_number` and `sms_opt_in`.
- `src/actions/onboarding.ts` `saveWizardStep` — Spreads `...data` into the DB UPDATE, so phone_number and sms_opt_in persist automatically once the Zod schemas expose them. No action changes needed.
- `src/actions/profile.ts` `updateProfile` — Uses `ProfileUpdateSchema` (Zod) to allowlist fields before the DB update. Must add `phone_number: z.string()...optional()` and `sms_opt_in: z.boolean().optional()` to the schema for AccountSettings to persist them.
- `src/components/profile/CredentialsBar.tsx` — Hardcodes `<div className="flex items-center gap-1 text-emerald-600"><CheckCircle ... /><span>Verified Teacher</span></div>` unconditionally. Fix: add `isVerified: boolean` to `CredentialsBarProps` and wrap the badge div in `{isVerified && ...}`. Zero functional change to other fields.
- `src/app/[slug]/page.tsx` — Passes `teacher={teacher}` to `<CredentialsBar>`. The teacher select uses `select('*, availability(*)')` which includes all columns. Adding `verified_at` to the select is automatic (wildcard). Just add `isVerified={!!teacher.verified_at}` prop to `<CredentialsBar>`.
- `src/lib/schemas/onboarding.ts` `Step1Schema` — Add `phone_number: z.string().optional().refine(...)` using libphonenumber-js `isValidPhoneNumber(v, 'US')` in the refine callback. Must use `.or(z.literal(''))` pattern (same as `photo_url`) to handle empty string from unset input.
- `src/lib/schemas/booking.ts` `BookingRequestSchema` — Add `parent_phone: z.string().optional()` and `parent_sms_opt_in: z.boolean().optional().default(false)`. These fields are collected in S02; S01 adds them to the schema with optional so they don't break existing booking form.
- `src/__tests__/reminders.test.ts` — Existing test for the session-reminders cron. The mock pattern (`vi.hoisted`, chainable Supabase mock, module-level `vi.mock('@/lib/email')`) must be replicated in `src/__tests__/sms.test.ts`. The cron test will need updating to mock the new `sendSmsReminder` import.
- `src/__tests__/cancel-session.test.ts` — 8 tests. When `sendSmsCancellation` is added to `cancelSession`, this test file must add `sendSmsCancellation: vi.fn().mockResolvedValue(undefined)` to the `vi.mock('@/lib/sms', ...)` block (analogous to `sendCancellationEmail` in `vi.mock('@/lib/email', ...)`). All 8 tests should continue to pass unmodified since the SMS call is fire-and-forget.

## Constraints

- **`twilio` and `libphonenumber-js` not installed** — Must `npm install twilio libphonenumber-js` before writing `src/lib/sms.ts`. Vitest mock for Twilio requires the package to resolve at import time even when mocked.
- **Twilio trial account restriction** — Trial accounts can only send to verified Twilio recipient numbers. Real SMS delivery during development requires verifying test numbers in the Twilio Console. This is a test/ops constraint, not a code constraint.
- **A2P 10DLC registration** — US carriers require brand + campaign registration for long-code SMS since 2023. Production delivery to non-verified numbers won't work until registration completes (2–4 week lead time). Code is complete and testable before registration.
- **Phone number field must be optional throughout** — `phone_number` is optional in `Step1Schema`, in `ProfileUpdateSchema`, and in `BookingRequestSchema`. All SMS sends are gated on `phone_number IS NOT NULL AND sms_opt_in = true`. Breaking existing flows for users without phone is not acceptable.
- **US-only phone numbers at MVP** — `libphonenumber-js` Zod refine should reject non-US numbers. Use `parsePhoneNumber(input, 'US').isValid()` which applies US-specific length/format rules.
- **`sms.ts` must use `supabaseAdmin`** — SMS functions are called from server actions and cron route handlers where there is no user session. Same pattern as email.ts.
- **Vitest ESM constructor mock** — `const client = new Twilio(...)` at module level requires `vi.hoisted()` class mock, not `vi.fn()`. Pattern established in `cancel-session.test.ts` with `MockStripeClass`.
- **CredentialsBar `isVerified` prop is a breaking change** — Any existing tests that render `CredentialsBar` must be updated to pass the prop. A quick `rg 'CredentialsBar'` at implementation time will catch these.
- **`saveWizardStep` spreads `...data` but only updates existing columns** — New columns must exist in the DB (migration 0008 applied) before any INSERT/UPDATE touches `phone_number` or `sms_opt_in`. Migration must run first.
- **Next.js 16 server-action auth bug** — If any new SMS-related functionality needs auth (e.g. a future opt-out endpoint), use API route handler pattern, not a server action under the dashboard layout. The existing `cancelSession` and `saveWizardStep` patterns are already correct for their contexts.
- **`teachers(phone_number, sms_opt_in)` in the cancellation function** — `sendSmsCancellation(bookingId)` must fetch the teacher's phone/opt-in from `teachers` via the booking join, same as `sendCancellationEmail` fetches `teachers(full_name, social_email)`.

## Common Pitfalls

- **`vi.hoisted()` for Twilio class mock** — Do not use `vi.fn().mockImplementation(() => ({ messages: { create: ... } }))` for `new Twilio(...)`. The ESM transform makes this fail with "not a constructor." Use the same `vi.hoisted()` + class pattern from `cancel-session.test.ts`.
- **Empty string phone number vs. undefined** — HTML `<input type="text">` returns `""` when empty, not `undefined`. The Zod schema must handle this with `.optional().or(z.literal(''))` or a `.transform(v => v || undefined)`. Storing `""` in the DB would bypass the `IS NOT NULL` opt-in guard.
- **Storing phone number without E.164 format** — Always store `parsePhoneNumber(input, 'US').format('E.164')` (e.g. `+12135551234`), not the raw user input. Twilio's `to:` field requires E.164. If stored in a non-standard format, every SMS send would need to re-format, risking inconsistency.
- **`sms_opt_in = true` with no phone number** — The opt-in checkbox is meaningless without a phone number. UI should hide or disable the checkbox when no phone number is entered. The server-side guard (`phone_number IS NOT NULL AND sms_opt_in = true`) is the authoritative check regardless.
- **Hardcoded `CredentialsBar` badge** — Without the `isVerified` fix, every teacher profile (verified or not) shows the badge. This must ship in S01, not S03 — do not defer. The profile page already uses wildcard select so `verified_at` is already in the query result.
- **Updating `cancel-session.test.ts` mock** — When `sendSmsCancellation` is added to `cancelSession`, the test's `vi.mock('@/lib/email')` block must be extended to also mock `@/lib/sms`. If not updated, the dynamic `import('@/lib/sms')` will resolve to the real module which tries to instantiate a real Twilio client — tests will fail.
- **Cron test coverage gap** — `reminders.test.ts` currently only mocks `@/lib/email`. If `sendSmsReminder` is added to the cron, the test must be updated to also mock `@/lib/sms`. The existing 4 cron tests will continue to pass because the SMS call is fire-and-forget and the test's mocked update result controls `sent` count — but add explicit SMS assertion to one test.
- **`parent_phone` / `parent_sms_opt_in` in `BookingRequestSchema` affects `submitBookingRequest`** — The `create_booking` RPC call in `submitBookingRequest` uses named parameters. Adding optional fields to the schema does NOT automatically pass them to the RPC. S01 adds them to the schema with optional defaults only; S02 wires them into the RPC call and stores them on the bookings row.

## Open Risks

- **Twilio account setup** — `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER` must be present in `.env.local` and Vercel env vars for the SMS module to work. These are not yet in `.env.local` (current env shows Supabase, Stripe, Resend, Cron keys only). Must be provisioned before end-to-end testing.
- **A2P 10DLC registration lead time** — 2–4 weeks for production long-code SMS. This is an external process blocker, not a code blocker. Consider provisioning a toll-free number as an alternative (faster transactional approval).
- **`twilio` npm package size** — Twilio's Node SDK is large (~50MB installed). This is a server-only module and will not affect bundle size, but install time and `node_modules` size will increase.
- **`libphonenumber-js` import size** — The full library is ~145kB. The `min` build is ~75kB. For Zod schema files that run on both server and client (e.g. inside `WizardStep1` which is `'use client'`), using `libphonenumber-js/min` reduces client bundle impact. Consider `import { parsePhoneNumber } from 'libphonenumber-js/min'` in schema files.
- **Cron test isolation** — The reminder cron tests use `vi.resetModules()` in `beforeEach`. When the cron is extended to call `sendSmsReminder`, the test module reset pattern must include `vi.mock('@/lib/sms', ...)` in the `beforeEach` re-application block alongside the existing email mock, otherwise the test runs may leak the real SMS module between tests.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Twilio SMS | none in `<available_skills>` | none installed |
| libphonenumber-js | none in `<available_skills>` | none installed |
| Next.js / Supabase / Vitest | covered by existing project patterns | n/a |

No `npx skills find` execution needed — the Twilio and libphonenumber-js APIs are well-documented and the integration pattern is fully determined by existing `email.ts` + cancel test patterns.

## Sources

- `src/lib/email.ts` — SMS module structure template (module-level client, supabaseAdmin, named async exports, fire-and-forget at call sites)
- `src/app/api/cron/session-reminders/route.ts` — Idempotency pattern and SMS extension insertion point
- `src/actions/bookings.ts` — `cancelSession` fire-and-forget pattern; SMS call insertion point
- `src/components/profile/CredentialsBar.tsx` — Hardcoded badge identified; `isVerified` prop fix scoped
- `src/components/onboarding/WizardStep1.tsx` — Phone field insertion point; `useFormContext<FullOnboardingData>()` wiring
- `src/components/dashboard/AccountSettings.tsx` — Phone/opt-in state management insertion point
- `src/actions/profile.ts` — `ProfileUpdateSchema` must be extended for phone fields
- `src/lib/schemas/onboarding.ts` — `Step1Schema` extension pattern (`.optional().or(z.literal(''))`)
- `src/lib/schemas/booking.ts` — `BookingRequestSchema` extension for parent phone (S01 schema, S02 UI)
- `src/__tests__/cancel-session.test.ts` — `vi.hoisted()` + class mock pattern for Twilio
- `src/__tests__/reminders.test.ts` — Cron test mock pattern to replicate/extend
- `supabase/migrations/0007_availability_overrides.sql` — Migration style to follow for 0008
- `package.json` — `twilio` and `libphonenumber-js` not yet in dependencies; must install
- `.env.local` — Twilio env vars not yet present; must provision before SMS testing
- Twilio Node SDK docs (Context7 /twilio/twilio-node) — `new Twilio(sid, token).messages.create({ to, from, body })` async/await pattern confirmed
- libphonenumber-js docs (Context7 /catamphetamine/libphonenumber-js) — `parsePhoneNumber(input, 'US').isValid()` + `.format('E.164')` confirmed
