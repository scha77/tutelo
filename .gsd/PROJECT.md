# Tutelo

## What This Is

Tutelo is a web application that gives K-12 classroom teachers a professional tutoring landing page — with scheduling, payments, and booking — in under 7 minutes, at zero upfront cost. Parents discover and book verified classroom teachers through those pages. Teachers own their client relationships and pay only when they earn (7% platform fee, no monthly cost).

Tagline: "Shopify for teacher side hustles."

## Core Value

**The deferred Stripe model:** teachers publish a professional page and share it with zero financial commitment — payment setup is triggered only when a real parent with real money is waiting. This eliminates the single biggest drop-off in competing products (entering bank info before seeing any value).

## Current State

**Live in production at https://tutelo.app** (deployed March 11, 2026)

- All 59 MVP requirements implemented and validated (M001) and verified working in production (M002)
- Stripe in test mode — switch to live keys before real payments
- Crons running daily (Vercel Hobby plan)
- Homepage (tutelo.app/) still shows Next.js default page — M003 replaces it with a marketing landing page
- No animations or motion library in the app yet
- Dashboard is desktop-only (sidebar hidden on mobile)
- social_email not auto-populated — teachers can miss booking notifications

See `LAUNCH.md` for production environment documentation.

## Architecture / Key Patterns

- **Stack:** Next.js 16.1.6 + Tailwind CSS v4 + Supabase (DB + Auth + Storage) + Stripe Connect Express + Resend + Vercel
- **Auth:** Supabase Auth (Google SSO + email/password). `getUser()` for verified identity checks. `getClaims()` unreliable on POST re-renders in Next.js 16.
- **Protected routes:** API route handlers (not server actions + redirect()) for any action needing cookies under the dashboard layout — Next.js 16 server-action auth bug.
- **Proxy:** `src/proxy.ts` handles token refresh only, no auth redirects. `middleware.ts` is a re-export shim.
- **Availability:** `TIME` columns (no tz) in `availability` table, interpreted relative to `teachers.timezone`. Recurring weekly, 1-hour blocks currently.
- **Email:** Resend with React Email templates in `src/emails/`. Gated on `social_email != null`.
- **UI:** shadcn/ui components, `tw-animate-css` installed, no motion library yet.

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [x] **M001:** Migration — All 59 requirements implemented and validated with 105 passing tests
- [x] **M002:** Production Launch — Deployed to tutelo.app; all flows verified end-to-end on live URL
- [ ] **M003:** Landing Page & Polish — Marketing landing page, brand identity, UI animations, mobile dashboard, OG tags
- [ ] **M004:** Availability & Scheduling Overhaul — 5-min granularity, per-date overrides, weeks-in-advance planning, redesigned editor, last-minute cancellation
- [ ] **M005:** Trust & Communication — Teacher verification system, SMS notifications, SMS cancellation alerts

---
*Last updated: 2026-03-11 after M003 planning*
