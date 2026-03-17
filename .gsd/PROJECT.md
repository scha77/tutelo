# Tutelo

## What This Is

Tutelo is a web application that gives K-12 classroom teachers a professional tutoring landing page — with scheduling, payments, and booking — in under 7 minutes, at zero upfront cost. Parents discover and book verified classroom teachers through those pages. Teachers own their client relationships and pay only when they earn (7% platform fee, no monthly cost).

Tagline: "Shopify for teacher side hustles."

## Core Value

**The deferred Stripe model:** teachers publish a professional page and share it with zero financial commitment — payment setup is triggered only when a real parent with real money is waiting. This eliminates the single biggest drop-off in competing products (entering bank info before seeing any value).

## Current State

**Live in production at https://tutelo.app** (deployed March 11, 2026)

- All 85 requirements validated (59 MVP from M001/M002 + 17 polish from M003 + 5 scheduling from M004 + 4 trust & communication from M005)
- 411 tests passing; build clean
- **Trust & Communication (M005 — complete):**
  - Twilio-backed SMS pipeline: `sendSmsReminder` and `sendSmsCancellation` in `src/lib/sms.ts`, all sends gated on explicit opt-in
  - Teacher phone + SMS opt-in collected in onboarding wizard and account settings
  - Parent phone + TCPA-compliant SMS consent collected on booking form (both deferred and direct paths)
  - Session reminder cron sends SMS alongside email for opted-in recipients
  - `cancelSession` sends SMS alongside cancellation email in the same request
  - School email verification flow: token-based pipeline from settings UI through Resend email to verified_at stamp
  - "Verified Teacher" badge on CredentialsBar gated on `verified_at IS NOT NULL` (no hardcoded badge)
  - DB migrations 0008 (phone/opt-in/verified_at columns) and 0010 (verification token columns with partial index)
  - **Note:** SMS delivery to non-test numbers requires A2P 10DLC registration (2–4 weeks) or toll-free number — code is complete and testable
- **Availability & Scheduling (M004):** 5-minute granularity recurring editor, per-date override scheduling, override-wins-recurring precedence, 30-min booking slots, duration-prorated payments, one-click cancellation with email
- **Landing Page & Polish (M003):** Branded marketing landing page, animation system (6 surfaces), mobile bottom tab bar, dynamic OG meta tags, social_email auto-populate
- Brand identity applied globally (#3b4d3e sage green, #f6f5f0 warm off-white, Tutelo logo in all nav surfaces)
- Stripe in test mode — switch to live keys before real payments
- Crons running daily (Vercel Hobby plan)

See `LAUNCH.md` for production environment documentation.

## Key Utilities (M004+)

- `src/lib/utils/time.ts` — `generate5MinOptions()`, `formatTimeLabel()`, `validateNoOverlap()` — pure time utilities for availability editor
- `src/lib/utils/slots.ts` — `getSlotsForDate()`, `generateSlotsFromWindow()` — override-wins-recurring precedence, 30-min slot expansion
- `src/lib/utils/booking.ts` — `computeSessionAmount()` — duration-prorated payment calculation
- `src/lib/sms.ts` — `sendSmsReminder(bookingId)`, `sendSmsCancellation(...)` — Twilio-backed SMS, opt-in gated (M005/S01)
- `src/lib/verification.ts` — `generateVerificationToken()`, `isTokenExpired()`, `sendVerificationEmail()` — school email verification (M005/S03)
- `src/components/ui/checkbox.tsx` — shadcn/ui Checkbox component (M005/S02)

## Architecture / Key Patterns

- **Stack:** Next.js 16.1.6 + Tailwind CSS v4 + Supabase (DB + Auth + Storage) + Stripe Connect Express + Resend + Vercel
- **Auth:** Supabase Auth (Google SSO + email/password). `getUser()` for verified identity checks. `getClaims()` unreliable on POST re-renders in Next.js 16.
- **Protected routes:** API route handlers (not server actions + redirect()) for any action needing cookies under the dashboard layout — Next.js 16 server-action auth bug.
- **Proxy:** `src/proxy.ts` handles token refresh only, no auth redirects. `middleware.ts` is a re-export shim.
- **Availability:** `TIME` columns (no tz) in `availability` table, interpreted relative to `teachers.timezone`. Recurring weekly with 5-min granularity time ranges. Per-date overrides in `availability_overrides` table with override-wins-recurring precedence. Booking calendar shows 30-min slots within availability windows. Duration-prorated payments via `computeSessionAmount()`.
- **Email:** Resend with React Email templates in `src/emails/`. Gated on `social_email != null`. New signups auto-populate social_email.
- **SMS:** Twilio SDK in `src/lib/sms.ts`. All sends gated on `phone IS NOT NULL AND sms_opt_in = true`. A2P 10DLC registration required for production delivery.
- **Verification:** School email verification via custom token flow (separate from Supabase Auth). Token gen + Resend email + public callback route stamps `verified_at`.
- **UI:** shadcn/ui components, `tw-animate-css` for CSS animations, `motion` v12.36.0 for complex animations.
- **Animations:** Shared constants in `src/lib/animation.ts`. Thin animated wrapper pattern (AnimatedSection, AnimatedProfile, AnimatedList, AnimatedButton) keeps RSC data-fetching separate from client animation shells. Page transitions via `template.tsx` + `PageTransition` component.
- **Navigation:** Shared nav items in `src/lib/nav.ts` consumed by both desktop Sidebar and mobile MobileBottomNav. Mobile header (MobileHeader) shows logo + teacher name.
- **OG Images:** File-based `opengraph-image.tsx` route using edge-safe Supabase client (no cookies). `generateMetadata()` for dynamic OG tags on teacher pages.

## Test Accounts

| Email | Password | Role | Notes |
|---|---|---|---|
| soosup.cha+test@gmail.com | testing123 | Teacher | Has completed onboarding; use for dashboard/availability/booking flows |

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [x] **M001:** Migration — All 59 requirements implemented and validated with 105 passing tests
- [x] **M002:** Production Launch — Deployed to tutelo.app; all flows verified end-to-end on live URL
- [x] **M003:** Landing Page & Polish — Marketing landing page, brand identity, UI animations, mobile dashboard, OG tags, social_email fix
- [x] **M004:** Availability & Scheduling Overhaul — 5-min granularity, per-date overrides, weeks-in-advance planning, redesigned editor, last-minute cancellation
- [x] **M005:** Trust & Communication — School email verification with badge gating, Twilio SMS reminders and cancellation alerts, teacher and parent phone collection with opt-in consent

---
*Last updated: 2026-03-17 after M005 milestone completion — all 85 requirements validated, 411 tests passing*
