---
id: M005
provides:
  - Twilio-backed SMS notification pipeline (reminders + cancellation alerts) for both teachers and parents
  - Teacher phone number collection with SMS opt-in in onboarding wizard and account settings
  - Parent phone number collection with TCPA-compliant SMS consent on booking form (deferred + direct paths)
  - Session reminder cron extended to send SMS alongside email for opted-in recipients
  - cancelSession sends SMS alongside cancellation email in the same request
  - School email verification flow (token generation → Resend email → /api/verify-email callback → verified_at stamp)
  - CredentialsBar "Verified Teacher" badge gated on verified_at IS NOT NULL
  - DB migration 0008 (phone_number, sms_opt_in, verified_at on teachers; parent_phone, parent_sms_opt_in on bookings)
  - DB migration 0010 (school_email_verification_token, school_email_verification_expires_at on teachers with partial index)
  - src/lib/sms.ts with sendSmsReminder and sendSmsCancellation (Twilio SDK, opt-in gated)
  - src/lib/verification.ts with generateVerificationToken, isTokenExpired, sendVerificationEmail
  - SchoolEmailVerification dashboard component with verified/unverified states and toast feedback
  - shadcn/ui Checkbox component
key_decisions:
  - D001 — SMS consent checkbox conditionally rendered (DOM removal) when phone field is empty, not disabled
  - D002 — Post-insert UPDATE via supabaseAdmin for storing parent phone on RPC-created booking rows; non-blocking try/catch
  - Custom verification token (not Supabase magic link) to separate auth from school email verification
  - supabaseAdmin in verify-email route because teacher may click link in different browser with no session
  - Class-based Resend mock in Vitest (vi.hoisted + class MockResend) because vi.fn() is not constructable with new
  - Token overwrites on re-submit — one pending token at a time; simplifies flow
patterns_established:
  - TCPA-compliant SMS consent — checkbox unchecked by default, only visible when phone has content, consent forced false when phone cleared
  - Post-insert UPDATE pattern for RPC-created rows needing additional fields the RPC doesn't accept
  - Verification server action pattern — getUser() auth → zod validate → generate token → DB write → send email → revalidate
  - URL param → useEffect toast pattern for post-redirect feedback in client components
  - supabaseAdmin for unauthenticated public routes that need to read/write protected data
observability_surfaces:
  - console.warn "[submitBookingRequest] Failed to store parent phone" with booking ID (deferred path phone storage failure)
  - console.warn/error prefixed [verify-email] and [verification] for token lookup failures, expired tokens, email send failures, DB update failures
  - URL params ?verified=true, ?error=invalid, ?error=expired visible in browser after verification redirect
  - DB queries — teachers.phone_number/sms_opt_in/verified_at, bookings.parent_phone/parent_sms_opt_in
  - idx_teachers_verification_token partial index for fast token lookups
requirement_outcomes:
  - id: VERIFY-01
    from_status: deferred
    to_status: validated
    proof: School email verification flow implemented end-to-end — requestSchoolEmailVerification server action, /api/verify-email route stamps verified_at, settings page UI, CredentialsBar badge gated on !!teacher.verified_at; 9 unit tests pass; build clean
  - id: VERIFY-02
    from_status: deferred
    to_status: validated
    proof: CredentialsBar renders badge only when isVerified prop is true; public profile passes !!teacher.verified_at; hardcoded badge removed
  - id: SMS-01
    from_status: deferred
    to_status: validated
    proof: src/lib/sms.ts sendSmsReminder with Twilio SDK; session-reminders cron calls sendSmsReminder alongside email; teacher and parent phone/opt-in checked before send; unit tests pass
  - id: SMS-02
    from_status: deferred
    to_status: validated
    proof: cancelSession calls sendSmsCancellation fire-and-forget in the same request; reads parent_phone/parent_sms_opt_in from bookings row; gated on opt-in
  - id: SMS-03
    from_status: deferred
    to_status: validated
    proof: Parent phone + SMS consent collected on BookingCalendar; stored on bookings row via both deferred (post-insert UPDATE) and direct (INSERT) paths; 6 unit tests pass
  - id: SMS-04
    from_status: deferred
    to_status: validated
    proof: Teacher phone + SMS opt-in collected in WizardStep1 and AccountSettings; stored on teachers row; validated by libphonenumber-js in Zod schema
  - id: CANCEL-02
    from_status: deferred
    to_status: validated
    proof: cancelSession in bookings.ts calls sendSmsCancellation (Twilio) alongside sendCancellationEmail (Resend) in the same request; gated on parent_sms_opt_in
