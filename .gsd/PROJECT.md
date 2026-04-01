# Tutelo

## What This Is

Tutelo is a web application that gives K-12 classroom teachers a professional tutoring landing page — with scheduling, payments, and booking — in under 7 minutes, at zero upfront cost. Parents discover and book verified classroom teachers through those pages. Teachers own their client relationships and pay only when they earn (7% platform fee, no monthly cost).

Tagline: "Shopify for teacher side hustles."

## Core Value

**The deferred Stripe model:** teachers publish a professional page and share it with zero financial commitment — payment setup is triggered only when a real parent with real money is waiting. This eliminates the single biggest drop-off in competing products (entering bank info before seeing any value).

## Current State

**Live in production at https://tutelo.app** (deployed March 11, 2026)

- All 110 requirements validated (59 MVP from M001/M002 + 17 polish from M003 + 5 scheduling from M004 + 4 trust & communication from M005 + 5 growth tools from M006 + 9 capacity & pricing from M007 + 2 waitlist from M007/S02 + 9 recurring sessions from M009)
- **Recurring Sessions (M009 — complete ✅):**
  - S01 ✅ Schema & Recurring Booking Creation — `recurring_schedules` table, `generateRecurringDates` + `checkDateConflicts` utilities, `POST /api/direct-booking/create-recurring` (Stripe setup_future_usage), `RecurringOptions` UI component in BookingCalendar, `RecurringBookingConfirmationEmail` template. 25 tests passing.
  - S02 ✅ Saved Cards & Auto-Charge Cron — Stripe Customer per schedule, per-session auto-charge cron (`/api/cron/recurring-charges`, runs noon UTC daily), `payment_failed` booking status, failed-charge notification emails.
  - S03 ✅ Cancellation & Dashboard Series UX — `cancel_token` on `recurring_schedules` (migration 0016), `cancelSingleRecurringSession` + `cancelRecurringSeries` server actions, "Recurring" + "Payment Failed" badges on ConfirmedSessionCard, `/manage/[token]` parent self-service page (no login required), `/api/manage/cancel-session` + `/api/manage/cancel-series` token-gated routes. 26 tests passing.
- 26 unit tests (S03) + prior M009 tests passing; build clean (56 routes); zero type errors
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
- [x] **M009:** Recurring Sessions — Recurring booking schedules (weekly/biweekly), auto-created future sessions, per-session payments, series cancellation
- [ ] **M010:** Parent & Admin — Parent dashboard with multi-child management, saved payment cards, real-time teacher-parent messaging, Google SSO verification, read-only admin dashboard
  - S01 ✅ Parent Dashboard & Multi-Child — `children` table (migration 0017) with RLS + `child_id` FK on bookings, parent-only auth routing to `/parent` across all 3 auth paths (callback, signIn, login page), `/account` → `/parent/bookings` redirect, auth-guarded `(parent)` route group (layout + 3 pages), ParentSidebar + ParentMobileNav, `/api/parent/children` CRUD API with ownership checks, BookingCalendar child selector dropdown with guest fallback, 46 unit tests passing.
  - S02 ✅ Google SSO Verification — Fixed OAuth `redirectTo` bug (`/auth/callback` → `/callback`), 7 unit tests covering Google button behavior + all 4 callback route paths + AUTH-04 provider-agnostic smoke test. Full suite: 426 tests, 0 failures.
  - S03 ✅ Saved Payment Methods — `parent_profiles` table (migration 0018) with Stripe Customer + saved card fields + RLS. `create-intent` attaches parent-level Customer + `setup_future_usage: 'off_session'` + `parent_id` in metadata. `create-recurring` reuses parent Customer from `parent_profiles`. Webhook upserts PM card details after capture. GET/DELETE `/api/parent/payment-method` API routes. `/parent/payment` dashboard page with card display + remove action. Payment nav item (CreditCard icon) in parentNavItems. 18 unit tests (saved-payment-methods.test.ts). Full suite: 444 tests, 0 failures.
  - S04 ✅ Teacher-Parent Messaging — `conversations` + `messages` tables (migration 0019) with RLS, CHECK constraints, indexes, UNIQUE(teacher_id, parent_id), and Realtime publication. Three API routes: GET/POST `/api/messages`, GET `/api/conversations`. `ChatWindow` client component with Supabase Realtime `postgres_changes` subscription, optimistic send + rollback, Realtime deduplication, auto-scroll, Enter-to-send. Conversation list pages for parent (`/parent/messages`) and teacher (`/dashboard/messages`) with last-message preview + relative timestamps. Chat detail pages at `/parent/messages/[conversationId]` and `/dashboard/messages/[conversationId]`. Messages nav items in both ParentSidebar and teacher Sidebar. `NewMessageEmail` React Email template with 5-min rate-limit cooldown. 21 unit tests (messaging.test.ts). Full suite: 465 tests, 0 failures.

---
*Last updated: 2026-04-01 after M010/S04 completion — Teacher-Parent Messaging. conversations + messages tables (migration 0019), RLS + Realtime, three API routes, ChatWindow Realtime component, conversation list + chat detail pages for both roles, NewMessageEmail template with rate-limited notifications, 21 new unit tests. Full test suite: 465 tests across 49 files, 0 failures.*
