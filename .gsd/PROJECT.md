# Tutelo

## What This Is

Tutelo is a web application that gives K-12 classroom teachers a professional tutoring landing page — with scheduling, payments, and booking — in under 7 minutes, at zero upfront cost. Parents discover and book verified classroom teachers through those pages. Teachers own their client relationships and pay only when they earn (7% platform fee, no monthly cost).

Tagline: "Shopify for teacher side hustles."

## Core Value

**The deferred Stripe model:** teachers publish a professional page and share it with zero financial commitment — payment setup is triggered only when a real parent with real money is waiting. This eliminates the single biggest drop-off in competing products (entering bank info before seeing any value).

## Current State

**Live in production at https://tutelo.app** (deployed March 11, 2026)

- All 124 requirements validated (59 MVP from M001/M002 + 17 polish from M003 + 5 scheduling from M004 + 4 trust & communication from M005 + 5 growth tools from M006 + 9 capacity & pricing from M007 + 2 waitlist from M007/S02 + 9 recurring sessions from M009 + 14 parent & admin from M010)
- **Design Polish (M011 — complete ✅):** Every user-facing surface upgraded to premium SaaS standard — teacher profile page, booking flow (decomposed into 4 sub-components), mobile navigation (labeled tabs + More menu), all 16 dashboard pages (headers, tinted pills, avatar circles, card elevation), landing page (proper footer, hero badge), and global consistency on auth/booking-confirmed/directory pages.
- 474 tests passing (0 failures); `tsc --noEmit` clean; `npx next build` succeeds (67 pages)
- **Recurring Sessions (M009 — complete ✅):**
  - S01 ✅ Schema & Recurring Booking Creation — `recurring_schedules` table, `generateRecurringDates` + `checkDateConflicts` utilities, `POST /api/direct-booking/create-recurring` (Stripe setup_future_usage), `RecurringOptions` UI component in BookingCalendar, `RecurringBookingConfirmationEmail` template. 25 tests passing.
  - S02 ✅ Saved Cards & Auto-Charge Cron — Stripe Customer per schedule, per-session auto-charge cron (`/api/cron/recurring-charges`, runs noon UTC daily), `payment_failed` booking status, failed-charge notification emails.
  - S03 ✅ Cancellation & Dashboard Series UX — `cancel_token` on `recurring_schedules` (migration 0016), `cancelSingleRecurringSession` + `cancelRecurringSeries` server actions, "Recurring" + "Payment Failed" badges on ConfirmedSessionCard, `/manage/[token]` parent self-service page (no login required), `/api/manage/cancel-session` + `/api/manage/cancel-series` token-gated routes. 26 tests passing.
- 474 unit tests passing (0 failures); `tsc --noEmit` clean; 49 test files
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
- **UI:** shadcn/ui components, `tw-animate-css` for CSS animations, `motion` v12.36.0 for complex animations. Design follows 4pt grid system, one sans-serif font family, semantic colors. Premium card standard: `rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow`. Tinted icon pills: `color-mix(in srgb, var(--primary) 12%, transparent)` in dashboards, `var(--accent)` on teacher profile only. Page headers: `text-2xl font-bold tracking-tight` + muted subtitle.
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
- [x] **M009:** Recurring Sessions — Recurring booking schedules (weekly/biweekly), auto-created future sessions, per-session payments, series cancellation
- [x] **M010:** Parent & Admin — Parent dashboard with multi-child management, saved payment cards, real-time teacher-parent messaging, Google SSO verification, read-only admin dashboard (5 slices, 55 new tests, 4 migrations, 95 files changed)
- [x] **M011:** Design Polish & Visual Consistency — Raised every user-facing surface from functional MVP to premium SaaS standard: teacher profile, booking flow, mobile navigation, both dashboards, landing page, global consistency
  - S01 ✅ Teacher Profile Page Overhaul — HeroSection, CredentialsBar, AboutSection, ReviewsSection, SocialLinks all redesigned with premium patterns
  - S02 ✅ Booking Calendar Restructure & Polish — 935→617 line orchestrator + 4 extracted sub-components (CalendarGrid, TimeSlotsPanel, SessionTypeSelector, BookingForm)
  - S03 ✅ Mobile Navigation Overhaul — 4 labeled primary tabs + More panel for teachers, labeled tabs for parents
  - S04 ✅ Dashboard Polish — Premium headers, tinted icon pills, avatar circles, card elevation, empty states across all 11 teacher + 5 parent pages
  - S05 ✅ Landing Page & Global Consistency — Proper footer with nav links, hero pill badge, card wrappers on auth/booking-confirmed/tutors directory

---
*Last updated: 2026-04-03 — M011 complete and deployed. All user-facing surfaces polished to premium standard. 474 tests passing, tsc clean, build green.*
