# Tutelo

## What This Is

Tutelo is a web application that gives K-12 classroom teachers a professional tutoring landing page — with scheduling, payments, and booking — in under 7 minutes, at zero upfront cost. Parents discover and book verified classroom teachers through those pages. Teachers own their client relationships and pay only when they earn (7% platform fee, no monthly cost).

Tagline: "Shopify for teacher side hustles."

## Core Value

**The deferred Stripe model:** teachers publish a professional page and share it with zero financial commitment — payment setup is triggered only when a real parent with real money is waiting. This eliminates the single biggest drop-off in competing products (entering bank info before seeing any value).

## Current State

**Live in production at https://tutelo.app** (deployed March 11, 2026)

- **151 requirements validated** across M001–M012 with stable IDs, ownership traceability, and coverage summary
- **Dashboard Mobile Performance (M014 — complete ✅):**
  - Auth proxy redirects for /dashboard, /parent, /admin — unauthenticated users redirect before layout renders
  - Dashboard layout streams shell instantly via Suspense (sidebar/nav skeletons while data loads)
  - Zod (296K) removed from shared client bundle — only loads on /onboarding
  - 52 test files, 490 tests passing, 0 failures
- **Codebase Cohesion & Observability (M013 — complete ✅):**
  - Sentry integrated across client/server/edge runtimes, 44 catch blocks instrumented
  - All test failures fixed, all stubs resolved, full capability contract rebuilt
- **Performance & Delivery Efficiency (M012 — complete ✅):** Profile pages and directory served from CDN via ISR, dashboard query caching with revalidateTag, motion library eliminated from all dashboard/parent routes (~135KB savings), clean Vercel Hobby build.
- **Design Polish (M011 — complete ✅):** Every user-facing surface upgraded to premium SaaS standard — teacher profile page, booking flow (decomposed into 4 sub-components), mobile navigation (labeled tabs + More menu), all 16 dashboard pages (headers, tinted pills, avatar circles, card elevation), landing page (proper footer, hero badge), and global consistency on auth/booking-confirmed/directory pages.
- **Recurring Sessions (M009 — complete ✅):** recurring_schedules table, weekly/biweekly generation, Stripe setup_future_usage + auto-charge cron, cancel_token self-service cancellation.
- **Capacity & Pricing (M007 — complete ✅):** capacity_limit with waitlist auto-notification, session types with variable pricing.
- **Growth Tools (M006 — complete ✅):** QR codes, printable flyers, announcement templates, OG metadata.
- **Trust & Communication (M005 — complete):** Twilio SMS pipeline, school email verification, TCPA-compliant consent.
- **Availability & Scheduling (M004):** 5-minute granularity recurring editor, per-date overrides, 30-min booking slots.
- **Landing Page & Polish (M003):** Branded marketing landing page, animation system, mobile bottom tab bar, dynamic OG meta tags.
- Brand identity applied globally (#3b4d3e sage green, #f6f5f0 warm off-white, Tutelo logo)
- Stripe in test mode — switch to live keys before real payments
- Crons running daily (Vercel Hobby plan)

See `LAUNCH.md` for production environment documentation.

## Architecture / Key Patterns

- **Stack:** Next.js 16.1.6 + Tailwind CSS v4 + Supabase (DB + Auth + Storage) + Stripe Connect Express + Resend + Vercel
- **Auth:** Supabase Auth (Google SSO + email/password). `getUser()` for verified identity checks. `getClaims()` unreliable on POST re-renders in Next.js 16.
- **Protected routes:** API route handlers (not server actions + redirect()) for any action needing cookies under the dashboard layout — Next.js 16 server-action auth bug.
- **ISR & Caching:** Profile pages (`/[slug]`) and directory category pages (`/tutors/[category]`) served via ISR with 1h revalidation. On-demand revalidation via `revalidatePath` in profile/booking/availability actions. Dashboard queries cached with `unstable_cache` + `revalidateTag`. ISR routes must use `supabaseAdmin` (not `createClient()` which calls `cookies()` and forces dynamic).
- **Motion library boundary:** motion is used ONLY on landing page, profile page, and onboarding routes. All dashboard (`/dashboard/*`) and parent (`/parent/*`) routes use CSS-only transitions (data-state pattern, animate-list/animate-list-item, Tailwind transition-transform). AnimatedButton.tsx and animation.ts are preserved for public-facing routes.
- **Availability:** `TIME` columns in `availability` table, interpreted relative to `teachers.timezone`. Recurring weekly with 5-min granularity. Per-date overrides with override-wins-recurring precedence. 30-min booking slots. Duration-prorated payments.
- **Email:** Resend with React Email templates in `src/emails/`. Gated on `social_email != null`.
- **SMS:** Twilio SDK in `src/lib/sms.ts`. All sends gated on `phone IS NOT NULL AND sms_opt_in = true`. A2P 10DLC registration required for production delivery.
- **Verification:** School email verification via custom token flow. Token gen + Resend email + public callback route stamps `verified_at`.
- **UI:** shadcn/ui components, `tw-animate-css` for CSS animations, `motion` v12.36.0 for complex animations on public pages only. Design follows 4pt grid system, one sans-serif font family, semantic colors. Premium card standard: `rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow`. Tinted icon pills: `color-mix(in srgb, var(--primary) 12%, transparent)` in dashboards, `var(--accent)` on teacher profile only. Page headers: `text-2xl font-bold tracking-tight` + muted subtitle.
- **OG Images & Flyers:** File-based `opengraph-image.tsx` (edge runtime) for OG tags on teacher pages. `/api/flyer/[slug]/route.tsx` (Node.js runtime) for printable flyer PNG — uses Node runtime for `qrcode.toDataURL()` canvas compatibility.
- **Observability:** Sentry integrated for error tracking (M013/S02). Client/server/edge runtimes initialized. 44 catch blocks report to Sentry with stack traces. Error boundaries capture exceptions. tunnelRoute '/monitoring' bypasses ad-blockers. sendDefaultPii: false for student data protection. Sentry Crons heartbeat monitoring on all 4 cron routes (M015/S02) — silent failures are now detectable. DSN configuration needed in production.
