# M005: Trust & Communication — Research

**Date:** 2026-03-11

## Summary

M005 has two largely independent tracks. The **SMS track** (SMS-01, SMS-02, CANCEL-02) is technically straightforward and should be done first — Twilio is the clear choice, the integration pattern mirrors existing `email.ts` cleanly, and the main complexity is schema work (phone number columns, opt-in flags) plus TCPA compliance handling. The **verification track** (VERIFY-01) is the uncertain one — there is no turnkey API for US teacher credential verification, and the right MVP approach is a **school email domain check** rather than a third-party database or manual founder review. Domain verification is instant, cost-free, automated, and meaningfully trustworthy because school email addresses are only issued to employed staff.

The `CredentialsBar` component already renders a hardcoded "Verified Teacher" badge on every profile regardless of actual verification status. This is a trust liability: it signals verification that hasn't happened. M005 must gate the badge on a real `verified_at` timestamp in the teachers table. The SMS and verification work are independent enough to be separate slices but share a single schema migration (add `phone_number`, `sms_opt_in`, `verified_at`, and optionally `school_email_domain` to `teachers`).

The existing email infrastructure in `src/lib/email.ts` and the reminder cron in `src/app/api/cron/session-reminders/route.ts` give a high-quality template for the SMS layer. Twilio's Node SDK drops in as a parallel to `new Resend(...)`. The cron already handles idempotency correctly via `reminder_sent_at`; SMS can share the same flag or get its own (`sms_reminder_sent_at`) if independent delivery tracking is needed. For cancellations, `cancelSession` in `src/actions/bookings.ts` already calls `sendCancellationEmail` — SMS just needs to be added alongside it.

## Recommendation

**S01 — SMS infrastructure (phone collection + Twilio + reminders + cancellation SMS)** before **S02 — Verification (school email domain check + verified badge gating)**. SMS is higher confidence and higher parent/teacher impact. Verification can ship in a later context window independently.

