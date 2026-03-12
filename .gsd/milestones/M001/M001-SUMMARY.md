---
id: M001
provides:
  - Complete Tutelo MVP web application — teacher onboarding to paid session completion
  - Supabase Auth (email + Google SSO) with session persistence via proxy.ts middleware pattern
  - 3-step teacher onboarding wizard (identity, teaching details, availability) with < 7 min completion
  - Auto-generated public teacher profile page at /[slug] with timezone-aware availability
  - Booking request flow for teachers without Stripe (deferred payment model)
  - Direct booking flow for Stripe-connected teachers (slot → auth → payment inline)
  - Stripe Connect Express integration with deferred onboarding triggered by first booking request
  - Payment authorization at booking, capture at session completion with 7% platform fee
  - 48hr auto-cancel cron for unconfirmed bookings + 24/48hr Stripe reminder escalation emails
  - 24hr session reminder cron for both teacher and parent
  - Parent /account page with booking history and one-click rebook
  - Teacher dashboard with overview stats, sessions history, student list, request management
  - Token-based review flow (mark complete → email → submit review → display on profile)
  - 8 react-email templates via Resend (booking, confirmation, cancellation, reminders, review prompt, follow-ups)
  - 6 Supabase PostgreSQL migrations with RLS on all tables
  - Page customization (accent color, tagline, banner, social links) and Active/Draft visibility toggle
key_decisions:
  - "Deferred Stripe Connect — teachers publish and receive bookings with zero payment setup; Stripe triggered by first real request"
  - "proxy.ts + getClaims() pattern — post-Nov 2025 Supabase auth-js; middleware.ts is just a re-export shim"
  - "Destination charges without on_behalf_of — avoids Stripe error on Express accounts"
  - "Booking state machine enforced at DB level: requested → pending → confirmed → completed → cancelled"
  - "UNIQUE(teacher_id, booking_date, start_time) + atomic RPC for double-booking prevention"
  - "All timestamps TIMESTAMPTZ; availability stored as bare TIME interpreted relative to teacher's IANA timezone"
  - "Insert-then-update pattern for multi-step wizard (avoids upsert NOT NULL violations on partial data)"
  - "Two separate Stripe webhook endpoints with separate signing secrets (platform + connected-account)"
  - "Supabase JS v2: chain .select('id') on .update() to get affected rows (count is always null without explicit header)"
  - "vi.hoisted() + class-based mocks for Vitest ESM compatibility with constructor-based modules"
  - "Inline Supabase auth in booking flow (not Server Action) to avoid redirect breaking booking state"
  - "Google OAuth limitation accepted: redirects away from booking flow, state lost (MVP tradeoff)"
  - "Dashboard desktop-first — sidebar hidden on mobile (responsive is post-MVP)"
patterns_established:
  - "RSC auth guard: getClaims() null check → redirect('/login') at top of page component"
  - "Server Action pattern: 'use server' + getClaims() auth guard + return { error? } or redirect()"
  - "Wave-0 scaffold: migration + it.todo() test stubs first, implementations in parallel Wave-2 plans"
  - "Fire-and-forget email: sendX called without await inside try/catch, never blocks user-facing response"
  - "Supabase FK join type cast: as unknown as TargetType to convert array union to single object"
  - "Pure logic tests for RSC: extract reduce/grouping as standalone functions, test without RSC context"
  - "Cron route pattern: CRON_SECRET Bearer auth → query → per-row conditional update → email on updated.length > 0"
  - "Booking-before-PI: always create booking row first, clean up if Stripe PI creation fails"
  - "Idempotency sentinel: .eq('status', 'requested') guard on all webhook/cron update paths"
observability_surfaces:
  - "Cron JSON responses: { cancelled, total_checked } for auto-cancel; { sent_24hr, sent_48hr } for reminders"
  - "Webhook 200 OK with console.log for each processed event type"
  - "Vitest suite: 105 passing, 45 todo stubs (10 test files skipped for missing env)"
requirement_outcomes:
  - id: all-59
    from_status: active
    to_status: validated
    proof: "All 59 requirements (AUTH, ONBOARD, PAGE, CUSTOM, AVAIL, VIS, BOOK, STRIPE, NOTIF, DASH, PARENT, REVIEW) implemented across 5 slices with 19 tasks. Verified via test suite (105 passing), browser verification at each slice checkpoint, and v1.0 milestone audit that identified remaining gaps closed by phases 6-7."
