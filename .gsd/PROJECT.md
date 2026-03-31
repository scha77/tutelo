# Tutelo

## What This Is

Tutelo is a web application that gives K-12 classroom teachers a professional tutoring landing page — with scheduling, payments, and booking — in under 7 minutes, at zero upfront cost. Parents discover and book verified classroom teachers through those pages. Teachers own their client relationships and pay only when they earn (7% platform fee, no monthly cost).

Tagline: "Shopify for teacher side hustles."

## Core Value

**The deferred Stripe model:** teachers publish a professional page and share it with zero financial commitment — payment setup is triggered only when a real parent with real money is waiting. This eliminates the single biggest drop-off in competing products (entering bank info before seeing any value).

## Current State

**Live in production at https://tutelo.app** (deployed March 11, 2026)

- All 101 requirements validated (59 MVP from M001/M002 + 17 polish from M003 + 5 scheduling from M004 + 4 trust & communication from M005 + 5 growth tools from M006 + 9 capacity & pricing from M007 + 2 waitlist from M007/S02)
- **Recurring Sessions (M009 — in progress 🔄):**
  - S01 ✅ Schema & Recurring Booking Creation — `recurring_schedules` table, `generateRecurringDates` + `checkDateConflicts` utilities, `POST /api/direct-booking/create-recurring` (Stripe setup_future_usage), `RecurringOptions` UI component in BookingCalendar, `RecurringBookingConfirmationEmail` template. 25 tests passing, build clean.
  - S02 ⬜ Saved Cards & Auto-Charge Cron
  - S03 ⬜ Cancellation & Dashboard Series UX
- 82 unit tests (25 M009 + 57 M007) + all prior tests passing; build clean
- **Capacity & Pricing (M007 — complete ✅):**
  - capacity_limit on teachers table; profile shows "at capacity" state with waitlist form (S01 ✅)
  - `/dashboard/waitlist` page with entry management; `checkAndNotifyWaitlist` auto-emails waitlisted parents on capacity freed after cancellation (S02 ✅)
  - Session types + variable pricing: SessionTypeManager CRUD in settings, session type selector in BookingCalendar, flat-price Stripe PI fork, backward-compatible hourly_rate fallback (S03 ✅)
- **Growth Tools (M006 — complete ✅):**
  - `/dashboard/promote` page with QR code preview + high-res PNG download
  - `/api/flyer/[slug]` ImageResponse API returning branded 1200×1600 portrait flyer PNG
  - 4 pre-written announcement templates with teacher data interpolated + copy-to-clipboard
  - `openGraph.url` added to `generateMetadata` — OG metadata contract complete for platform unfurl
- **Trust & Communication (M005 — complete):**
  - Twilio-backed SMS pipeline with opt-in gating
  - School email verification with "Verified Teacher" badge
  - Teacher and parent phone collection with TCPA-compliant consent
- **Availability & Scheduling (M004):** 5-minute granularity recurring editor, per-date overrides, 30-min booking slots, duration-prorated payments, one-click cancellation
- **Landing Page & Polish (M003):** Branded marketing landing page, animation system, mobile bottom tab bar, dynamic OG meta tags
- Brand identity applied globally (#3b4d3e sage green, #f6f5f0 warm off-white, Tutelo logo)
- Stripe in test mode — switch to live keys before real payments
- Crons running daily (Vercel Hobby plan)

See `LAUNCH.md` for production environment documentation.

## Architecture / Key Patterns

- **Stack:** Next.js 16.1.6 + Tailwind CSS v4 + Supabase (DB + Auth + Storage) + Stripe Connect Express + Resend + Vercel
- **Auth:** Supabase Auth (Google SSO + email/password). `getUser()` for verified identity checks. `getClaims()` unreliable on POST re-renders in Next.js 16.
- **Protected routes:** API route handlers (not server actions + redirect()) for any action needing cookies under the dashboard layout — Next.js 16 server-action auth bug.
- **Availability:** `TIME` columns in `availability` table, interpreted relative to `teachers.timezone`. Recurring weekly with 5-min granularity. Per-date overrides with override-wins-recurring precedence. 30-min booking slots. Duration-prorated payments.
- **Email:** Resend with React Email templates in `src/emails/`. Gated on `social_email != null`.
- **SMS:** Twilio SDK in `src/lib/sms.ts`. All sends gated on `phone IS NOT NULL AND sms_opt_in = true`. A2P 10DLC registration required for production delivery.
- **Verification:** School email verification via custom token flow. Token gen + Resend email + public callback route stamps `verified_at`.
- **UI:** shadcn/ui components, `tw-animate-css` for CSS animations, `motion` v12.36.0 for complex animations. Design follows 4pt grid system, one sans-serif font family, semantic colors.
- **OG Images & Flyers:** File-based `opengraph-image.tsx` (edge runtime) for OG tags on teacher pages. `/api/flyer/[slug]/route.tsx` (Node.js runtime) for printable flyer PNG — uses Node runtime for `qrcode.toDataURL()` canvas compatibility.

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
- [x] **M006:** Growth Tools — QR codes, printable flyers, copy-paste announcement templates, OG image platform verification
- [x] **M007:** Capacity & Pricing — capacity_limit gate + waitlist signup (S01), waitlist dashboard + auto-notifications on cancellation (S02), session types CRUD + variable Stripe pricing + backward-compat hourly_rate fallback (S03); 57 unit tests, tsc clean, build green
- [x] **M008:** Discovery & Analytics — Public teacher directory with search/filters, SEO category pages, sitemap, page view tracking, conversion funnel analytics
- [ ] **M009:** Recurring Sessions — Recurring booking schedules (weekly/biweekly), auto-created future sessions, per-session payments, series cancellation
- [ ] **M010:** Parent & Admin — Multi-child management, saved payment methods, teacher-parent messaging, read-only admin dashboard

---
*Last updated: 2026-03-31 after M009/S02 completion — Saved Cards & Auto-Charge Cron: payment_failed status migration, webhook PM storage on recurring_schedules, daily cron at /api/cron/recurring-charges (0 12 * * *), RecurringPaymentFailedEmail template, 16 tests pass (8 webhook-capture + 8 recurring-charges), tsc clean, build green. M009/S01 (Schema & Recurring Booking Creation) and M009/S02 complete; S03 (Cancellation & Dashboard Series UX) remaining.*