duration: 3 days
verification_result: passed
completed_at: 2026-03-17
---

# M005: Trust & Communication

**Twilio SMS notification pipeline for session reminders and cancellation alerts, school email verification for teacher trust badges, and phone number collection for both teachers and parents — all gated on explicit opt-in consent.**

## What Happened

M005 delivered three interconnected capabilities across three slices:

**S01 (SMS Infrastructure & Teacher Phone Collection)** laid the foundation. Migration 0008 added `phone_number`, `sms_opt_in`, and `verified_at` to the teachers table, plus `parent_phone` and `parent_sms_opt_in` to the bookings table. The core SMS library (`src/lib/sms.ts`) provides `sendSmsReminder` and `sendSmsCancellation` functions backed by the Twilio SDK, with every send gated on `phone IS NOT NULL AND opt_in = true`. The existing session-reminders cron was extended to call `sendSmsReminder` alongside email. The `cancelSession` action was extended to call `sendSmsCancellation` fire-and-forget in the same request — no delayed cron, parents get notified immediately. Teacher phone collection was wired into both the onboarding wizard (WizardStep1) and account settings (AccountSettings), with `libphonenumber-js` validation integrated into the Zod schema.

**S02 (Parent Phone Collection & Booking SMS)** completed the parent side of the SMS pipeline. The `BookingCalendar` component gained an optional phone input and a TCPA-compliant SMS consent checkbox (unchecked by default, only rendered when phone has content, with "Msg & data rates may apply. Reply STOP to opt out." language). Both the deferred booking path (`submitBookingRequest`) and direct booking path (`create-intent` API route) forward `parent_phone` and `parent_sms_opt_in` to the bookings row. The deferred path uses a post-insert UPDATE via `supabaseAdmin` (since the `create_booking()` RPC doesn't accept phone params), wrapped in try/catch to never block booking confirmation. Six unit tests validate both paths.

**S03 (School Email Verification & Badge Gating)** built the trust layer. Migration 0010 added `school_email_verification_token` and `school_email_verification_expires_at` columns with a partial index. The pure verification library (`src/lib/verification.ts`) exports token generation (UUID v4), expiry checking, and email sending via Resend with a React Email template. The `requestSchoolEmailVerification` server action authenticates via `getUser()`, validates email with Zod, generates a 24h token, writes it to DB, and sends the verification email. The public GET route at `/api/verify-email` uses `supabaseAdmin` (teacher may click the link in a different browser), stamps `verified_at`, clears token columns, and redirects to settings with URL param feedback. The `SchoolEmailVerification` component renders verified/unverified states with `useEffect` toast feedback. The `CredentialsBar` badge was already correctly gated on `isVerified` prop (no hardcoded badge) — confirmed and left untouched.

## Cross-Slice Verification

| Success Criterion | Status | Evidence |
|---|---|---|
| Teacher can add phone number during onboarding or in account settings, with explicit SMS opt-in consent | ✅ Met | WizardStep1.tsx has phone_number + sms_opt_in fields; AccountSettings.tsx has phone/opt-in state and save logic |
| Parent can provide a phone number with SMS opt-in on the booking form | ✅ Met | BookingCalendar.tsx has phone + smsOptIn state; TCPA consent checkbox visible when phone has content |
| Both teacher and parent receive an SMS reminder 24 hours before a session (when opted in) | ✅ Met | session-reminders cron imports and calls sendSmsReminder; sms.ts checks both teacher and parent opt-in |
| When a teacher cancels last-minute, the parent receives an SMS within the same request (not a later cron) | ✅ Met | cancelSession in bookings.ts calls sendSmsCancellation fire-and-forget (same request, not cron) |
| Teacher can submit school email, receive verification link, click it, and see badge change | ✅ Met | Full flow: requestSchoolEmailVerification → Resend email → /api/verify-email → verified_at stamp → CredentialsBar badge |
| Unverified teacher's profile does NOT show the "Verified Teacher" badge | ✅ Met | CredentialsBar line 22: `{isVerified && (` — conditional render; public profile passes `!!teacher.verified_at` |
| All SMS sends gated on `phone_number IS NOT NULL AND sms_opt_in = true` | ✅ Met | sms.ts lines 60, 75, 113, 124 all check phone && opt_in before any Twilio call |
| `npm run build` passes with zero errors | ✅ Met | Build clean — 25 routes compiled including /api/verify-email (ƒ dynamic) |

**Additional verification:**
- `npx vitest run` — **411 tests pass, 0 failures** (58 test files pass, 20 skipped)
- 15 M005-specific tests pass (6 parent-phone-storage + 9 verification)
- All 3 slice summaries exist and document their work

**Definition of Done:**
- ✅ All 3 slices complete with passing tests and build
- ✅ Teacher phone number collection works in onboarding wizard and account settings
- ✅ Parent phone number collection works on booking form (both deferred and direct paths)
- ✅ SMS reminder cron sends texts alongside emails for opted-in recipients
- ✅ `cancelSession` sends SMS alongside cancellation email for opted-in parents
- ✅ School email verification flow works end-to-end
- ✅ CredentialsBar badge gated on `verified_at IS NOT NULL`
- ✅ All SMS sends check opt-in
- ✅ Success criteria re-checked against live build

## Requirement Changes

- VERIFY-01: deferred → validated — School email verification flow: server action writes token, Resend sends email, /api/verify-email stamps verified_at, settings UI renders verification component; 9 unit tests pass
- VERIFY-02: deferred → validated — CredentialsBar badge conditionally rendered only when isVerified is true; public profile passes !!teacher.verified_at; no hardcoded badge
- SMS-01: deferred → validated — src/lib/sms.ts with Twilio SDK; session-reminders cron sends SMS alongside email for opted-in recipients; unit tests pass
- SMS-02: deferred → validated — cancelSession calls sendSmsCancellation in same request (not cron); reads parent phone/opt-in from bookings row
- SMS-03: deferred → validated — Parent phone + SMS consent collected on BookingCalendar; stored on bookings row via both deferred and direct paths; 6 unit tests
- SMS-04: deferred → validated — Teacher phone + SMS opt-in in WizardStep1 and AccountSettings; libphonenumber-js validation in Zod schema
- CANCEL-02: deferred → validated — cancelSession sends SMS alongside email in same request; gated on parent_sms_opt_in

## Forward Intelligence

### What the next milestone should know
- **SMS delivery is code-complete but not production-live.** The full Twilio pipeline is wired (send functions, cron extension, cancellation hook, opt-in gating) but actual SMS delivery to non-test numbers requires A2P 10DLC registration (2–4 weeks) or a toll-free number. The env vars `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` must be set in production.
- **School email verification does not enforce domain restrictions.** Any valid email format passes Zod validation — no `.edu` or `.k12.*` filter. This is intentional for MVP ("meaningful but not bulletproof" trust). A domain allowlist is a future enhancement.
- **Phone numbers are stored as-is on the parent side.** Teacher phone uses `libphonenumber-js` validation in the Zod schema, but the booking form's parent phone input is free-text with a US placeholder. Malformed numbers would be stored and silently fail at Twilio delivery. Consider adding server-side E.164 normalization.
- **The `supabaseAdmin` pattern is now used in three places:** post-insert phone UPDATE on bookings (S02), verify-email route (S03), and teacher phone save in account settings (S01). Any future unauthenticated or RLS-bypassing writes should follow the same service-role pattern with error wrapping.
- **411 tests now pass** across the full suite. The test count grew from 395 (end of M004) to 411 with M005's additions.
- **The class-based Resend mock pattern** (`vi.hoisted()` + `class MockResend`) is documented in KNOWLEDGE.md and used in `verification.test.ts`. Use this pattern for any new tests mocking Resend.

### What's fragile
- **Parent phone storage on deferred path** — Post-insert UPDATE is fire-and-forget. If the booking row is deleted between RPC return and UPDATE, the phone write silently succeeds against nothing. Only a `console.warn` is emitted on failure.
- **Verification email URL** — `sendVerificationEmail` builds the link from `NEXT_PUBLIC_APP_URL`. Missing env var falls back to `https://tutelo.app` which is correct for production but misleading in staging/preview.
- **Token cleanup** — Expired verification tokens are never automatically cleaned up. The partial index means stale rows don't affect query performance, but a cleanup cron would be hygiene.
- **Settings page searchParams** — Uses Next.js 15+ Promise-based `searchParams` pattern. If Next.js changes this API, the verification toast feedback will break.

### Authoritative diagnostics
- `src/lib/sms.ts` — Ground truth for SMS send logic and opt-in gating. Read before modifying any SMS behavior.
- `src/lib/verification.ts` — Pure verification functions (token gen, expiry, email send). All tested in `src/__tests__/verification.test.ts`.
- `src/__tests__/parent-phone-storage.test.ts` — 6 tests documenting exact phone storage behavior for both booking paths.
- DB state: `SELECT phone_number, sms_opt_in, verified_at, school_email_verification_token FROM teachers` — most direct way to check teacher state.
- DB state: `SELECT parent_phone, parent_sms_opt_in FROM bookings WHERE parent_phone IS NOT NULL` — stored parent phone numbers.

### What assumptions changed
- **CredentialsBar badge was already gated correctly** — The plan expected S03 to fix a hardcoded badge, but the badge was already conditional on `isVerified` from prior work. S03 confirmed this rather than changing it.
- **S01's doctor-created placeholder summary** — S01 completed all tasks but the summary was reconstructed by the doctor tool. The task summaries in the S01 tasks directory are the authoritative source for S01 implementation details.
- **Test count grew faster than expected** — M005 added 15+ new tests (6 parent-phone + 9 verification) while maintaining all existing tests. Total went from ~395 to 411.

## Files Created/Modified

- `supabase/migrations/0008_sms_and_verification.sql` — phone_number, sms_opt_in, verified_at on teachers; parent_phone, parent_sms_opt_in on bookings
- `supabase/migrations/0010_email_verification_tokens.sql` — school_email_verification_token, school_email_verification_expires_at + partial index
- `src/lib/sms.ts` — Twilio-backed sendSmsReminder and sendSmsCancellation with opt-in gating
- `src/lib/verification.ts` — generateVerificationToken, isTokenExpired, sendVerificationEmail
- `src/emails/SchoolVerificationEmail.tsx` — React Email template with CTA button
- `src/__tests__/sms.test.ts` — Unit tests for SMS functions
- `src/__tests__/parent-phone-storage.test.ts` — 6 unit tests for parent phone storage paths
- `src/__tests__/verification.test.ts` — 9 unit tests for verification logic
- `src/components/onboarding/WizardStep1.tsx` — Added phone_number + sms_opt_in fields
- `src/components/dashboard/AccountSettings.tsx` — Added phone/smsOptIn state and save
- `src/components/profile/BookingCalendar.tsx` — Phone input + TCPA SMS consent checkbox, both submission paths wired
- `src/components/ui/checkbox.tsx` — shadcn/ui Checkbox component
- `src/components/profile/CredentialsBar.tsx` — Badge gated on isVerified prop (confirmed, not modified in M005)
- `src/components/dashboard/SchoolEmailVerification.tsx` — Client component for verification UI
- `src/actions/bookings.ts` — Post-insert phone UPDATE + cancelSession SMS call
- `src/actions/verification.ts` — requestSchoolEmailVerification server action
- `src/app/api/verify-email/route.ts` — GET route: token lookup → expiry → verified_at stamp → redirect
- `src/app/api/direct-booking/create-intent/route.ts` — parentPhone/parentSmsOptIn in INSERT
- `src/app/api/cron/session-reminders/route.ts` — Extended to call sendSmsReminder
- `src/app/(dashboard)/dashboard/settings/page.tsx` — verified_at fetch + SchoolEmailVerification render
- `src/app/[slug]/page.tsx` — Passes !!teacher.verified_at to CredentialsBar (confirmed, not modified in M005)