For verification, **do school email domain check** — not manual founder review (doesn't scale, founder burden), not third-party API (no reliable teacher-credential-specific service exists for US, only background checks), not state license database lookups (fragmented, API coverage is incomplete, most require paid contracts). School email is free, verifiable via Supabase auth or an email link flow, and meaningfully trustworthy. Store `verified_at TIMESTAMPTZ` on the teachers row; gate the CredentialsBar badge on it.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| SMS delivery with TCPA compliance features | Twilio Node SDK (`twilio` npm package) | Industry standard; has opt-out keywords (STOP/HELP) handled automatically; US long code + toll-free numbers; $0.0079/SMS segment; Node SDK is `new Twilio(accountSid, authToken).messages.create(...)` |
| SMS for background checks / identity verification | Checkr, Sterling | Out of scope — these are criminal background checks, not teacher credential checks |
| School email validation | Supabase Auth email-link flow | Tutelo already uses Supabase Auth for email verification — sending a verification link to a `@schoolname.edu` or `@schooldistrict.org` email reuses the exact same auth email-link pattern |
| Phone number formatting and validation | `libphonenumber-js` | Parses/formats/validates US phone numbers; prevents invalid storage; lightweight at ~145kB |
| Two-way SMS opt-out handling | Twilio messaging compliance (built-in) | Twilio auto-handles STOP/HELP/CANCEL keywords per carrier rules; no custom webhook needed for basic transactional use |

## Existing Code and Patterns

- `src/lib/email.ts` — The SMS module (`src/lib/sms.ts`) should mirror this exactly: named export functions (`sendSmsReminder`, `sendSmsCancellationAlert`), `supabaseAdmin` for data fetches, fire-and-forget dispatch at call sites. SMS templates are plain text strings, not React components.
- `src/app/api/cron/session-reminders/route.ts` — Idempotency pattern: update row with `.is('reminder_sent_at', null)` guard, only send if update returns non-empty. SMS reminder can either extend this cron (add SMS call alongside email) or run separately. Recommend extending the same cron to avoid duplicate bookings queries.
- `src/actions/bookings.ts` `cancelSession` — Already calls `sendCancellationEmail` fire-and-forget. Add `sendSmsCancellation` in the same catch block, same pattern.
- `src/components/profile/CredentialsBar.tsx` — Hardcodes "Verified Teacher" badge unconditionally. **This is a pre-existing trust liability.** Must receive a `isVerified: boolean` prop and conditionally render the badge. The teacher data query in `src/app/[slug]/page.tsx` currently fetches `teacher.*` — adding `verified_at` to the select is automatic.
- `src/components/onboarding/WizardStep1.tsx` — Natural place to add phone number field (teacher phone). Optional field — must not break existing wizard validation. The `saveWizardStep` server action in `src/actions/onboarding.ts` will save it automatically since it spreads `...data` into the DB update.
- `src/components/dashboard/AccountSettings.tsx` / `src/actions/profile.ts` — Existing settings update path for post-onboarding phone number changes.
- `supabase/migrations/0001_initial_schema.sql` — `teachers` table schema baseline. Migration 0008 will add `phone_number TEXT`, `sms_opt_in BOOLEAN NOT NULL DEFAULT FALSE`, `verified_at TIMESTAMPTZ` (nullable — null means unverified).
- `src/lib/schemas/onboarding.ts` and `src/lib/schemas/booking.ts` — Zod schemas to extend for phone_number (optional, with libphonenumber-js validation) and parent phone (booking form).
- `vercel.json` — Three existing crons. SMS reminder can be added to session-reminders handler, no new cron needed.

## Constraints

- **Teachers table has no phone number column** — needs migration 0008 before any phone collection code can ship.
- **`CredentialsBar` hardcodes "Verified Teacher" badge** — this must be fixed as part of M005; shipping verification without fixing this badge makes the verification system meaningless.
- **Parent phone collection is hard** — parents don't have accounts for the deferred booking path (BOOK-01). For direct-booking parents (Stripe-connected teachers), InlineAuthForm creates a parent account — that's the right hook for parent phone collection. Deferred-path parents (no account) need the phone collected in the booking form with explicit consent language. Both are optional at MVP; only SMS opt-in with `sms_opt_in = true` should trigger SMS.
- **Phone is optional** — cannot break existing flows for teachers/parents who don't provide one. All SMS sends must be gated on `phone_number IS NOT NULL AND sms_opt_in = true`.
- **Next.js 16 server action auth bug** — Any new API actions that need auth should follow the API route handler pattern (like `connect-stripe`), not server actions under the dashboard layout.
- **Vercel Hobby cron** — Already noted in session-reminders route: daily cron only. SMS reminder fires at same 2 PM UTC schedule as existing email reminder. No change needed.
- **TCPA compliance** — Must collect explicit opt-in consent before first SMS. Checkbox with clear label ("Yes, text me session reminders and alerts") required at collection point. Opt-out must be honored immediately (unset `sms_opt_in`). Twilio handles carrier-level STOP keywords automatically for the number.
- **Twilio phone number cost** — $1/month for a US long code. At MVP scale, negligible. Toll-free numbers cost more but have better deliverability for A2P (Application-to-Person) traffic. US carriers now require A2P 10DLC registration for long codes — budget 2–4 weeks for carrier registration approval before production SMS can send at scale. For initial testing, a trial Twilio account can send to verified numbers immediately.
- **A2P 10DLC registration** — Required by US carriers for long-code SMS since 2023. Must register brand + campaign through Twilio Console before production send. This is a real lead-time risk: allow 2–4 weeks. Consider toll-free number as an alternative (faster approval for transactional use cases).

## Common Pitfalls

- **Hardcoded "Verified Teacher" badge** — CredentialsBar renders the badge unconditionally today. If M005 ships verification without patching this component, every unverified teacher still shows as verified. Fix this on the first slice, not the last.
- **SMS before opt-in stored** — Never send SMS without confirming `sms_opt_in = true` in the DB row. Do not infer consent from phone number presence alone. The check must be explicit in every `sendSms*` function.
- **Twilio trial account restrictions** — Trial accounts can only send to verified recipient numbers. Test SMS delivery will require verifying test phone numbers in the Twilio console. Production requires upgrading and completing A2P registration.
- **International numbers** — `libphonenumber-js` handles international formats. For MVP, restrict to US (+1) only in the UI and validation. TCPA applies to US numbers; international rules differ.
- **Parent SMS timing** — For last-minute cancellations, the SMS must fire immediately (synchronous or near-synchronous within the `cancelSession` action), not via a later cron. Fire-and-forget with `.catch(console.error)` is fine as long as it's in the same request.
- **Twilio `from` number** — Must use a Twilio-provisioned number, not an arbitrary sender ID. Store in `TWILIO_PHONE_NUMBER` env var alongside `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`.
- **School email domain verification UX** — The teacher enters their school email during the verification step. Tutelo sends a magic link to that address. When the teacher clicks it, `verified_at` is set. The UX problem: if the teacher already used their school email as their auth email, they get a second unrelated magic link. Mitigate: make the verification email distinct from the auth email; allow submitting any email that looks like a school/district address.
- **What counts as a "school email"** — `.edu` domains include universities, not just K-12 schools. `@k12.state.us` patterns vary widely. The heuristic is: accept any `.edu`, any `.k12.*.us` pattern, and any domain the teacher declares as their school domain (free-form entry). The verification step validates that the teacher controls *some* institutional email address — not that the domain is definitively a K-12 school.
- **Verification email token expiry** — Use a short-lived token (24h) stored in Supabase (teachers table or a separate `verification_tokens` table). The Supabase magic link pattern can be reused if verification is tied to the teacher's auth account, but a custom token is simpler for separating auth from verification.

## Open Risks

- **A2P 10DLC registration lead time** — 2–4 weeks is a real production blocker for bulk SMS via long code. Can be mitigated by using a toll-free number (faster for transactional) or accepting that SMS won't send to non-test numbers during development. Plan for this in slice sequencing.
- **School email as verification signal** — A teacher could submit any edu address they control (even a personal university alumni email). This is "meaningful but not bulletproof" trust — appropriate for MVP. Real credential verification (state license lookup) is deferred as too fragmented.
- **Parent phone number UX** — For the deferred booking path, asking for a phone number adds friction to an already-lightweight flow. The opt-in checkbox adds more. Risk: lower booking completion. Mitigation: make phone entirely optional, show it only after the primary form fields, with clear value framing ("Get a text reminder the day before").
- **Twilio pricing at scale** — At 1000 sessions/month, SMS costs ~$16/month (teacher + parent reminders). Not a concern at MVP, but worth noting the cost structure.
- **`sms_opt_in` on bookings vs. teachers** — Teachers opt-in on their profile. Parents opt-in per booking (no persistent account for deferred-path parents). This means `sms_opt_in` for parents lives on the `bookings` row (or a parent profile if they have an account). Decide this before migration 0008. Recommend: `teachers.sms_opt_in` + `teachers.phone_number` for teacher SMS; `bookings.parent_phone` + `bookings.parent_sms_opt_in` for parent SMS.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Twilio SMS | none found via installed skills | none installed |
| Next.js / Supabase | existing project patterns sufficient | n/a |

*Note: `npx skills find "twilio"` was not run due to tooling constraints. The Twilio Node SDK is well-documented and the integration pattern is straightforward given existing `email.ts` structure.*

## Candidate Requirements

These surfaced during research and are advisory — not auto-added to scope:

- **VERIFY-02 (advisory)** — Gate "Verified Teacher" badge in CredentialsBar on `teachers.verified_at IS NOT NULL`. Currently hardcoded to always show. This is a trust liability fix, not new scope — should be bundled with VERIFY-01.
- **SMS-03 (advisory)** — Parent phone number collection with opt-in on booking form. Deferred-path parents have no account, so phone must be collected per-booking. Optional field; gated on opt-in checkbox. Should be bundled with SMS-01 rather than deferred.
- **SMS-04 (advisory)** — Teacher SMS opt-in collection in onboarding (WizardStep1) and/or AccountSettings. Should be bundled with SMS-01.

## Sources

- Codebase: `src/lib/email.ts`, `src/app/api/cron/session-reminders/route.ts`, `src/actions/bookings.ts`, `src/components/profile/CredentialsBar.tsx`, `src/components/profile/BookingCalendar.tsx`
- Schema: `supabase/migrations/0001_initial_schema.sql`, `supabase/migrations/0007_availability_overrides.sql`
- Twilio Node SDK API: `twilio` npm package — `client.messages.create({ to, from, body })` pattern; A2P 10DLC registration required for production US long codes (carrier requirement since 2023)
- TCPA compliance: Requires prior express written consent for transactional SMS; opt-out via STOP keyword must be honored; Twilio handles carrier-level STOP automatically on provisioned numbers
- Teacher credential verification landscape: No turnkey API exists for US K-12 teacher credential lookup across all 50 states. State licensing databases are siloed and most lack public APIs. Background check services (Checkr, Sterling) cover criminal/employment history, not teaching credentials. School email domain verification is the practical MVP approach.
- `libphonenumber-js`: lightweight Google libphonenumber port for JS, handles US number parsing/formatting/validation; `parsePhoneNumber(phone, 'US')` returns `{ isValid(), nationalNumber, number }`