duration: 8 days (2026-03-04 to 2026-03-11)
verification_result: passed
completed_at: 2026-03-11
---

# M001: Tutelo MVP

**Complete MVP web application — a K-12 teacher can sign up, publish a professional tutoring landing page in under 7 minutes, receive booking requests, connect Stripe when a real parent is waiting to pay, capture payment at session completion with 7% platform fee, and collect reviews — all at zero upfront cost.**

## What Happened

The MVP was built in 5 sequential slices over 8 days (133 commits), following the product's natural dependency chain: identity → booking → payments → direct flow → dashboard.

**S01 (Foundation)** stood up the entire infrastructure: Next.js 16 with Tailwind v4, Supabase Auth (email + Google SSO), the PostgreSQL schema (4 tables, full RLS), the 3-step onboarding wizard, and the public teacher profile page at `/[slug]` with timezone-aware availability display. This slice established every pattern the rest of the build depended on — proxy.ts auth, Server Action conventions, the insert-then-update wizard pattern, and the Wave-0 test scaffold approach.

**S02 (Booking Requests)** wired the core booking loop without payment complexity. Parents submit requests from the public page (atomic DB insert prevents double-booking), teachers receive "money waiting" email notifications via Resend, and accept/decline from the dashboard. The deferred Stripe model was proven here — the product works end-to-end before any payment infrastructure exists.

**S03 (Stripe Connect + Deferred Payment)** added the revenue path. Teachers connect Stripe Express in response to the "money waiting" email. The platform webhook creates Checkout sessions for all waiting parents the moment `charges_enabled` fires. Teachers mark sessions complete to trigger payment capture with the 7% application fee. Supporting infrastructure: 48hr auto-cancel cron, 24/48hr follow-up email escalation, and 6 email templates. A gap-closure task fixed a Supabase JS v2 bug where `.update()` returns `count: null` — the `.select('id')` workaround became a project-wide pattern.

**S04 (Direct Booking + Parent Account)** smoothed the UX for established teachers. When Stripe is already connected, parents go from slot selection through inline auth to Stripe Elements payment in one session — no redirect, no separate checkout page. The parent `/account` page shows booking history with one-click rebook (pre-fills subject). A nightly cron sends 24hr session reminders to both parties.

**S05 (Dashboard + Reviews)** completed the business visibility layer. The teacher dashboard shows earnings, upcoming sessions, and student list via parallel Supabase queries. Token-based review flow: marking a session complete generates a 64-char hex token, emails the parent a review link, and submitted reviews appear on the teacher's public profile.

Two additional gap-closure phases (6-7) fixed integration issues found during a v1.0 audit: BookNowCTA rendering, hourly rate display, rebook URL ordering, and the critical `createCheckoutSessionsForTeacher` status filter that could leave bookings permanently stuck at `pending`.

## Cross-Slice Verification

Each slice was verified at completion via:

- **TypeScript compilation:** `tsc --noEmit` clean throughout (0 errors at every slice boundary)
- **Test suite:** 105 tests passing, 45 todo stubs remaining (scaffolded for future work), 10 test files skipped (require real Supabase env)
- **Browser verification:** Human checkpoint at S01 (profile page, dashboard, availability), S02 (booking flow), and S05 (review display)
- **v1.0 Milestone Audit:** Systematic requirement-by-requirement verification after S05, which identified 5 gaps closed by phases 6-7

Key verification signals:
- Booking atomicity: UNIQUE constraint + `supabase.rpc()` prevents double-booking at DB level
- Stripe webhook integrity: raw body via `req.text()` verified with separate signing secrets per endpoint
- Cron idempotency: `.eq('status', 'requested')` guards prevent duplicate processing on re-runs
- Timezone correctness: Fixed reference date (2025-01-13) eliminates DST-related test flakiness

## Requirement Changes

All 59 requirements transitioned from active → validated during this milestone:

