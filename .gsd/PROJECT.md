# Tutelo

## What This Is

Tutelo is a web application that gives K-12 classroom teachers a professional tutoring landing page — with scheduling, payments, and booking — in under 7 minutes, at zero upfront cost. Parents discover and book verified classroom teachers through those pages. Teachers own their client relationships and pay only when they earn (7% platform fee, no monthly cost).

Tagline: "Shopify for teacher side hustles."

## Core Value

**The deferred Stripe model:** teachers publish a professional page and share it with zero financial commitment — payment setup is triggered only when a real parent with real money is waiting. This eliminates the single biggest drop-off in competing products (entering bank info before seeing any value).

## Current State

**Live in production at https://tutelo.app** (deployed March 11, 2026)

- All 81 requirements validated (59 MVP from M001/M002 + 17 polish from M003 + 5 scheduling from M004)
- **M005 in progress — S01 and S02 complete:**
  - `src/lib/sms.ts` — Twilio-backed `sendSmsReminder` and `sendSmsCancellation` functions, opt-in gated
  - Teacher phone + SMS opt-in collected in onboarding wizard (WizardStep1) and account settings
  - Parent phone + SMS opt-in collected on booking form (both deferred and direct paths); stored on bookings row
  - SMS reminder cron extended to send texts alongside emails for opted-in recipients
  - `cancelSession` sends SMS alongside cancellation email for opted-in parents
  - DB migration 0008 adds `phone_number`, `sms_opt_in`, `verified_at` to teachers; `parent_phone`, `parent_sms_opt_in` to bookings
  - shadcn/ui Checkbox component added to project
  - 402 tests passing; build clean
  - S03 (school email verification + badge gating) is next and independent
- **Availability & Scheduling Overhaul (M004):** 5-minute granularity recurring editor, per-date override scheduling, override-wins-recurring precedence on booking calendar, 30-min booking slot expansion, duration-prorated payments, one-click session cancellation with email notification
- Branded marketing landing page at tutelo.app/ with hero, how-it-works, problem/solution, interactive teacher mock, and CTA
- Animation system (motion v12.36.0) active across 6 surfaces: landing scroll reveals, page transitions, onboarding step slides, dashboard card staggers, profile section fades, button micro-interactions
- Mobile dashboard with bottom tab bar (7 tabs) and header with logo
- Dynamic OG meta tags on teacher /[slug] pages (personalized 1200×630 PNG previews)
- social_email auto-populated from auth email on new teacher signup
- Brand identity applied globally (#3b4d3e sage green, #f6f5f0 warm off-white, Tutelo logo in all nav surfaces)
- Stripe in test mode — switch to live keys before real payments
- Crons running daily (Vercel Hobby plan)
- M005 S01+S02 code ready; production deploy pending

See `LAUNCH.md` for production environment documentation.

## Key Utilities (M004+)

- `src/lib/utils/time.ts` — `generate5MinOptions()`, `formatTimeLabel()`, `validateNoOverlap()` — pure time utilities for availability editor
- `src/lib/utils/slots.ts` — `getSlotsForDate()`, `generateSlotsFromWindow()` — override-wins-recurring precedence, 30-min slot expansion
- `src/lib/utils/booking.ts` — `computeSessionAmount()` — duration-prorated payment calculation
- `src/lib/sms.ts` — `sendSmsReminder(bookingId)`, `sendSmsCancellation(...)` — Twilio-backed SMS, opt-in gated (M005/S01)
- `src/components/ui/checkbox.tsx` — shadcn/ui Checkbox component (M005/S02)

## Architecture / Key Patterns

- **Stack:** Next.js 16.1.6 + Tailwind CSS v4 + Supabase (DB + Auth + Storage) + Stripe Connect Express + Resend + Vercel
- **Auth:** Supabase Auth (Google SSO + email/password). `getUser()` for verified identity checks. `getClaims()` unreliable on POST re-renders in Next.js 16.
- **Protected routes:** API route handlers (not server actions + redirect()) for any action needing cookies under the dashboard layout — Next.js 16 server-action auth bug.
- **Proxy:** `src/proxy.ts` handles token refresh only, no auth redirects. `middleware.ts` is a re-export shim.
- **Availability:** `TIME` columns (no tz) in `availability` table, interpreted relative to `teachers.timezone`. Recurring weekly with 5-min granularity time ranges. Per-date overrides in `availability_overrides` table with override-wins-recurring precedence. Booking calendar shows 30-min slots within availability windows. Duration-prorated payments via `computeSessionAmount()`.
- **Email:** Resend with React Email templates in `src/emails/`. Gated on `social_email != null`. New signups auto-populate social_email.
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
- [ ] **M005:** Trust & Communication — Teacher verification system, SMS notifications, SMS cancellation alerts

---
*Last updated: 2026-03-17 after M005/S02 completion*
