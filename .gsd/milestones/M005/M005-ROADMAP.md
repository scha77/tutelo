# M005: Trust & Communication

**Vision:** Parents receive text message reminders and instant cancellation alerts, and teachers who verify their school email earn a "Verified Teacher" badge — building real trust and reducing no-shows.

## Success Criteria

- Teacher can add their phone number during onboarding or in account settings, with explicit SMS opt-in consent
- Parent can provide a phone number with SMS opt-in on the booking form
- Both teacher and parent receive an SMS reminder 24 hours before a session (when opted in)
- When a teacher cancels last-minute, the parent receives an SMS within the same request (not a later cron)
- A teacher can submit their school email address, receive a verification link, click it, and see their profile badge change to "Verified Teacher"
- An unverified teacher's profile does NOT show the "Verified Teacher" badge (fixing the current hardcoded badge)
- All SMS sends are gated on `phone_number IS NOT NULL AND sms_opt_in = true` — never sent without explicit consent
- `npm run build` passes with zero errors after all slices

## Key Risks / Unknowns

- **Twilio integration in production** — A2P 10DLC registration takes 2–4 weeks; production SMS won't reach non-test numbers until registration completes. Toll-free number is a faster alternative for transactional messages.
- **School email verification flow** — Sending a separate verification email distinct from auth magic links is a novel flow for this codebase. Token generation, expiry, and the callback route need to work correctly without conflicting with Supabase Auth.
- **Parent phone collection without accounts** — Deferred-path parents (no Stripe on teacher) don't create accounts. Phone number must be collected inline in the booking form, which adds friction.

## Proof Strategy

- Twilio integration → retire in S01 by building `src/lib/sms.ts` with real Twilio SDK calls, unit tests with mocked client, and a working phone collection UI that stores numbers in the DB
- School email verification flow → retire in S03 by building the full verification flow (token generation → email send → callback route → `verified_at` timestamp) and gating the CredentialsBar badge on it
- Parent phone collection → retire in S02 by adding optional phone + consent fields to the booking form and storing them on the bookings row

## Verification Classes

- Contract verification: Vitest unit tests for SMS utility functions, phone number validation, verification token logic, and session amount computation with SMS
- Integration verification: Twilio SDK call with mocked client; Supabase migration applied; cron handler extended with SMS path; cancellation action extended with SMS path
- Operational verification: `npm run build` passes; cron continues to function; SMS sends gated on opt-in
- UAT / human verification: End-to-end SMS delivery requires Twilio account upgrade + A2P registration (or toll-free number); verification email link clickable in real email client

## Milestone Definition of Done

This milestone is complete only when all are true:

- All 3 slices are complete with passing tests and build
- Teacher phone number collection works in onboarding wizard and account settings
- Parent phone number collection works on booking form (both deferred and direct paths)
- SMS reminder cron sends texts alongside emails for opted-in recipients
- `cancelSession` sends SMS alongside cancellation email for opted-in parents
- School email verification flow works end-to-end (submit → email → click → badge appears)
- CredentialsBar badge is gated on `verified_at IS NOT NULL` (no more hardcoded badge)
- All SMS sends check `phone_number IS NOT NULL AND sms_opt_in = true`
- Success criteria re-checked against live build, not just artifacts

## Requirement Coverage

- Covers: VERIFY-01, SMS-01, SMS-02, CANCEL-02
- Advisory bundled: VERIFY-02 (badge gating — bundled with VERIFY-01 in S03), SMS-03 (parent phone — S02), SMS-04 (teacher phone/opt-in — S01)
- Partially covers: none
- Leaves for later: none
- Orphan risks: A2P 10DLC registration is an external process (2–4 weeks) outside code scope — SMS code will be complete and testable but production delivery to non-test numbers requires carrier approval

## Slices

- [x] **S01: SMS Infrastructure & Teacher Phone Collection** `risk:high` `depends:[]`
  > After this: Teacher can add phone number with SMS opt-in during onboarding (WizardStep1) and in account settings; `src/lib/sms.ts` exists with `sendSmsReminder` and `sendSmsCancellation` functions using Twilio SDK; SMS reminder cron extends existing session-reminders handler to send texts alongside emails; `cancelSession` sends SMS alongside cancellation email; DB migration adds phone_number, sms_opt_in, verified_at columns to teachers table and parent_phone, parent_sms_opt_in columns to bookings table; all SMS gated on opt-in; unit tests pass; build passes.
- [x] **S02: Parent Phone Collection & Booking SMS** `risk:medium` `depends:[S01]`
  > After this: Parent can provide phone number with SMS consent checkbox on both deferred booking form and direct booking flow (InlineAuthForm); parent phone stored on bookings row; cancellation SMS reaches opted-in parents; reminder SMS reaches opted-in parents; booking form shows clear consent language; build passes.
- [ ] **S03: School Email Verification & Badge Gating** `risk:medium` `depends:[]`
  > After this: Teacher can initiate school email verification from their dashboard; verification email with token link is sent to the school address; clicking the link sets `verified_at` on the teacher row; CredentialsBar conditionally renders "Verified Teacher" badge only when `verified_at IS NOT NULL`; unverified teachers see no badge; unit tests for token generation/validation pass; build passes.

## Boundary Map

### S01 → S02

Produces:
- `src/lib/sms.ts` — `sendSmsReminder(bookingId)` and `sendSmsCancellation(bookingId, parentPhone, parentName, teacherName, sessionDate)` exported functions
- DB columns: `teachers.phone_number TEXT`, `teachers.sms_opt_in BOOLEAN DEFAULT FALSE`, `bookings.parent_phone TEXT`, `bookings.parent_sms_opt_in BOOLEAN DEFAULT FALSE`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` env vars expected
- Phone number validation using `libphonenumber-js` integrated into Zod schemas
- `src/app/api/cron/session-reminders/route.ts` extended to send SMS alongside email
- `src/actions/bookings.ts` `cancelSession` extended to call `sendSmsCancellation`

Consumes:
- nothing (first slice)

### S01 → S03

Produces:
- DB column: `teachers.verified_at TIMESTAMPTZ` (nullable — null means unverified) — included in S01 migration

Consumes:
- nothing (independent of S01, but uses the `verified_at` column from S01's migration)

### S02 → (terminal)

Produces:
- Parent phone numbers stored on bookings rows with opt-in consent
- Full SMS notification pipeline working for both teachers and parents

Consumes:
- S01's `src/lib/sms.ts` functions
- S01's DB columns on bookings table
- S01's phone validation in Zod schemas

### S03 → (terminal)

Produces:
- School email verification flow (token → email → callback → verified_at)
- CredentialsBar gated on `isVerified` prop
- Verification UI on teacher dashboard

Consumes:
- S01's `teachers.verified_at` column (from migration 0008)
- If S01 hasn't run yet, S03 must include or depend on the migration — but since both can run independently, S03 should check that migration 0008 exists and create it if not