- **AUTH (2):** Auth signup/login + session persistence — verified via test suite and browser
- **ONBOARD (7):** Complete wizard flow with all fields, no-Stripe publish, shareable URL — browser verified
- **PAGE (10):** Public profile with all display elements, mobile CTA, accent theming — browser verified
- **CUSTOM (4):** Dashboard customization (color, tagline, banner, social links) — browser verified
- **AVAIL (3):** Weekly availability CRUD + timezone-aware public display — unit tests + browser
- **VIS (2):** Active/Draft toggle + graceful hidden page state — unit tests + browser
- **BOOK (6):** Request flow, direct flow, state machine, atomic creation, accept/decline — tests + browser
- **STRIPE (7):** Deferred Connect, 48hr cancel, auth/capture, 7% fee, status filter — tests + browser
- **NOTIF (6):** All 6 email notification types implemented via Resend — unit tests
- **DASH (6):** Overview, requests, sessions, students, mark complete, page toggle — browser verified
- **PARENT (3):** Account creation, booking history, rebook — browser verified
- **REVIEW (3):** Submit review, display on profile, email prompt — tests + browser

## Forward Intelligence

### What the next milestone should know
- The MVP feature set is complete but the app has not been deployed to production or tested with real users. Vercel deployment, Supabase Pro upgrade, and real Stripe credentials are prerequisites for launch.
- 45 test stubs remain as `it.todo()` — these are scaffolded but unimplemented. They cover deeper integration scenarios that were deprioritized for velocity.
- 10 test files are skipped entirely because they need real Supabase environment variables to run.
- The old `.planning/` directory still exists alongside `.gsd/` — it can be deleted once migration is confirmed stable.

### What's fragile
- **Google OAuth in booking flow** — redirects away and loses booking state. Accepted MVP tradeoff, but parent UX suffers. Email+password works inline. A post-MVP fix would use popup OAuth or state persistence.
- **Supabase RLS policy for guest bookings** (`bookings_anon_insert WITH CHECK (true)`) — deliberately permissive at MVP. Must be tightened before any abuse vector matters at scale.
- **Cron jobs require Vercel Pro** ($20/mo) — Hobby plan only supports daily crons. Auto-cancel (hourly) and reminders (daily) won't run on free tier.
- **Email delivery** — `RESEND_API_KEY` must be provisioned with real credentials before any emails send. Currently a placeholder in `.env.local`.
- **Supabase free tier pausing** — project pauses after 1 week of inactivity. Must upgrade to Pro ($25/mo) before any public launch.

### Authoritative diagnostics
- `npx vitest run` — 105 passing / 45 todo / 0 failures is the baseline. Any regression from this is a real bug.
- `npx tsc --noEmit` — must stay at 0 errors. TypeScript strict mode is enforced.
- Cron endpoints return structured JSON (`{ cancelled, total_checked }`, `{ sent_24hr, sent_48hr }`) — inspectable via curl.
- Stripe webhook endpoints log event type to console on every invocation.

### What assumptions changed
- **proxy.ts naming:** Originally assumed `proxy.ts` replaces `middleware.ts` as the filename. In practice, Next.js 16.1.6 still requires `middleware.ts` as the entry point — `proxy.ts` contains the logic but `src/middleware.ts` is the shim that delegates to it.
- **Supabase upsert:** Assumed upsert would work for partial wizard saves. It doesn't — NOT NULL constraints fire on columns not yet filled. Insert-then-update is the correct pattern.
- **Supabase JS v2 count:** Assumed `.update()` returns a usable `count`. It returns `null` unless `{ count: 'exact' }` header is explicitly set. `.select('id')` chained on update is the reliable pattern.
- **Stripe on_behalf_of:** Assumed destination charges could use `on_behalf_of`. They can't with Express accounts — use `transfer_data.destination` only.
- **Zod v4 API:** `.errors` renamed to `.issues` on `ZodError`. zodResolver cast needed for RHF compatibility.

## Codebase at Completion

| Metric | Count |
|--------|-------|
| Source files (src/) | 95 |
| Test files | 29 |
| Tests passing | 105 |
| Tests todo | 45 |
| DB migrations | 6 |
| Email templates | 8 |
| API routes | 6 |
| Server Actions | 7 |
| Git commits | 133 |
| Duration | 8 days (Mar 4–11, 2026) |
