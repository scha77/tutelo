# Research Summary: Tutelo

**Project:** Tutelo — tutoring marketplace / teacher side-hustle SaaS
**Domain:** Two-sided booking platform targeting K-12 classroom teachers
**Researched:** 2026-03-03
**Confidence:** MEDIUM-HIGH (Next.js/Tailwind stack HIGH; Supabase and Stripe patterns MEDIUM due to limited live doc access)

---

## Executive Summary

Tutelo is a tutoring booking platform purpose-built for K-12 classroom teachers doing side-hustle tutoring — not professional full-time tutors. This distinction drives every feature and architecture decision. The recommended approach builds on a well-validated Next.js 16 + Supabase + Stripe Connect Express stack, with Vercel hosting, Resend for email, and Tailwind v4 + shadcn/ui for UI. The product has one genuine technical innovation: deferred Stripe Connect onboarding, where teachers are not required to connect bank accounts until a parent submits a real booking request. This removes the primary conversion-killer for side-hustle teachers who need to see demand before investing setup effort.

The competitive landscape is clear and the gap is real. Wyzant and Preply take 18-40% commission, require days-long approval, and are designed for full-time professional tutors. Fons requires a $29-49/month subscription with payment setup upfront. Calendly and Acuity Scheduling provide no public profile, no teacher identity, and no trust-building layer. Tutelo's differentiation is: sub-7-minute onboarding, zero upfront cost (7% at point of payment only), and an auto-generated public profile page that serves as the teacher's booking page, portfolio, and word-of-mouth distribution vector all at once.

The primary risks are not technical — they are architectural correctness on payments (Stripe Connect capabilities, webhook configuration, booking state machines), timezone correctness in the booking system, Supabase RLS policy design, and GTM validation (whether the Instagram teacher audience converts to product signups). All critical technical pitfalls are known and preventable if caught in Phase 1 schema and API design. The GTM risk is the least controllable: the Instagram audience may follow for content but not convert to product users, making pre-launch validation of conversion intent a prerequisite before committing 6+ months of build time.

---

## Stack Decisions

### Core Stack (Pre-Decided)

The stack is largely pre-decided and well-suited to the product. Key validated choices:

| Technology | Version | Purpose | Critical Notes |
|------------|---------|---------|----------------|
| Next.js | 16.1.6 | Full-stack framework | `middleware.ts` renamed to `proxy.ts`; export must be named `proxy`. All dynamic APIs (`params`, `cookies()`, `headers()`) are now async — `await` required everywhere. |
| Tailwind CSS | v4.0 | Styling | CSS-first config via `@theme` block; no `tailwind.config.js`. Import is `@import "tailwindcss"`. Content detection is automatic. |
| shadcn/ui | latest | UI components | Run `npx shadcn@latest init` — handles Tailwind v4 setup. Components are copied into your project (not installed), giving full ownership. |
| Supabase | latest | Auth + database | Use `@supabase/ssr` package (NOT the deprecated `@supabase/auth-helpers-nextjs`). Three client types needed: browser, server, and proxy. |
| Stripe Connect Express | latest | Payments | Use `stripe` (server) + `@stripe/stripe-js` (client). Authorize-then-capture model fits Tutelo's deferred session completion billing. |
| Vercel | — | Hosting | Standard deploy; no exotic config. Set all env vars in dashboard. Use Vercel Speed Insights (free). |
| Resend + react-email | latest | Transactional email | Trigger from Server Actions. Free tier: 3,000/month — sufficient for MVP. |

### Supporting Libraries

| Library | Purpose | Notes |
|---------|---------|-------|
| Zod | Schema validation | Explicitly recommended in Next.js official auth guide. Single source of truth for TypeScript types. |
| React Hook Form + @hookform/resolvers | Multi-step forms | Justified for the 4-step onboarding wizard; instant client-side validation without server round-trips. |
| date-fns + date-fns-tz | Date/time handling | Tree-shakeable, no mutations. `date-fns-tz` required for timezone-aware bookings. |
| Zustand | Client state (when needed) | Only for multi-step onboarding state across steps. Default to Server Components + useState. |
| slugify | Teacher URL slugs | Convert teacher name to URL-safe slug. |

### Breaking Changes to Know Before Writing Any Code

1. `proxy.ts` not `middleware.ts` — name the file and export correctly from day one
2. `await params` required in all dynamic route handlers — `params` is a Promise in Next.js 16
3. `await cookies()` required everywhere — sync access throws at runtime
4. Tailwind v4 has no `tailwind.config.js` by default — don't create one
5. `@supabase/auth-helpers-nextjs` is deprecated — use `@supabase/ssr`
6. Always use `supabase.auth.getUser()` not `getSession()` — `getSession()` is insecure (does not verify with server)

---

## Table Stakes Features

Features that must exist for the MVP to be credible. Missing any of these causes immediate trust failure or UX breakdown.

| Feature | Why Non-Negotiable | MVP Implementation |
|---------|-------------------|-------------------|
| Public profile / landing page | The core product. Without it, Tutelo is nothing. | Auto-generated from onboarding. `/[slug]` page. |
| Booking request form | The core transaction. | Two-phase form: pre-Stripe (request only) and post-Stripe (request + payment). |
| Availability display | Parents need to know when to book. | Static weekly grid built with shadcn Calendar + Tailwind. No real-time library needed. |
| Email notifications | Both parties expect booking confirmation and reminders. | Resend transactional emails. Minimum: booking received, confirmation, 24hr reminder. |
| Mobile-first experience | Instagram GTM means mobile-first users. Sticky "Book Now" CTA mandatory. | Tailwind responsive design. shadcn components are accessible by default. |
| Payment collection | Professional payments = professional trust. | Stripe Connect Express with deferred onboarding — the defining UX innovation. |
| Shareable URL | `tutelo.com/ms-johnson` is the distribution mechanism. | Slug generated from teacher name at onboarding. |
| Session history | Teachers need records for tax purposes at minimum. | Dashboard with completed sessions and earnings. |
| Review / social proof | Teacher profiles with zero reviews look new or suspect. | Post-session email prompt to parent. Reviews displayed on public profile. |
| Cancellation pathway | Life happens. Must not require a support ticket. | Email-based at MVP. No policy enforcement logic in Phase 1. |

### Deliberate Anti-Features (Do Not Build at MVP)

The following are feature traps — complexity far exceeding their MVP value:

- **In-app messaging** — 3-5x the complexity of everything else. Use email and tell users to text each other.
- **Video conferencing** — Teachers already have Zoom. "Use Zoom" is pragmatism, not a gap.
- **Discovery / search marketplace** — Requires critical mass. With 50 teachers, search delivers nothing. Teachers bring their own clients.
- **Recurring / subscription bookings** — DST edge cases, cancellation complexity, billing logic. Phase 2 at earliest.
- **Credential verification** — Background checks add days to onboarding. Self-reported with disclaimer is acceptable at MVP.
- **Native mobile app** — PWA-quality responsive web is sufficient. No native app until there is a workflow that genuinely requires it.
- **Session notes / progress tracking** — Teachers can use Google Docs. Not a booking-tool responsibility at MVP.

---

## Architecture Approach

Tutelo's architecture follows a server-components-first pattern with strict client/server security boundaries. All data-fetching pages are React Server Components using the Supabase server client. Client Components are reserved for interactive widgets only: booking form, calendar picker, Stripe Elements. The Supabase `service_role` key (bypasses RLS) is used exclusively in API Route Handlers — never in Server Components, never client-side. Stripe SDK is server-only in `/api/stripe/*` routes.

### Major Components

| Component | Responsibility |
|-----------|---------------|
| `proxy.ts` | Session refresh on every request; route protection for `/dashboard` and `/onboarding` |
| `/app/[slug]/page.tsx` | Public teacher profile (RSC) — fetches teacher, availability, reviews |
| `/app/[slug]/BookingForm.tsx` | Client Component — interactive booking, Stripe Elements |
| `/app/dashboard/*` | Teacher dashboard (RSC shell, client islands for interactive parts) |
| `/app/api/stripe/webhook/route.ts` | Platform webhook handler — raw body (`req.text()`), Stripe signature verification |
| `/app/api/stripe-connect/webhook/route.ts` | Connected account webhook — separate secret |
| `/app/api/bookings/create/route.ts` | Atomic booking creation — conflict check + insert in single DB transaction |
| Supabase PostgreSQL + RLS | All persistent data with row-level security on every table |
| Supabase Auth | Teacher and parent identity, JWT sessions |
| Stripe Connect Express | Teacher payment accounts, PaymentIntents, application fees |
| Resend | Transactional emails triggered from Server Actions |

### Database Schema (Core Tables)

Four core tables: `teachers`, `availability`, `bookings`, `reviews`. Key design decisions:
- `bookings.status` is an explicit state machine: `requested → pending → confirmed → completed → cancelled`
- `teachers.stripe_connected` (boolean) and `teachers.stripe_charges_enabled` (boolean) are separate fields, updated by webhook
- `bookings.payment_token` (UUID) enables guest parents to complete payment without creating an account
- All timestamps are `timestamptz` — never bare `timestamp` or `time` without timezone

### Booking State Machine

The deferred Stripe flow requires an explicit state machine. This MUST be designed before writing booking code:

```
Parent submits request
  → bookings.status = 'requested'
  → Email teacher: "booking request + money waiting"

Teacher has Stripe connected?
  YES → Create PaymentIntent immediately → status = 'pending' → Email parent to pay
  NO  → Email teacher: "Connect Stripe to confirm" → 48-hour timeout or auto-cancel

Teacher completes Stripe onboarding
  → webhook: account.updated (charges_enabled: true)
  → Create PaymentIntents for all 'requested' bookings
  → status = 'pending' → Email parents to pay

Parent completes payment
  → webhook: payment_intent.amount_capturable_updated
  → status = 'confirmed' → Confirmation emails to both parties

Session occurs
  → Teacher marks complete
  → stripe.paymentIntents.capture()
  → status = 'completed'
  → Email parent: review request
```

### Build Order (Dependency-Driven)

Phase ordering is strictly dictated by data dependencies:

```
Auth + Teachers (foundation — everything depends on identity)
  → Availability (needed before bookings can reference time slots)
    → Booking Requests without payment (prove the loop works)
      → Stripe Connect + Deferred Payment (revenue path)
        → Direct Booking for established teachers
          → Dashboard + Reviews (requires completed bookings to exist)
```

---

## Critical Pitfalls

These will cause product failure or expensive rewrites if not addressed in Phase 1.

### 1. Stripe Connect: Two Webhook Endpoints, Two Secrets

Most developers configure one webhook and miss connected-account events. Tutelo needs:
- `/api/stripe/webhook` — platform events (`payment_intent.succeeded`, `charge.refunded`)
- `/api/stripe-connect/webhook` — connected account events (`account.updated`, `payout.failed`, `account.application.deauthorized`)

Each endpoint uses a different signing secret. Missing `account.updated` means `stripe_charges_enabled` never updates and all bookings are permanently blocked.

**Prevention:** Configure both endpoints in the Stripe dashboard immediately. Store `STRIPE_WEBHOOK_SECRET` and `STRIPE_CONNECT_WEBHOOK_SECRET` as separate env vars.

### 2. Timezone Storage: The Silent Data Corruption

Booking systems that store times without timezone information corrupt data silently. A teacher in EST setting "3pm" availability stores `15:00` — but a parent in PST sees it as a different time.

**Prevention:** Store ALL timestamps as `timestamptz` in Supabase. Add `timezone TEXT NOT NULL` (IANA format, e.g., `America/New_York`) to the `teachers` table and require it during onboarding. Use `date-fns-tz` for all client-side conversions. Test across timezones explicitly.

### 3. Booking Double-Book Race Condition

The naive "check availability, then insert" pattern creates a TOCTOU race condition. Two parents can both pass the availability check simultaneously and both get confirmed.

**Prevention:** Implement booking creation as a single atomic Postgres function via `supabase.rpc()`. Add a unique constraint on `(teacher_id, booking_date, start_time)` with status filter so the database enforces non-overlap at the constraint level.

### 4. Supabase RLS Silent Failures

RLS policy bugs don't throw errors — they silently return empty results or silently block writes. The trap: Supabase Studio uses the service role (bypasses RLS), so "works in Studio" doesn't mean policies are correct.

**Prevention:** Enable RLS immediately on every table (never create a table without policies). Test every policy by calling the API as an authenticated user with the specific role (`parent`, `teacher`), not from Studio. Build a small test harness in Phase 1.

### 5. Deferred Stripe Limbo States

The deferred onboarding creates orphaned booking states if not handled explicitly. Parent submits request, teacher starts Stripe onboarding but abandons halfway — booking is in limbo, parent is waiting, teacher thinks it's resolved.

**Prevention:** Implement a 48-hour timeout on `requested` bookings — if teacher has not connected Stripe within 48 hours, auto-cancel with notification to both parties. Make the state machine explicit in the DB schema with status CHECK constraints.

### 6. Stripe Webhook Raw Body Destruction

`stripe.webhooks.constructEvent()` requires the raw, unparsed request body. Using `req.json()` destroys the raw bytes and signature verification always fails.

**Prevention:** Use `const body = await req.text()` in all Stripe webhook route handlers. Never `req.json()`.

### 7. Supabase Free Tier Project Pausing

Supabase free tier pauses projects after 1 week of inactivity. If Tutelo goes quiet during iteration cycles, users hit a dead site.

**Prevention:** Upgrade to Supabase Pro ($25/month) before any public launch. Non-negotiable.

---

## Key Recommendations

### 1. Draw the booking state machine before writing any code

The deferred Stripe model creates 5+ distinct booking states (`requested`, `pending`, `confirmed`, `completed`, `cancelled`). The state transitions must be explicit with database-level constraints before any booking API or UI is written. Retrofitting a state machine is significantly more expensive than designing it upfront.

### 2. Configure both Stripe webhook endpoints in Phase 1

Two webhook endpoints with two separate signing secrets must be wired before any payment code is written. Every Stripe-related feature downstream depends on `account.updated` firing correctly. This is not a Phase 3 cleanup item.

### 3. Store timezone at teacher onboarding, use `timestamptz` everywhere

Add `timezone TEXT NOT NULL` to the `teachers` table. Make it a required field in the onboarding wizard. Use `timestamptz` for every timestamp column. Use `date-fns-tz` for all client-side time operations. This is a schema decision that cannot be cheaply retrofitted.

### 4. Validate GTM intent before shipping

The Instagram audience built around teacher content (@eyes_on_meme) is a genuine distribution advantage. However, content-to-commerce conversion is uncertain. Before committing 6+ months of build time, post a CTA ("Would you use this tool?") or a waitlist link to validate that the audience converts. Simultaneously, begin building an email list of interested teachers — Instagram algorithm changes are a single-point-of-failure risk.

### 5. Seed 20-30 teacher profiles before opening to parents

Classic two-sided marketplace cold-start problem. Do not launch to parents with an empty directory. Personally onboard the first 20-30 teachers from the Instagram audience via DM. Walk them through signup. This is a launch prerequisite, not a launch goal.

### 6. Resist scope creep with a hard "not in MVP" list

At 10-15 hours/week, total build time to launch is 5-7 months. Every feature added to MVP is a week slipped. Maintain a written "not in MVP" list covering: in-app messaging, video conferencing, recurring bookings, discovery search, credential verification, native app. Treat additions to this list as a formal decision requiring explicit rationale.

### 7. Upgrade Supabase to Pro before launch and add school email verification to onboarding

Supabase free tier will pause the project during low-traffic periods. Upgrade before any public launch. Additionally, school email verification (`@[district].edu`) is a low-cost, high-trust signal that differentiates Tutelo from anonymous tutor directories without requiring manual review.

---

## Implications for Roadmap

### Phase 1: Foundation (Auth + Profiles + Booking Request)

**Rationale:** Everything depends on user identity and the teacher profile record. The booking request flow (without payment) proves the core value loop end-to-end. Avoiding payment complexity in Phase 1 allows the system to be tested with real teachers before Stripe integration is layered on.

**Delivers:** Working public teacher profile page at `/[slug]`, teacher auth and onboarding wizard, availability grid, booking request form, email notification to teacher on request.

**From FEATURES.md:** Public profile, availability display, booking form, email notifications, shareable URL.

**Pitfalls to avoid:** Timezone storage (design schema correctly from the start), RLS policy testing (set up test harness before writing business logic), double-booking (atomic booking creation from day one), Next.js 16 breaking changes (`proxy.ts`, async params/cookies).

**Research flag:** Standard patterns — no additional phase research needed. Next.js + Supabase auth patterns are well-documented in STACK.md.

### Phase 2: Stripe Connect + Deferred Payment

**Rationale:** Builds the revenue path. Isolated from Phase 1 so the booking-without-payment flow is proven before payment complexity is layered on. This phase implements the core UX innovation: deferred Stripe Connect triggered by the first booking request.

**Delivers:** Teacher Stripe Connect onboarding flow, deferred PaymentIntent creation when teacher completes Stripe, parent payment confirmation, session completion and payment capture, payout notification emails.

**From FEATURES.md:** Payment collection, Stripe Connect integration.

**Pitfalls to avoid:** Two webhook endpoints (platform + connected), raw body for webhook signature, `charges_enabled` gating (never attempt payment until webhook confirms capability), limbo state machine with 48-hour timeout, fee computation in integer cents.

**Research flag:** Likely needs verification — Stripe Connect Express API specifics (capabilities array, `on_behalf_of` vs `transfer_data` interactions) should be verified against current Stripe docs before implementation. Supabase `@supabase/ssr` package API should be verified against current docs.

### Phase 3: Direct Booking + Payment (Established Teachers)

**Rationale:** Once the deferred path is working, the direct path (teacher already has Stripe) is straightforward — it reuses the same webhook infrastructure and PaymentIntent patterns. This phase smooths the UX for all teachers who have already connected Stripe.

**Delivers:** Payment authorization at booking time (not deferred), Stripe Elements on booking form, immediate confirmation flow.

**Pitfalls to avoid:** Idempotency keys on PaymentIntents (prevent double-click double-charge), disable submit button client-side after first click, database-first pattern (write booking to DB before calling Stripe, handle Stripe failure gracefully).

**Research flag:** Standard patterns — Stripe Elements integration is well-documented.

### Phase 4: Teacher Dashboard + Reviews

**Rationale:** Dashboard requires completed bookings to populate meaningful data (sessions, earnings, student list). Reviews require completed bookings to exist. This phase cannot be built meaningfully until Phase 2-3 produces real data.

**Delivers:** Teacher dashboard with upcoming bookings, completed sessions, earnings display, student list. Post-session review email prompt. Review display on public profile page.

**From FEATURES.md:** Session history, reviews/social proof.

**Pitfalls to avoid:** Dashboard scope creep — keep it simple (upcoming + completed + earnings). Resist adding analytics, marketing tools, or progress tracking in this phase.

**Research flag:** Standard patterns — no additional research needed.

### Phase 5: Polish + Pre-Launch

**Delivers:** Mobile UX testing and fixes, Supabase Pro upgrade, auth flow testing on real mobile devices (email confirmation deep link handling), legal copy review (credential disclaimers, 1099-K disclosure, school district acknowledgment), school email verification implementation, supply seeding (20-30 founding teacher profiles).

**Pitfalls to avoid:** Supabase free tier project pausing (upgrade before launch), email confirmation broken on mobile (PKCE flow, correct redirect URLs), self-reported credentials liability (disclaimer copy must be in place).

**Research flag:** Legal review needed — school district contract restrictions are jurisdiction-specific and require legal counsel for definitive guidance. 1099-K threshold may have changed from Aug 2025 training data.

### Phase Ordering Rationale

- Auth and teacher profile must come first — every other component depends on a teacher record existing
- Booking without payment comes before payment — proves the core loop works and lets teachers test with real parents while Stripe is pending
- Deferred Stripe comes before direct booking — the deferred flow is the harder state machine; once it's correct, direct booking is a simplification of the same infrastructure
- Dashboard and reviews come last — they require real booking data to be useful; building them earlier produces empty screens

### Research Flags Summary

- **Phase 2 (Stripe Connect):** Verify current Stripe Connect Express capabilities array and `on_behalf_of` behavior against stripe.com/docs/connect before implementation
- **Phase 5 (Legal):** 1099-K thresholds and school district employment contract scope require jurisdiction-specific legal review — training data confidence is LOW on these
- **Pre-launch:** Validate GTM conversion intent from Instagram audience empirically before launch commitment

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack (Next.js 16, Tailwind v4) | HIGH | Next.js 16 and Tailwind v4 verified from official docs fetched 2026-02-27. Breaking changes confirmed from release blog. |
| Stack (Supabase, Stripe) | MEDIUM | Package names and patterns confirmed via Next.js auth guide. Supabase `@supabase/ssr` and Stripe Connect live docs were not accessible during research. Core APIs are stable but specific method signatures should be verified. |
| Features (table stakes, differentiators) | HIGH | Feature analysis is based on well-established competitor knowledge. Commission rates and subscription pricing are MEDIUM — verify against current public pages before using competitively. |
| Architecture (component boundaries, data flow) | HIGH | Architecture is derived from dependency analysis and well-established Next.js App Router patterns. Stripe Connect and Supabase RLS patterns are MEDIUM — verify against current docs. |
| Pitfalls (Stripe Connect, Supabase RLS, timezone) | HIGH | These are well-documented failure modes consistent across multiple sources. |
| Pitfalls (legal, 1099-K, Instagram GTM) | LOW-MEDIUM | Tax thresholds and employment law are jurisdiction-specific and time-sensitive. Instagram conversion rates are empirically unknown. |

**Overall confidence:** MEDIUM-HIGH. Stack and architecture decisions are well-grounded. The primary uncertainty is Stripe Connect Express current API specifics and Supabase `@supabase/ssr` current package version — both should be spot-checked against live docs before Phase 2 implementation begins.

### Gaps to Address

- **Stripe Connect Express current API:** `stripe.accounts.create()` capabilities array and exact `on_behalf_of` vs `transfer_data` interactions — verify at stripe.com/docs/connect/express-accounts before Phase 2
- **Supabase `@supabase/ssr` current package API:** Cookie handling API may have minor updates since training data — verify at supabase.com/docs/guides/auth/server-side/nextjs before Phase 1 auth implementation
- **shadcn/ui Tailwind v4 compatibility:** Run `npx shadcn@latest init` to confirm the CLI handles Tailwind v4 setup correctly — low-risk but worth confirming on install
- **1099-K threshold current value:** IRS threshold was in legislative flux as of Aug 2025 — verify current threshold before writing onboarding copy
- **Instagram conversion intent:** Empirically unknown — validate with a test CTA or waitlist before committing to the build

---

## Sources

### Primary (HIGH confidence)

- Next.js 16 Official Documentation: https://nextjs.org/docs (fetched 2026-02-27)
- Next.js 16 Release Blog: https://nextjs.org/blog/next-16 (published October 21, 2025)
- Next.js Authentication Guide: https://nextjs.org/docs/app/guides/authentication
- Tailwind CSS v4 Blog: https://tailwindcss.com/blog/tailwindcss-v4

### Secondary (MEDIUM confidence)

- Stripe Connect Express patterns — training knowledge through Aug 2025; core API is stable
- Supabase `@supabase/ssr` patterns — referenced in Next.js auth guide; package version not live-verified
- Competitor feature analysis (Wyzant, Preply, Fons, Acuity, Calendly) — training knowledge; commission rates may have changed

### Tertiary (LOW confidence)

- 1099-K reporting thresholds — was in legislative flux as of Aug 2025; verify current IRS guidance
- School district employment contract restrictions — jurisdiction-specific; requires legal review
- Instagram content-to-commerce conversion rates — no empirical data; requires GTM experiment

---

*Research completed: 2026-03-03*
*Ready for roadmap: yes*

# Architecture Research: Tutelo

**Domain:** Tutoring marketplace / booking platform
**Stack:** Next.js 14/15 App Router, Supabase, Stripe Connect Express, Vercel, Resend, Tailwind CSS
**Researched:** 2026-03-03
**Confidence note:** Web search and WebFetch tools unavailable during this session. All findings are drawn from training knowledge (cutoff August 2025). Confidence levels are adjusted to MEDIUM for any findings that benefit from external verification.

---

## System Components

### Component Map

```
┌─────────────────────────────────────────────────────────────────┐
│                         Vercel (Next.js)                        │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │  App Router  │  │  API Routes  │  │  Middleware (Auth)     │ │
│  │  (RSC + SC)  │  │  /api/*      │  │  matcher: protected    │ │
│  └──────┬───────┘  └──────┬───────┘  └───────────────────────┘ │
│         │                 │                                     │
└─────────┼─────────────────┼─────────────────────────────────────┘
          │                 │
          ▼                 ▼
┌──────────────────┐  ┌─────────────────────────────────────────┐
│   Supabase       │  │   Stripe Connect                        │
│                  │  │                                         │
│  PostgreSQL DB   │  │  Platform account (Tutelo)              │
│  Auth (JWT)      │  │  Connected accounts (teachers)          │
│  Storage         │  │  PaymentIntents (held/captured)         │
│  Realtime        │  │  Webhook endpoint                       │
└──────────────────┘  └─────────────────────────────────────────┘
          │
          ▼
┌──────────────────┐
│   Resend         │
│   (email)        │
│                  │
│  Transactional   │
│  email sending   │
└──────────────────┘
```

### Component Boundaries

| Component | Responsibility | Communicates With | Auth Model |
|-----------|---------------|-------------------|------------|
| Next.js App Router (RSC) | Page rendering, UI, server-side data fetching | Supabase (server client) | Supabase session cookie |
| Next.js API Routes (`/api/*`) | Stripe webhooks, Stripe account creation, payment actions | Supabase (service-role), Stripe SDK | Stripe webhook secret OR service-role key |
| Supabase PostgreSQL | Persistent data (users, teachers, bookings, availability, reviews) | Next.js (via client or server client) | RLS policies on JWT |
| Supabase Auth | User identity (teachers and parents), JWT issuance | Next.js Middleware, RSC, Server Actions | Session cookies |
| Supabase Storage | Profile photos, supporting documents | Next.js RSC/SC | Storage RLS policies |
| Stripe Connect Express | Teacher payment accounts, payment flow | `/api/stripe/*` routes only | Stripe-secret key server-side |
| Resend | Transactional email (booking notifications, money-waiting, confirmations) | `/api/*` routes and Server Actions | API key server-side |

### Key Architectural Decisions

**Server Components as Default**
All data-fetching pages (teacher profile `/[slug]`, booking management, dashboard) should be React Server Components using the Supabase server client. Client Components are reserved for interactive widgets: calendar picker, booking form state, real-time availability updates.

**Service-Role Client Strictly for API Routes**
The Supabase `service_role` key (bypasses RLS) must only ever be used in `/api/*` route handlers — never in Server Components, never in Client Components. This is the boundary that makes the architecture secure.

**Stripe in API Routes Only**
Stripe SDK is only ever instantiated server-side in `/api/stripe/*` route handlers. The Stripe secret key must never touch client-side code. The Stripe publishable key is safe in Client Components.

---

## Data Flow: Key Journeys

### Journey 1: Teacher Onboarding

```
1. Teacher signs up (Supabase Auth → email verification)
   └─ Creates: auth.users record

2. Teacher completes profile form (Server Action or API route)
   └─ Creates: teachers row (stripe_connected = false, stripe_account_id = null)
   └─ Creates: availability rows

3. Teacher profile goes live at /[slug]
   └─ Page is publicly accessible (anon-read RLS policy)
   └─ No Stripe connection required yet

4. Teacher optionally triggers Stripe Connect (from dashboard)
   └─ POST /api/stripe/connect/create
      └─ stripe.accounts.create({ type: 'express' })
      └─ UPDATE teachers SET stripe_account_id = acct_xxx
   └─ Redirect to Stripe-hosted onboarding link
      └─ stripe.accountLinks.create({ type: 'account_onboarding' })
   └─ Stripe redirects back to /dashboard?stripe=success
   └─ Webhook: account.updated fires when requirements completed
      └─ UPDATE teachers SET stripe_connected = true

State after step 3: Teacher has public page but stripe_connected = false
State after step 4: Teacher can receive payments
```

### Journey 2: Booking Request (Deferred Stripe Flow)

```
Parent visits /[slug] → selects time → fills booking form

1. Parent submits booking request
   ├─ If teacher.stripe_connected = false (deferred path):
   │   └─ INSERT bookings (status = 'requested', no payment_intent)
   │   └─ Send email to teacher: "You have a booking request + money waiting"
   │       └─ Email includes link to /dashboard/connect-stripe
   │   └─ Send email to parent: "Request received, pending teacher setup"
   │   └─ [TEACHER SEES DASHBOARD NOTIFICATION]
   │
   └─ If teacher.stripe_connected = true (direct path → Journey 3)

2. Teacher clicks email → /dashboard/connect-stripe
   └─ POST /api/stripe/connect/create (if no stripe_account_id)
       OR POST /api/stripe/connect/link (if account exists but incomplete)
   └─ Redirected to Stripe hosted onboarding

3. Stripe onboarding complete → webhook: account.updated
   └─ UPDATE teachers SET stripe_connected = true
   └─ Query: SELECT * FROM bookings WHERE teacher_id = X AND status = 'requested'
   └─ For each pending booking:
       └─ Create PaymentIntent (manual capture, amount = rate * duration)
       └─ UPDATE bookings SET status = 'pending', stripe_payment_intent = pi_xxx
       └─ Send email to parent: "Teacher ready — complete booking" + Stripe payment link
           OR send email with secure payment link /booking/[id]/pay

4. Parent completes payment (PaymentIntent confirm)
   └─ Webhook: payment_intent.succeeded (or payment_intent.amount_capturable_updated)
   └─ UPDATE bookings SET status = 'confirmed'
   └─ Send confirmation emails to both parties
```

### Journey 3: Direct Booking (Teacher Already Has Stripe)

```
1. Parent visits /[slug] → selects time → fills booking form
   ├─ Teacher is stripe_connected = true

2. POST /api/bookings/create
   └─ Validate slot availability (check bookings table for conflicts)
   └─ stripe.paymentIntents.create({ capture_method: 'manual', amount, ... })
       └─ on_behalf_of: teacher.stripe_account_id
       └─ application_fee_amount: platform_fee
       └─ transfer_data: { destination: teacher.stripe_account_id }
   └─ INSERT bookings (status = 'pending', stripe_payment_intent = pi_xxx)

3. Client-side: Stripe Elements confirm payment (card auth only, no capture)
   └─ stripe.confirmCardPayment(clientSecret)

4. Webhook: payment_intent.amount_capturable_updated
   └─ Funds authorized, not yet captured
   └─ UPDATE bookings SET status = 'confirmed' (or keep 'pending' until session)
   └─ Send confirmation emails

5. Session occurs

6. POST /api/bookings/[id]/complete (teacher marks complete OR scheduled job)
   └─ stripe.paymentIntents.capture(pi_xxx)
   └─ UPDATE bookings SET status = 'completed'
   └─ Send review request email to parent
```

### Journey 4: Cancellation

```
Either party cancels (with policy):

1. POST /api/bookings/[id]/cancel
   └─ Check cancellation window (business rule)
   └─ If refund warranted:
       └─ stripe.refunds.create({ payment_intent: pi_xxx })
       └─ Webhook: charge.refunded → UPDATE bookings SET status = 'cancelled'
   └─ If no refund (late cancellation):
       └─ stripe.paymentIntents.capture (capture to pay teacher) OR cancel
       └─ UPDATE bookings SET status = 'cancelled'
   └─ Send cancellation emails
```

---

## Database Architecture

### Schema with RLS Annotations

```sql
-- TEACHERS
-- Public read (anyone can view profiles)
-- Write only by owner
CREATE TABLE teachers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug        TEXT NOT NULL UNIQUE,
  school      TEXT,
  city        TEXT,
  state       TEXT(2),
  subjects    TEXT[] DEFAULT '{}',
  grade_range TEXT[] DEFAULT '{}',
  hourly_rate NUMERIC(10,2) NOT NULL,
  bio         TEXT,
  photo_url   TEXT,
  -- Stripe fields
  stripe_account_id  TEXT,
  stripe_connected   BOOLEAN DEFAULT FALSE,
  -- Metadata
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- AVAILABILITY (teacher's recurring weekly slots)
CREATE TABLE availability (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  UNIQUE(teacher_id, day_of_week, start_time)
);

-- BOOKINGS
CREATE TABLE bookings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id            UUID NOT NULL REFERENCES teachers(id),
  parent_id             UUID REFERENCES auth.users(id),  -- nullable (guest parent)
  parent_email          TEXT NOT NULL,
  student_name          TEXT NOT NULL,
  subject               TEXT NOT NULL,
  booking_date          DATE NOT NULL,
  start_time            TIME NOT NULL,
  end_time              TIME NOT NULL,
  status                TEXT NOT NULL DEFAULT 'requested'
                          CHECK (status IN ('requested','pending','confirmed','completed','cancelled')),
  stripe_payment_intent TEXT,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- REVIEWS
CREATE TABLE reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID NOT NULL UNIQUE REFERENCES bookings(id),
  teacher_id  UUID NOT NULL REFERENCES teachers(id),
  parent_id   UUID REFERENCES auth.users(id),
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes

```sql
-- High-traffic lookup patterns
CREATE INDEX idx_teachers_slug ON teachers(slug);
CREATE INDEX idx_teachers_state_city ON teachers(state, city);
CREATE INDEX idx_teachers_subjects ON teachers USING GIN(subjects);
CREATE INDEX idx_bookings_teacher_date ON bookings(teacher_id, booking_date);
CREATE INDEX idx_bookings_parent_email ON bookings(parent_email);
CREATE INDEX idx_bookings_status ON bookings(status) WHERE status NOT IN ('completed','cancelled');
CREATE INDEX idx_availability_teacher ON availability(teacher_id);
```

### RLS Policy Architecture

RLS requires `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` on all tables. The key principle: **anon role for public read, authenticated role with JWT claims for writes**.

**User role identification pattern:**
The cleanest approach for a two-role system is to store role in either `auth.users.raw_user_meta_data` (set at signup) or in a separate `profiles` table. For this app, store `role: 'teacher' | 'parent'` in user metadata.

```sql
-- Helper function (avoids re-querying on every policy check)
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role'),
    'anon'
  )
$$ LANGUAGE sql STABLE;
```

**teachers table policies:**

```sql
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

-- Anyone can read teacher profiles (public marketplace)
CREATE POLICY "teachers_public_read"
  ON teachers FOR SELECT
  USING (true);

-- Teachers can only insert their own record
CREATE POLICY "teachers_insert_own"
  ON teachers FOR INSERT
  WITH CHECK (auth.uid() = user_id AND auth.user_role() = 'teacher');

-- Teachers can only update their own record
CREATE POLICY "teachers_update_own"
  ON teachers FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- No direct deletes (soft-delete or admin only)
CREATE POLICY "teachers_no_delete"
  ON teachers FOR DELETE
  USING (false);
```

**availability table policies:**

```sql
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

-- Public can read availability (needed for booking calendar)
CREATE POLICY "availability_public_read"
  ON availability FOR SELECT
  USING (true);

-- Teachers manage only their own availability
CREATE POLICY "availability_teacher_write"
  ON availability FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = availability.teacher_id
        AND teachers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = availability.teacher_id
        AND teachers.user_id = auth.uid()
    )
  );
```

**bookings table policies:**

```sql
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Teachers can see their own bookings
CREATE POLICY "bookings_teacher_select"
  ON bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = bookings.teacher_id
        AND teachers.user_id = auth.uid()
    )
  );

-- Parents can see their own bookings (by user_id OR by email for guest)
CREATE POLICY "bookings_parent_select"
  ON bookings FOR SELECT
  USING (
    (parent_id IS NOT NULL AND parent_id = auth.uid())
    OR
    -- For guest bookings, match by email stored in JWT claim if set
    (parent_email = (auth.jwt() -> 'user_metadata' ->> 'email'))
  );

-- Anyone (including anon) can INSERT a booking request
-- The application layer validates teacher_id and slot before inserting
CREATE POLICY "bookings_insert_public"
  ON bookings FOR INSERT
  WITH CHECK (status = 'requested');  -- Can only create in 'requested' state

-- Teachers can update booking status (accept/cancel)
CREATE POLICY "bookings_teacher_update"
  ON bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = bookings.teacher_id
        AND teachers.user_id = auth.uid()
    )
  );

-- IMPORTANT: Status transitions (requested → confirmed, etc.) are enforced
-- by the API route (server-side) using service_role, not by RLS alone.
-- RLS is a safety net; business logic lives in API routes.
```

**reviews table policies:**

```sql
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Reviews are public
CREATE POLICY "reviews_public_read"
  ON reviews FOR SELECT
  USING (true);

-- Parents insert review only for their completed booking
CREATE POLICY "reviews_parent_insert"
  ON reviews FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = reviews.booking_id
        AND bookings.status = 'completed'
        AND (bookings.parent_id = auth.uid()
             OR bookings.parent_email = (auth.jwt() -> 'user_metadata' ->> 'email'))
    )
  );

-- No updates to reviews after submission
```

### Guest Parent Handling

Parents do not need to create accounts to submit booking requests. This is a deliberate UX decision. The tradeoff:

- `parent_id` is nullable in bookings
- RLS for guest parents is email-based (fragile for security-critical operations)
- For payment confirmation and review submission, parents receive a signed, time-limited URL (generated in the API route, stored as a token in bookings or a separate `booking_tokens` table)
- Stripe payment can be done via a payment link URL — no auth required

**Booking token pattern (recommended for guest payments):**

```sql
ALTER TABLE bookings ADD COLUMN payment_token UUID DEFAULT gen_random_uuid();
CREATE INDEX idx_bookings_payment_token ON bookings(payment_token);
```

The payment email contains `/booking/pay?token=[payment_token]` — the API route validates the token server-side using `service_role`, no auth needed.

---

## Stripe Connect Integration

### Account Types

Stripe Connect Express is the right choice here. It provides:
- Stripe-hosted onboarding UI (minimal code)
- Stripe handles KYC/identity verification
- Teachers have a Stripe dashboard
- Platform (Tutelo) can charge application fees

**MEDIUM confidence** — this matches Stripe's documented Express account model as of August 2025.

### Account Creation Flow

```typescript
// POST /api/stripe/connect/create
// Called when teacher initiates Stripe Connect

import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Step 1: Create Express account
const account = await stripe.accounts.create({
  type: 'express',
  country: 'US',
  email: teacher.email,
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true },
  },
  business_type: 'individual',
});

// Step 2: Store account ID
await supabase
  .from('teachers')
  .update({ stripe_account_id: account.id })
  .eq('id', teacher.id);

// Step 3: Generate onboarding link
const accountLink = await stripe.accountLinks.create({
  account: account.id,
  refresh_url: `${process.env.NEXT_PUBLIC_URL}/dashboard/stripe/refresh`,
  return_url: `${process.env.NEXT_PUBLIC_URL}/dashboard/stripe/return`,
  type: 'account_onboarding',
});

// Step 4: Redirect teacher
return { url: accountLink.url };
```

### PaymentIntent Pattern (Manual Capture)

```typescript
// POST /api/bookings/create

const paymentIntent = await stripe.paymentIntents.create({
  amount: Math.round(hourlyRate * sessionHours * 100), // cents
  currency: 'usd',
  capture_method: 'manual',  // CRITICAL: auth-only, don't capture yet
  on_behalf_of: teacher.stripe_account_id,
  application_fee_amount: Math.round(platformFeeAmount * 100),
  transfer_data: {
    destination: teacher.stripe_account_id,
  },
  metadata: {
    booking_id: booking.id,
    teacher_id: teacher.id,
  },
});
```

The `capture_method: 'manual'` is essential. It authorizes the card (holds funds) but does not charge. Capture happens after the session is completed.

### Key Webhook Events

All webhooks are received at `POST /api/stripe/webhook`. Stripe signature verification is required before processing.

```typescript
// POST /api/stripe/webhook
import { headers } from 'next/headers';

export async function POST(req: Request) {
  const body = await req.text(); // MUST be raw text, not parsed JSON
  const signature = headers().get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return new Response('Webhook signature verification failed', { status: 400 });
  }

  switch (event.type) {
    // ... handle events
  }

  return new Response('OK', { status: 200 });
}
```

**Critical webhook events for Tutelo:**

| Event | When It Fires | Action |
|-------|--------------|--------|
| `account.updated` | Teacher completes Stripe onboarding | Check `details_submitted` + `charges_enabled` → set `stripe_connected = true`, process pending bookings |
| `payment_intent.amount_capturable_updated` | Card authorized successfully (manual capture) | Update booking status to `confirmed`, send confirmation emails |
| `payment_intent.payment_failed` | Card authorization failed | Update booking status to `cancelled`, notify parent |
| `payment_intent.succeeded` | Payment captured (after capture call) | Update booking to `completed`, trigger payout |
| `charge.refunded` | Refund processed | Update booking to `cancelled`, notify both parties |
| `account.application.deauthorized` | Teacher disconnects Stripe | Set `stripe_connected = false`, handle pending bookings |

**Webhook route configuration** — the webhook endpoint must not use Next.js body parsing. In App Router, raw body access requires reading `req.text()` before any parsing.

### Deferred Onboarding Technical Pattern

```typescript
// In webhook handler for account.updated

case 'account.updated': {
  const account = event.data.object as Stripe.Account;

  // Only act when account is fully enabled
  if (!account.details_submitted || !account.charges_enabled) break;

  // Update teacher record
  const { data: teacher } = await supabase
    .from('teachers')
    .update({ stripe_connected: true })
    .eq('stripe_account_id', account.id)
    .select('id, hourly_rate')
    .single();

  if (!teacher) break;

  // Find all pending booking requests for this teacher
  const { data: pendingBookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('teacher_id', teacher.id)
    .eq('status', 'requested');

  // Create PaymentIntents for each pending booking and notify parents
  for (const booking of pendingBookings ?? []) {
    const pi = await stripe.paymentIntents.create({
      amount: calculateAmount(booking, teacher.hourly_rate),
      currency: 'usd',
      capture_method: 'manual',
      on_behalf_of: account.id,
      transfer_data: { destination: account.id },
      metadata: { booking_id: booking.id },
    });

    await supabase
      .from('bookings')
      .update({
        status: 'pending',
        stripe_payment_intent: pi.id
      })
      .eq('id', booking.id);

    // Send payment email to parent with payment link
    await resend.emails.send({
      to: booking.parent_email,
      subject: 'Your booking is almost confirmed — complete payment',
      // Include payment URL with booking token
    });
  }
  break;
}
```

### Application Fee Model

Tutelo earns revenue by taking an `application_fee_amount` on each PaymentIntent. This is deducted before the transfer to the teacher's account.

```
Parent pays: $60 (1 hour @ $60/hr)
Platform fee: $6 (10%)
Teacher receives: $54

stripe.paymentIntents.create({
  amount: 6000,        // $60.00
  application_fee_amount: 600,  // $6.00 → stays with Tutelo
  transfer_data: { destination: 'acct_teacher' }
  // $54.00 automatically transferred to teacher
})
```

---

## Build Order Recommendations

Build order is dictated by data dependencies and integration complexity. Each phase must deliver something demonstrably working.

### Phase 1: Foundation (Nothing works without this)

```
Auth system (Supabase Auth, middleware, session management)
  → Teachers table + RLS
  → Basic profile creation flow
  → Public /[slug] page (read-only)
```

**Rationale:** All other components depend on user identity and the teacher profile record. The public profile page is the app's core value proposition and validates the data model early.

### Phase 2: Availability & Booking Request

```
Availability table + RLS + CRUD
  → Availability display on /[slug] (calendar/slots)
  → Booking request form (no payment)
  → Bookings table + RLS
  → Email notification via Resend (to teacher: "you have a request")
```

**Rationale:** Proves the core loop works end-to-end before payment complexity is added. Also lets teachers test the product with real parents while Stripe setup is pending.

### Phase 3: Stripe Connect + Deferred Payment

```
Stripe Connect Express account creation
  → /api/stripe/connect/create endpoint
  → Teacher onboarding redirect flow
  → Webhook: account.updated handler
  → Process pending 'requested' bookings → create PaymentIntents
  → Payment link emails to parents
  → PaymentIntent confirmation (Stripe Elements or Payment Link)
  → Webhook: payment_intent.amount_capturable_updated → confirm booking
```

**Rationale:** Implements the "money waiting" deferred flow. This is the critical revenue path and the most complex. Isolating it in phase 3 after the non-payment flow works reduces risk.

### Phase 4: Direct Booking (Post-Stripe Path)

```
Direct booking flow (teacher.stripe_connected = true)
  → PaymentIntent creation at booking time
  → Stripe Elements on booking form
  → Immediate payment auth → confirmed booking
  → Session completion → payment capture
  → Review request email
```

**Rationale:** Builds on Phase 3's webhook infrastructure. Adds the smoother UX for established teachers.

### Phase 5: Dashboard & Reviews

```
Teacher dashboard (upcoming bookings, earnings, availability management)
  → Parent booking history
  → Review submission flow
  → Review display on /[slug]
```

**Rationale:** Dashboard is important but not blocking for core transactions. Reviews require completed bookings to exist.

### Dependency Graph

```
Auth + Teachers
      │
      ├─→ Availability
      │         │
      │         └─→ Booking Requests (no payment)
      │                   │
      │                   └─→ Stripe Connect (deferred)
      │                               │
      │                               └─→ Direct Booking
      │                                         │
      └────────────────────────────────────────→ Dashboard + Reviews
```

---

## Next.js App Router Patterns

### Server vs Client Component Strategy

```
app/
  [slug]/
    page.tsx           ← RSC (server): fetch teacher, availability
    BookingForm.tsx    ← 'use client': interactive form, Stripe Elements
  dashboard/
    page.tsx           ← RSC (server): fetch bookings list
    BookingCard.tsx    ← 'use client' if interactive, RSC if display-only
  api/
    stripe/
      webhook/
        route.ts       ← API Route (no auth, Stripe signature check)
      connect/
        create/
          route.ts     ← API Route (auth required)
    bookings/
      create/
        route.ts       ← API Route (validate + insert)
      [id]/
        complete/
          route.ts     ← API Route (teacher-only, auth required)
        cancel/
          route.ts     ← API Route (auth required)
```

### Supabase Client Instantiation Pattern

Three different clients for three different contexts:

```typescript
// lib/supabase/server.ts (RSC and Server Actions)
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: ... } }
  )
}

// lib/supabase/service.ts (API Routes only — bypasses RLS)
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // never expose to client
)

// lib/supabase/client.ts (Client Components)
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Middleware for Auth Protection

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Refresh session cookie on every request
  // Redirect to /login if accessing protected routes unauthenticated
}

export const config = {
  matcher: ['/dashboard/:path*', '/onboarding/:path*'],
}
```

### Server Actions vs API Routes

Use **Server Actions** for: form submissions that require session auth (profile updates, availability management, review submission).

Use **API Routes** for: Stripe webhooks (no auth, raw body needed), Stripe account creation (need to return redirect URL), any endpoint called by external services.

**Do NOT use Server Actions for Stripe webhooks** — they require raw body access and no session context.

### Availability Calendar: Real-time with Supabase

For the booking calendar, the recommended pattern is:

1. **Initial load via RSC**: Fetch `availability` (recurring slots) and `bookings` (taken slots) server-side on the `/[slug]` page.
2. **Real-time updates via Supabase Realtime** (optional, only if concurrent booking is a concern): Subscribe to `bookings` table changes for the teacher in a Client Component.

```typescript
// In BookingCalendar.tsx ('use client')
useEffect(() => {
  const channel = supabase
    .channel('bookings-realtime')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'bookings',
        filter: `teacher_id=eq.${teacherId}`,
      },
      (payload) => {
        // Remove newly booked slot from available slots
        setTakenSlots(prev => [...prev, payload.new]);
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [teacherId]);
```

**Conflict prevention:** The database enforces uniqueness. Before inserting a booking, the API route should check for conflicts:

```sql
SELECT id FROM bookings
WHERE teacher_id = $1
  AND booking_date = $2
  AND status NOT IN ('cancelled')
  AND (start_time, end_time) OVERLAPS ($3, $4)
```

This is more reliable than relying on Realtime alone.

### Environment Variables

```bash
# Public (safe for client)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Server-only (never expose)
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
NEXT_PUBLIC_URL=https://tutelo.com  # for Stripe redirect URLs
```

---

## Sources and Confidence

| Finding | Confidence | Basis |
|---------|------------|-------|
| Stripe Connect Express account flow | MEDIUM | Training knowledge (Stripe API, August 2025). Verify against current Stripe docs at stripe.com/docs/connect/express-accounts |
| `capture_method: 'manual'` for session-based billing | MEDIUM | Well-established Stripe pattern. Verify at stripe.com/docs/payments/capture-later |
| Supabase RLS policy syntax | MEDIUM | Training knowledge. Verify at supabase.com/docs/guides/database/postgres/row-level-security |
| `@supabase/ssr` client patterns | MEDIUM | Training knowledge (post-`@supabase/auth-helpers` migration). Verify current package at supabase.com/docs/guides/auth/server-side/nextjs |
| Next.js App Router webhook raw body | HIGH | Well-established, stable Next.js App Router behavior |
| Build order / phase structure | HIGH | Derived from dependency analysis (logical, not empirical) |
| Supabase Realtime for availability | MEDIUM | Training knowledge. Verify at supabase.com/docs/guides/realtime |

**Note:** WebSearch and WebFetch were unavailable during this research session. All findings should be verified against current official documentation before implementation, particularly:
- Stripe Connect Express API (capabilities, account link types)
- `@supabase/ssr` package API (replaces `@supabase/auth-helpers`)
- Next.js 15 App Router specifics (any behavior changes from 14)

# Stack Research: Tutelo

**Project:** Tutelo — tutoring marketplace / teacher side-hustle SaaS
**Researched:** 2026-03-03
**Sources:** Next.js 16 official docs (verified current), Next.js 16 release blog, Tailwind CSS v4 release blog, Next.js authentication guide

---

## Core Stack (Pre-Decided)

### Next.js — CURRENT VERSION: 16.1.6

**Status:** Verified via official docs fetched 2026-02-27.

**What changed from v15 that matters:**

| Change | Impact on Tutelo |
|--------|------------------|
| `middleware.ts` renamed to `proxy.ts` | Auth guard file must be named `proxy.ts`, export function named `proxy` |
| `middleware.ts` still works but is deprecated | Do not use — start with `proxy.ts` from day one |
| `params` and `searchParams` are now async | `await params` required in all route handlers and pages |
| `cookies()`, `headers()`, `draftMode()` are now async | `await cookies()` everywhere — sync access throws |
| Turbopack is now the DEFAULT bundler | No config needed; faster dev server out of the box |
| React Compiler (stable, opt-in) | Can enable `reactCompiler: true` in next.config.ts — reduces manual memoization |
| Cache Components + `use cache` directive | New opt-in caching model — do NOT use for MVP, too new |
| `cacheComponents: true` in next.config.ts | Enables Partial Prerendering (PPR) — skip for MVP |
| `next build` no longer runs linter | Must run ESLint separately or via npm script |
| Server Actions are now called "Server Functions" | Same API, different terminology in docs |

**Minimum requirements:** Node.js 20.9+, TypeScript 5.1+

**Installation:**
```bash
npx create-next-app@latest tutelo --yes
# Defaults: TypeScript, Tailwind, ESLint, App Router, Turbopack, @/* alias
```

**Confidence:** HIGH — verified from official Next.js 16 docs and release blog.

---

### Tailwind CSS — CURRENT VERSION: v4.0 (released January 22, 2025)

**Status:** Verified via official Tailwind CSS v4 release blog.

**What changed from v3:**

| Change | Impact on Tutelo |
|--------|------------------|
| Config is now CSS-first (`@theme` block), no `tailwind.config.js` needed | New setup pattern — no config file unless customizing |
| Install: `npm install -D tailwindcss @tailwindcss/postcss` | Different package from v3 |
| CSS entry: `@import "tailwindcss"` (replaces `@tailwind base/components/utilities`) | Single import line |
| Content detection is automatic — no `content` array needed | No manual glob patterns |
| CSS custom properties exposed for all design tokens | Design system is built-in |
| Container queries are first-class (`@container`, `@sm:`, `@lg:`) | Useful for teacher card components |

**PostCSS config:**
```js
// postcss.config.mjs
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

**CSS entry:**
```css
/* app/globals.css */
@import 'tailwindcss';

@theme {
  /* Custom design tokens here if needed */
}
```

**shadcn/ui compatibility note:** shadcn/ui has v4 Tailwind support as of 2025. The `npx shadcn@latest init` CLI handles the Tailwind v4 setup automatically. Verify compatibility during initialization — LOW confidence on exact current shadcn version, but the ecosystem has broadly adopted v4.

**Confidence:** HIGH for Tailwind v4 itself. MEDIUM for shadcn/ui v4 compatibility (not directly verified from official docs in this session).

---

### Supabase Auth + Database

**Status:** Package names and SSR approach verified from Next.js auth guide (which explicitly references Supabase). Deep Supabase-specific docs could not be fetched due to permission constraints.

**Required packages:**
```bash
npm install @supabase/supabase-js @supabase/ssr
```

- `@supabase/supabase-js` — core client
- `@supabase/ssr` — SSR adapter for Next.js (handles cookie-based sessions, replaces the deprecated `@supabase/auth-helpers-nextjs`)

**Do NOT use:** `@supabase/auth-helpers-nextjs` — deprecated, replaced by `@supabase/ssr`.

**Key patterns (verified from Next.js auth guide):**

1. **Three Supabase client types are needed:**
   - `createBrowserClient` — for Client Components
   - `createServerClient` — for Server Components, Route Handlers, Server Actions
   - `createServerClient` in `proxy.ts` — for middleware auth refresh

2. **Cookie refresh in proxy.ts is critical.** Supabase sessions are JWT-based and expire. The proxy must refresh the session cookie on every request. Failing to do this causes users to be logged out seemingly at random.

3. **proxy.ts (formerly middleware.ts) setup:**
```typescript
// proxy.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  // Refresh session — REQUIRED
  const { data: { user } } = await supabase.auth.getUser()

  // Route protection logic here
  // ...

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

4. **Row Level Security (RLS) must be enabled** on all tables. Supabase Auth identity is only enforced at the database level via RLS — without it, anyone with the anon key can read any row.

5. **Server Component data fetching pattern:**
```typescript
// app/dashboard/page.tsx (Server Component)
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  // ...
}
```

**Environment variables:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]  # server-only, never expose
```

**Confidence:** MEDIUM — package names and patterns are consistent with official Next.js auth guide recommendations. Full Supabase SSR docs were not accessible to verify current package version numbers directly.

---

### Stripe Connect Express

**Status:** Core concepts verified from training knowledge; specific SDK version not confirmed via live docs in this session.

**Required packages:**
```bash
npm install stripe @stripe/stripe-js
```

- `stripe` — Node.js server SDK for API calls
- `@stripe/stripe-js` — client-side SDK (for Stripe Elements / embedded flows)

**Tutelo-specific Connect flow:**

```
Phase 1 (pre-Stripe): Parent submits booking request → stored in DB
↓
"Money waiting" trigger: First booking request arrives for teacher
↓
Teacher receives urgent email → clicks "Connect Stripe"
↓
Platform creates Connect account: stripe.accounts.create({ type: 'express' })
↓
Platform creates onboarding link: stripe.accountLinks.create({ type: 'account_onboarding' })
↓
Teacher completes Stripe Express onboarding (Stripe-hosted)
↓
Webhook: account.updated → check charges_enabled → mark teacher payment-ready in DB
↓
Phase 2 (post-Stripe): Parent enters payment → PaymentIntent with destination charge
↓
Session completed → Payment captured → Transfer to teacher minus 7% platform fee
```

**Critical Stripe Connect patterns:**

1. **Destination charges** (recommended for this model):
```typescript
// Charge parent, route to teacher, keep platform fee
const paymentIntent = await stripe.paymentIntents.create({
  amount: 4000, // $40.00 in cents
  currency: 'usd',
  transfer_data: {
    destination: teacher.stripe_account_id, // teacher's Connect account ID
  },
  application_fee_amount: 280, // 7% of $40 = $2.80
})
```

2. **Separate charges and transfers** (alternative if authorization/capture needed):
```typescript
// Authorize at booking
const paymentIntent = await stripe.paymentIntents.create({
  amount: 4000,
  currency: 'usd',
  capture_method: 'manual', // authorize only
})

// Capture when session is marked complete
await stripe.paymentIntents.capture(paymentIntent.id)

// Transfer to teacher
await stripe.transfers.create({
  amount: 3720, // $40 - 7% = $37.20
  currency: 'usd',
  destination: teacher.stripe_account_id,
})
```

The **authorize-then-capture + separate transfer** pattern is better for Tutelo because:
- Parents authorize at booking time but aren't charged until session is confirmed complete
- Teacher gets paid only after marking the session done
- Aligns with Tutelo's deferred model philosophy

3. **Webhook endpoint** (Route Handler):
```typescript
// app/api/webhooks/stripe/route.ts
export async function POST(request: Request) {
  const body = await request.text() // MUST use .text(), not .json()
  const sig = request.headers.get('stripe-signature')!

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return new Response('Webhook error', { status: 400 })
  }

  switch (event.type) {
    case 'account.updated':
      // Check charges_enabled, update teacher record
      break
    case 'payment_intent.succeeded':
      // Mark booking as paid
      break
  }

  return new Response(null, { status: 200 })
}
```

4. **CRITICAL webhook gotcha:** Route Handlers process the body as a stream. Stripe signature verification requires the raw body bytes, so you MUST call `await request.text()` — never `request.json()`. In Next.js App Router this works correctly out of the box (unlike Pages Router which needed `bodyParser: false`).

5. **Two webhook endpoints needed:**
   - Platform webhook (account events, charge events)
   - Connect webhook (events from connected accounts, e.g., `payment_intent.payment_failed` on teacher's behalf)

**Environment variables:**
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

**Confidence:** MEDIUM — Core patterns are well-established and confirmed from training. Specific SDK version (likely stripe@17.x as of 2026) not live-verified.

---

### Vercel (Hosting)

**No special setup needed.** Deploy from GitHub, connect to Vercel dashboard. Key settings:

- Add all environment variables in Vercel dashboard
- Enable Vercel Speed Insights (free, built in) for performance monitoring
- Use Vercel's built-in image optimization (already included in Next.js)
- Stripe webhook endpoint needs public URL — use Vercel preview URLs for testing or stripe CLI for local dev

**Confidence:** HIGH — standard Vercel/Next.js deployment, no exotic configuration.

---

### Resend (Transactional Email)

**Status:** Integration pattern derived from official documentation structure and training knowledge. Exact current version not live-verified.

**Required packages:**
```bash
npm install resend react-email @react-email/components
```

- `resend` — Resend SDK for sending emails
- `react-email` + `@react-email/components` — Build email templates as React components
- These are the canonical Resend-recommended stack (Resend acquired react-email ecosystem)

**Usage pattern (Server Action or Route Handler):**
```typescript
// lib/email.ts
import { Resend } from 'resend'
import { BookingConfirmationEmail } from '@/emails/booking-confirmation'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendBookingConfirmation({ teacherEmail, parentName, sessionDate }) {
  await resend.emails.send({
    from: 'Tutelo <notifications@tutelo.com>',
    to: teacherEmail,
    subject: 'New booking request — a parent is waiting',
    react: BookingConfirmationEmail({ parentName, sessionDate }),
  })
}
```

**Email template (React Email):**
```typescript
// emails/booking-confirmation.tsx
import { Body, Container, Html, Text, Button } from '@react-email/components'

export function BookingConfirmationEmail({ parentName, sessionDate }) {
  return (
    <Html>
      <Body>
        <Container>
          <Text>A parent ({parentName}) wants to book a session on {sessionDate}.</Text>
          <Button href="https://tutelo.com/dashboard">View Request</Button>
        </Container>
      </Body>
    </Html>
  )
}
```

**Email addresses needed:**
- `notifications@tutelo.com` — transactional (booking confirmations, reminders)
- `no-reply@tutelo.com` — system emails

Set up custom domain in Resend dashboard. Free tier: 100 emails/day, 3,000/month — sufficient for MVP.

**Confidence:** MEDIUM — pattern is standard and well-documented. Exact version of `resend` package not live-verified.

---

## Recommended Supporting Libraries

### Validation: Zod

**Recommendation: Use Zod for all schema validation.**

```bash
npm install zod
```

- The Next.js official auth guide explicitly uses Zod as the server-side validation example
- Validates Server Action inputs before hitting the database
- Validates Stripe webhook payloads
- Creates TypeScript types from schemas (single source of truth)
- Works in both Server Components and Client Components
- Current major version: v3.x (v4 may be available — verify on install)

**Usage pattern:**
```typescript
// lib/schemas.ts
import { z } from 'zod'

export const OnboardingSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  school: z.string().min(2).max(100),
  subjects: z.array(z.string()).min(1),
  gradeRange: z.tuple([z.number().min(1), z.number().max(12)]),
  hourlyRate: z.number().min(20).max(200),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(3).max(50),
})

export type OnboardingData = z.infer<typeof OnboardingSchema>
```

**Confidence:** HIGH — verified as canonical choice from Next.js official documentation.

---

### Form Handling: React Hook Form + Zod resolver

**Recommendation: Use React Hook Form with @hookform/resolvers for complex multi-step forms.**

```bash
npm install react-hook-form @hookform/resolvers
```

**Why React Hook Form over native form + useActionState:**

| Concern | Native Server Action Forms | React Hook Form |
|---------|---------------------------|-----------------|
| Multi-step wizard state | Complex to manage | Built-in field state |
| Client-side validation UX | Delayed (server round-trip) | Instant field-level errors |
| Complex field dependencies | Manual | Built-in watch/trigger |
| File upload with preview | Manual | Straightforward |
| Form state across steps | Requires extra state | Controller pattern |

For Tutelo's 4-step onboarding wizard, React Hook Form provides immediate validation feedback without server round-trips on every field blur. Use Server Actions only for final submission.

**Usage pattern:**
```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { OnboardingSchema, type OnboardingData } from '@/lib/schemas'

export function OnboardingStep1() {
  const form = useForm<OnboardingData>({
    resolver: zodResolver(OnboardingSchema),
    defaultValues: { firstName: '', lastName: '' },
  })

  const onSubmit = async (data: OnboardingData) => {
    await submitOnboardingAction(data) // Server Action
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* fields */}
    </form>
  )
}
```

**Confidence:** HIGH — standard pattern, widely verified across ecosystem. RHF v7.x is current.

---

### UI Components: shadcn/ui

**Recommendation: Use shadcn/ui for all UI components.**

```bash
npx shadcn@latest init
```

- Not a library — copies component source into your project (`components/ui/`)
- Built on Radix UI primitives (accessible by default)
- Styled with Tailwind CSS v4 (compatible)
- Key components for Tutelo: Button, Input, Select, Calendar, Dialog, Form, Badge, Avatar, Tabs, Card
- Fully customizable since you own the source

**Do NOT use:** MUI, Chakra UI, Ant Design — heavyweight, not Tailwind-native, adds unnecessary bundle weight for a solo project.

**Confidence:** MEDIUM — shadcn/ui is the current standard choice for Next.js + Tailwind projects. v4 Tailwind compatibility assumed based on ecosystem activity but not directly verified from live docs.

---

### Date/Time: date-fns

**Recommendation: Use `date-fns` for all date manipulation.**

```bash
npm install date-fns
```

- Functional, tree-shakeable (only import what you use)
- No global date mutation (unlike Moment.js)
- Excellent TypeScript support
- Current version: v4.x
- Use for: formatting dates in emails, calculating session durations, 24hr reminder scheduling

**Do NOT use:** Moment.js (deprecated), dayjs (fine but date-fns is more tree-shakeable), Luxon (overkill for this use case).

**For timezone handling:** Add `date-fns-tz` if teachers and parents are in different timezones.
```bash
npm install date-fns-tz
```

**Confidence:** HIGH — date-fns is the standard choice, well-established.

---

### Scheduling/Availability UI: Custom with shadcn Calendar

**Recommendation: Build the weekly availability grid with a custom component, NOT a full scheduling library.**

**Why not a library:**
- Full calendar libraries (FullCalendar, react-big-calendar) are designed for event management, not availability selection
- Tutelo needs a simple "mark which time slots you're available" grid (weekday evenings + weekends)
- A custom component built on shadcn's `Calendar` + Tailwind grid is ~200 lines and fully owned

**What to build:**
```
[ Mon ] [ Tue ] [ Wed ] [ Thu ] [ Fri ] [ Sat ] [ Sun ]
   -       -       -       -       -    [ 9am ]  [ 9am ]
   -       -       -       -       -    [10am ]  [10am ]
[5pm ]  [5pm ]  [5pm ]  [5pm ]  [5pm ]  [11am ]  [11am ]
[6pm ]  [6pm ]  [6pm ]  [6pm ]  [6pm ]  [ 2pm ]  [ 2pm ]
[7pm ]  [7pm ]  [7pm ]  [7pm ]  [7pm ]    -        -
```

Store availability as: `{ dayOfWeek: number, startTime: string, endTime: string }[]`

**Parent booking view:** Use shadcn `Calendar` component to show available dates, then show time slots for the selected day.

**Confidence:** HIGH for "build it custom" recommendation. The complexity of integrating a full scheduling library isn't justified by this use case.

---

### State Management: Zustand (lightweight, when needed)

**Recommendation: Use Zustand only if you need client-side global state. Default to Server Components + React state.**

```bash
npm install zustand
```

**When you need Zustand in Tutelo:**
- Multi-step onboarding wizard state (holding data across steps before final submit)
- Teacher dashboard tab state

**Do NOT use:** Redux, Recoil, Jotai — overkill for this scope. React Context is fine for simple cases.

**When to NOT use Zustand:** If a Server Component or React useState works, use that first. Zustand is only for state that genuinely needs to live across multiple unrelated components.

**Confidence:** HIGH — Zustand is the lightweight standard for Next.js App Router projects.

---

### Slug Generation: slugify

**Recommendation: Use `slugify` for generating teacher URL slugs.**

```bash
npm install slugify
```

- Converts "Ms. Jennifer Johnson" → "ms-jennifer-johnson"
- Handles special characters, accents, unicode
- Check slug uniqueness in DB before saving

**Confidence:** HIGH — standard library, straightforward use.

---

## Key Integrations

### Supabase Auth + Next.js App Router

**The critical pattern to get right from day one:**

```
User hits any route
↓
proxy.ts runs (on every request)
↓
Supabase session cookie is refreshed (JWT rotation)
↓
Route is protected or allowed through
↓
Server Component reads user from await supabase.auth.getUser()
```

**What breaks if you get this wrong:**
- Not refreshing cookies in proxy → users randomly logged out after JWT expiry
- Using `supabase.auth.getSession()` instead of `supabase.auth.getUser()` → insecure, doesn't verify with server
- Creating a Supabase client without cookie handling in Server Components → always unauthenticated

**Google SSO setup:**
1. Enable Google provider in Supabase Auth settings
2. Add Google OAuth credentials (Client ID + Secret) in Supabase dashboard
3. Add redirect URL: `https://[project].supabase.co/auth/v1/callback`
4. No code needed — Supabase handles the OAuth flow

**Supabase client helper file (copy this pattern):**
```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          } catch { /* Called from Server Component — cookies are read-only */ }
        },
      },
    }
  )
}

// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

---

### Stripe Connect Express Setup

**Account creation flow (triggered by first booking request):**

```typescript
// app/api/stripe/connect/route.ts
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: Request) {
  const { teacherId } = await request.json()

  // 1. Create Express account
  const account = await stripe.accounts.create({
    type: 'express',
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  })

  // 2. Save account ID to teacher record in Supabase
  await supabase.from('teachers').update({
    stripe_account_id: account.id
  }).eq('id', teacherId)

  // 3. Create onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/connect/retry`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/connect/success`,
    type: 'account_onboarding',
  })

  return Response.json({ url: accountLink.url })
}
```

**Webhook handling for account completion:**

```typescript
// Key events to handle:
// account.updated → check account.charges_enabled → mark teacher payment-ready
// payment_intent.succeeded → confirm booking paid
// payment_intent.payment_failed → notify teacher/parent
// transfer.created → log payout to teacher
```

---

### Resend + Next.js Integration Pattern

**Trigger emails from Server Actions (not Route Handlers):**

```typescript
// app/actions/notifications.ts
'use server'

import { Resend } from 'resend'
import { MoneyWaitingEmail } from '@/emails/money-waiting'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendMoneyWaitingEmail({ teacher, parent, session }) {
  await resend.emails.send({
    from: 'Tutelo <notifications@tutelo.com>',
    to: teacher.email,
    subject: `A parent is waiting to pay you — connect Stripe now`,
    react: MoneyWaitingEmail({ teacher, parent, session }),
  })
}
```

**Email types needed for Tutelo:**

| Email | Trigger | Recipient |
|-------|---------|-----------|
| Booking request received | Parent submits request | Teacher |
| Money waiting (urgency) | First booking request | Teacher |
| Follow-up (24hr, 48hr, 72hr) | No Stripe connection | Teacher |
| Booking confirmation | Stripe connected + booking confirmed | Both |
| Session reminder (24hr before) | Scheduled job | Both |
| Session complete + review prompt | Teacher marks complete | Parent |
| Cancellation | Either party cancels | Both |

**Scheduled emails:** Resend itself doesn't schedule. Use Vercel Cron Jobs (free up to 2 jobs) or a Supabase Edge Function cron to send reminder emails.

---

## Gotchas & Watch Out For

### CRITICAL: proxy.ts not middleware.ts

**In Next.js 16, the file is `proxy.ts` not `middleware.ts`.** Export function must be named `proxy`. The old `middleware.ts` still works but is deprecated. Starting with the deprecated name will create technical debt immediately.

### CRITICAL: Async params and cookies

**All Next.js 16 dynamic APIs are async:**
```typescript
// WRONG (throws in Next.js 16):
const { slug } = params
const cookieStore = cookies()

// CORRECT:
const { slug } = await params
const cookieStore = await cookies()
```

This is a frequent source of runtime errors when following older tutorials (pre-2025).

### CRITICAL: Supabase cookie refresh in proxy.ts

The Supabase session is stored as a JWT in cookies. JWTs expire. The proxy.ts MUST refresh the token on every request and propagate the updated cookie. Missing this step causes silent auth failures — users appear logged out even though they just signed in.

### CRITICAL: Stripe webhook needs raw body

```typescript
// CORRECT — raw body for signature verification:
const body = await request.text()
const event = stripe.webhooks.constructEvent(body, sig, secret)

// WRONG — JSON parsing destroys raw bytes:
const body = await request.json() // Don't do this for webhook handler
```

### Stripe Connect: Two webhook secrets

Platform webhooks (e.g., when your platform's account events happen) use one secret. Connect webhooks (events from connected teacher accounts) use a different secret. Set both:
```bash
STRIPE_WEBHOOK_SECRET=whsec_platform_...
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_connect_...
```

### Supabase RLS: Not optional

Row Level Security must be enabled on every table. Without it, the anon key (which is public in `NEXT_PUBLIC_`) can read all data. Every table needs a policy. Failing to do this is a data breach.

**Minimum RLS policy pattern:**
```sql
-- Teachers can only see their own bookings
CREATE POLICY "teachers_own_bookings" ON bookings
  FOR ALL USING (teacher_id = auth.uid());

-- Public can view published teacher profiles
CREATE POLICY "public_teacher_profiles" ON teachers
  FOR SELECT USING (is_published = true);
```

### Tailwind v4: No tailwind.config.js by default

Older documentation, blog posts, and shadcn/ui guides may reference `tailwind.config.js`. In v4, configuration moves to the CSS file via `@theme`. Don't create a `tailwind.config.js` unless shadcn/ui's init CLI explicitly creates one.

### Supabase: Never use getSession() for auth checks

`supabase.auth.getSession()` reads from the local cookie without verifying with Supabase servers. This means it can be spoofed. Always use `supabase.auth.getUser()` for security-sensitive checks (protected routes, authorization in Server Actions).

### Next.js 16: params is Promise in Route Handlers

```typescript
// OLD (breaks in Next.js 16):
export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const { slug } = params
}

// CORRECT:
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
}
```

### Stripe Connect: charges_enabled vs payouts_enabled

After a teacher completes onboarding, check `account.charges_enabled` (can accept charges) not just `account.details_submitted`. `details_submitted` can be true while `charges_enabled` is still false (e.g., pending bank verification).

### Do not enable cacheComponents for MVP

Next.js 16's `cacheComponents: true` (enabling Partial Prerendering) changes the entire caching model and requires careful `use cache` / `<Suspense>` placement. This is a powerful feature but introduces cognitive complexity inappropriate for a solo build under time pressure. Leave it disabled.

---

## Confidence Levels

| Area | Confidence | Source | Notes |
|------|------------|--------|-------|
| Next.js version (16.1.6) | HIGH | Official docs fetched 2026-02-27 | Confirmed current |
| Next.js proxy.ts rename | HIGH | Official Next.js 16 blog + docs | Breaking change confirmed |
| Next.js async params/cookies | HIGH | Official Next.js 16 breaking changes | Critical pattern |
| Tailwind CSS v4 | HIGH | Official Tailwind v4 release blog | Released Jan 22, 2025 |
| Tailwind v4 + Next.js setup | HIGH | Official Next.js CSS docs | Verified current |
| shadcn/ui v4 compatibility | MEDIUM | Not directly verified | Assumed based on ecosystem |
| Supabase @supabase/ssr package | MEDIUM | Referenced in Next.js auth guide | Exact version not verified |
| Supabase proxy.ts pattern | MEDIUM | Extrapolated from Next.js auth guide + known Supabase patterns | Core pattern stable |
| Supabase RLS requirement | HIGH | Known security requirement, well-documented | Not version-specific |
| Stripe Connect Express flow | MEDIUM | Training knowledge; live Stripe docs inaccessible | Core APIs stable |
| Stripe webhook raw body | HIGH | Next.js Route Handler docs confirm .text() pattern | Confirmed pattern |
| Resend + react-email | MEDIUM | Training knowledge; live Resend docs inaccessible | Standard Resend stack |
| React Hook Form | HIGH | Well-established, consistent across ecosystem | Version details not live-verified |
| Zod | HIGH | Explicitly referenced in official Next.js auth docs | Current recommendation |
| date-fns | HIGH | Well-established choice | Version details not live-verified |
| Zustand | HIGH | Well-established choice for Next.js | Version details not live-verified |

---

## Installation Summary

```bash
# Core (all pre-decided)
npx create-next-app@latest tutelo
# Creates: Next.js 16, TypeScript, Tailwind v4, ESLint, App Router, Turbopack

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# Stripe
npm install stripe @stripe/stripe-js

# Email
npm install resend react-email @react-email/components

# Validation
npm install zod

# Forms
npm install react-hook-form @hookform/resolvers

# Dates
npm install date-fns date-fns-tz

# Slugs
npm install slugify

# State (add when needed)
npm install zustand

# UI components (interactive — not npm install)
npx shadcn@latest init
```

## Sources

- Next.js 16 Official Documentation: https://nextjs.org/docs (fetched 2026-02-27)
- Next.js 16 Release Blog: https://nextjs.org/blog/next-16 (published October 21, 2025)
- Next.js Authentication Guide: https://nextjs.org/docs/app/guides/authentication
- Next.js Forms Guide: https://nextjs.org/docs/app/guides/forms
- Next.js CSS Guide: https://nextjs.org/docs/app/getting-started/css
- Next.js Route Handlers: https://nextjs.org/docs/app/api-reference/file-conventions/route
- Next.js Proxy (Middleware): https://nextjs.org/docs/app/api-reference/file-conventions/proxy
- Tailwind CSS v4 Blog: https://tailwindcss.com/blog/tailwindcss-v4

# Features Research: Tutelo

**Domain:** Tutoring booking platform / tutor-facing SaaS
**Researched:** 2026-03-03
**Confidence note:** WebSearch and WebFetch were unavailable during this research session. All findings are drawn from training knowledge (cutoff August 2025) of the named competitors. These platforms are well-established with slowly-evolving core feature sets. Commission percentages and exact pricing are MEDIUM confidence — verify against current public pricing pages before using competitively.

---

## Table Stakes

Features users (teachers AND parents) expect to exist. Missing = product feels unfinished or untrustworthy. Bounce rate spikes.

| Feature | Why Expected | Complexity | Confidence | Notes |
|---------|--------------|------------|------------|-------|
| Public profile / landing page | Parents need somewhere to evaluate the teacher before booking. Without it, the teacher is just a stranger. | Low | HIGH | Auto-generation from onboarding is the Tutelo differentiator — but the page itself is table stakes. |
| Booking request or booking form | The core transaction. Without this, it's just a directory. | Low-Med | HIGH | Tutelo uses a two-phase model (request pre-Stripe, direct post-Stripe) — both phases still surface a form to the parent. |
| Availability display | Parents need to know when the teacher is open before they bother reaching out. Calendars or slots both work — but something must show. | Low | HIGH | A static weekly grid is sufficient at MVP. Real-time conflict detection is not table stakes. |
| Email notifications | Booking confirmation, reminders, and status updates are expected by every user who has ever used Calendly, Acuity, or a medical scheduler. Silent booking = no trust. | Low | HIGH | 24hr reminders are the minimum. Both-party notifications required. |
| Mobile-first experience | Teachers are likely on phones between classes. Parents are phone-first. A desktop-only experience loses a significant portion of the target audience immediately. | Low (with Tailwind) | HIGH | Sticky "Book Now" CTA on mobile is correctly identified in PROJECT.md as mandatory. |
| Payment collection | Parents expect professional tools to have professional payments. Venmo/PayPal DMs signal "informal" and reduce perceived trust and legitimacy. | Med | HIGH | Stripe integration is table stakes for credibility. The deferred-until-first-booking approach is a UX innovation, not an avoidance of the feature. |
| Review / social proof | A teacher page with no reviews looks new or suspect. Even one or two reviews create trust. Review system must be visibly present. | Low | HIGH | Post-session review prompt via email is the right delivery mechanism. |
| Shareable URL | Teachers need something to put in their Instagram bio, text to parents, or add to their email signature. Without a clean URL, distribution is broken. | Low | HIGH | tutelo.com/ms-johnson is exactly right. Random UUID URLs kill word-of-mouth. |
| Session history / record | Teachers doing this as a business need to know who they've taught, when, and for how much — for taxes if nothing else. | Low | HIGH | Dashboard with completed sessions, earnings, and student list covers this. |
| Cancellation pathway | Life happens. Teachers and parents need a way to cancel without it being a support ticket. | Low | MEDIUM | MVP can handle this lightly (email + manual). Full policy enforcement is Phase 2. |

---

## Differentiators

Features that create competitive advantage specifically for the K-12 classroom teacher market. These are not available (or not well-executed) in any current competitor.

| Feature | Value Proposition | Complexity | Why Competitors Miss This | Notes |
|---------|-------------------|------------|--------------------------|-------|
| Sub-7-minute onboarding with auto-generated page | Exhausted teachers won't invest in a side hustle setup that takes longer than a planning period. Speed-to-live-page is the hook. | Med | Wyzant/Preply: 30-60 min application + approval wait. Fons: 20-40 min setup. Acuity: no concept of a public-facing profile page. | The auto-bio generator alone removes a major drop-off point. Teachers hate writing about themselves. |
| Deferred Stripe Connect | Removes the "enter bank info before seeing any value" barrier that kills conversion in every competing product. Triggers payment setup at peak motivation — when a parent is waiting with money. | High | No competitor does this. All require payment setup before you can accept bookings. Fons requires subscription before any features. | This is the single most important UX innovation in Tutelo. Protect it. |
| Teacher credential trust signal | "Ms. Johnson teaches 4th grade at Riverside Elementary" is dramatically more trustworthy than "johnsontutor1987" on Wyzant. The school affiliation + classroom teacher identity is the unique trust layer. | Low | Wyzant verifies degrees but has no concept of "active classroom teacher." Preply emphasizes language teachers. Neither surfaces school/classroom context. | This is free trust that Tutelo gets because it knows its user. Auto-pull from onboarding answers, display prominently. |
| 7% fee vs. 18-33% on marketplaces | At $50/hr, teachers keep $46.50 instead of $33-41. That's $5-13.50/hr more per session — over a school year of side hustle work, this compounds significantly. | N/A (business model) | Marketplace model requires high commission to fund matchmaking. Tutelo's self-distribution model (teacher brings own clients) enables the low fee. | The fee advantage must be explicitly called out in teacher-facing marketing. Make the math obvious. |
| "Founding Teacher" badge | Creates exclusivity, community identity, and loss aversion. First cohort has something latecomers can't get. | Low | No competitor has a cohort-based early access program for teachers. | High return on low implementation cost. A badge field on teacher profile + a landing page mentioning it. |
| Area rate benchmarks during onboarding | "Most tutors in your area charge $45-65/hr" removes the anxiety of pricing yourself. Teachers consistently underprice themselves. | Low-Med | Wyzant shows market rates but only after full approval. Fons shows nothing. | Even hardcoded benchmark ranges per city/subject are better than nothing. Start with static data, make it dynamic later. |
| Teacher dashboard designed for side-hustle scale | 2-5 hrs/week. 3-8 students. Not a full-time business. The dashboard should reflect this reality — not show empty enterprise features. | Low | Fons is built for full-time instructors (class schedules, multi-instructor studios). Wyzant dashboard is complex with trial management, session notes, and marketing tools. | Tutelo's dashboard simplicity IS the differentiator. Resist feature bloat here. |

---

## Anti-Features (Don't Build at MVP)

Things competitors do that Tutelo should deliberately not build at MVP. Either complexity traps, wrong-user assumptions, or features that undermine the core value proposition.

| Anti-Feature | Why It's a Trap | What Competitors Do | What Tutelo Does Instead |
|--------------|-----------------|---------------------|--------------------------|
| In-app messaging / chat | Building a real-time messaging system is 3-5x the complexity of everything else in the MVP combined. Teachers already have text, email, and iMessage. Solving "where do they communicate" is not the problem. | Wyzant has full in-app messaging with read receipts. Preply has video+chat integration. | Tutelo tells both parties to communicate externally for now. This is the right MVP call. Flag this explicitly in confirmation emails so no one is confused. |
| Video conferencing | Building or deeply integrating video is a full product in itself (latency, recording, whiteboard, multi-party). Teachers already have Zoom and Google Meet. | Preply has built-in video with whiteboard. This is their core differentiator for online-first tutoring. | Tutelo is for in-person and teacher-managed-online. "Use Zoom" is not a weakness — it's pragmatism. |
| Session notes / progress tracking | Useful feature. Wrong phase. This requires a data model for skill taxonomies, note templates, or free-form notes per student per session. That's a whole sub-product. | Wyzant has session summaries. TutorBird (competitor not listed) has full progress reports. | Phase 2. A teacher can keep notes in their own Google Doc. At MVP, no teacher is expecting this from a booking tool. |
| Discovery / search marketplace | Building a two-sided marketplace from scratch where discovery happens on-platform requires critical mass on both sides. Without 1000+ teachers, the search is useless. With 50 founding teachers, search delivers nothing. | Wyzant and Preply are built around search. Teacher earns only when platform drives traffic. | Teachers drive their own traffic at launch. This IS the model — not a compromise. Teachers who drive their own clients don't need to compete in a race-to-the-bottom search ranking. Phase 2 when there are enough teachers to make search useful. |
| Credential verification | Background checks, degree verification, and teaching license verification add days to onboarding, require third-party integrations (Checkr etc.), and create legal/liability complexity. | Wyzant requires degree verification and does background checks. Takes 1-7 days. | Self-reported at MVP. The trust layer is "active classroom teacher at [school]" — public information that parents can independently verify in 30 seconds. Formal verification is Phase 2+. |
| Recurring / subscription bookings | Subscription billing (e.g., "4 sessions/month at $160") requires dunning management, proration logic, pause/cancel flows, and a different payment model. This is a billing product, not a booking product. | Fons supports recurring appointments and subscription packages. | Manual rebooking for MVP. A parent who wants to rebook opens the page and books again. That friction is acceptable until Volume justifies the complexity. |
| Package / bundle sales | "Buy 10 sessions, get 1 free" requires prepaid session credit ledgers, refund logic for unused sessions, and expiration policy decisions. All of this is non-trivial. | Wyzant supports trial sessions and multi-session bundles. | Single-session billing only at MVP. Clean, simple, auditable. |
| Cancellation policy enforcement | Defining cancellation windows (e.g., 24hr = 50% refund) and enforcing them requires conditional payment capture logic, partial refunds, dispute handling, and policy display. | Wyzant and Preply have formal cancellation policies with tiered refunds. | Handle informally at MVP. Email-based coordination. Add policy enforcement when there are enough sessions that informal handling creates support burden. |
| Teacher marketing tools | SEO tips, social sharing buttons, email templates, referral programs, analytics dashboards — all valuable. All distractions at 80-120 hrs total budget. | Wyzant has extensive tutor success resources and marketing guidance built into the dashboard. | The page IS the marketing tool. The URL IS the distribution. Instagram bio link → done. |
| Multi-teacher / studio accounts | "I want to manage my tutoring center with 5 tutors" is a real need — for a different product and a different user. | Fons supports studios with multiple instructors. | Tutelo is for the individual classroom teacher. One account = one teacher = one page. No multi-user, no agency accounts. |
| Mobile app (native) | Native app = 2x development surface, app store approval latency, push notification infrastructure, and ongoing maintenance. | Most competitors have native apps. | Progressive Web App behavior via responsive web is sufficient at MVP. Teachers access from a browser. Parents book from a browser. No app needed until there is a core workflow that genuinely benefits from native capabilities (push notifications for session reminders being the most likely candidate). |
| Waitlist / intake form | Some tutors use Typeform or Google Forms as a "lead capture" before booking. This is an extra step that adds friction for the parent and complexity for the teacher. | Some smaller tutor tools offer intake form builders. | Book Now → booking request. Direct. One step. |
| Trial session pricing | Discounted first-session offers require special pricing logic, one-time discount codes, or conditional billing rules. | Wyzant has a structured trial session model. | Standard rate from day one. Teachers can choose to discuss pricing with parents informally if they want to offer a discount. |

---

## Phase 2 Candidates

Worth building once MVP is validated and initial teachers have real bookings.

| Feature | Why Phase 2 (Not MVP) | Value When Added | Estimated Complexity |
|---------|----------------------|------------------|---------------------|
| In-app messaging | Once there are enough sessions happening that "text me" creates confusion or missed communication, a message thread per session becomes worth building. | High — reduces session coordination friction | High |
| Recurring bookings | When rebooking friction shows up in retention data (parents not coming back because rebooking is annoying). | High — directly improves LTV | Med |
| Local search / discovery directory | When there are 200+ teachers in multiple cities, a search page becomes useful for new parent acquisition. Before that, it's an empty storefront. | High — changes distribution model | Med-High |
| SEO landing pages (city + subject) | "Math tutor in Austin TX" SEO pages are a real acquisition channel — but only worth building once there are teachers to populate them. | High at scale | Med |
| School / district pages | "Teachers at Riverside Elementary who tutor" — useful trust layer, requires coordination with teachers to tag their school. | Med | Low-Med |
| Session notes | Once a teacher has 5+ recurring students, keeping notes in a Google Doc gets painful. A simple free-form notes field per session is a high-value, low-complexity add. | Med | Low |
| Cancellation policy enforcement | Once informal handling creates a support burden (a handful of disputes per week), enforce policies in the system. | Med | Med |
| Credential / background check | As Tutelo's reputation grows, formal verification becomes a trust moat. Checkr integration adds days but adds significant parent confidence. | Med-High | Med |
| Referral program | "Invite a teacher friend, you both get $X off fees" — classic SaaS growth loop. Worth building when there is a meaningful base to compound. | High at scale | Low-Med |
| Teacher analytics | How many profile views, booking conversion rate, repeat student %, etc. — useful for teacher engagement and retention once there's data to show. | Med | Med |
| Stripe fee pass-through or parent-side fee | Stripe fees can be passed to the parent (parent pays $X + processing fee) which increases teacher take-home. Requires UX explanation and pricing restructure. | Med | Low |
| Package / bundle purchases | Once recurring patterns emerge and teachers want to pre-sell session blocks to committed families. | Med | Med-High |

---

## Phase 3 Candidates

Higher complexity, different user type, or requires Phase 2 features as prerequisites.

| Feature | Why Phase 3 | Prerequisites |
|---------|-------------|---------------|
| Group sessions / cohorts | Different pricing model, waitlist logic, capacity management, per-student payment splitting. A different product. | Session history data, recurring bookings, robust notification system |
| Digital products / downloads | Study guides, practice sets, etc. sold through the teacher page. Requires digital fulfillment, file storage, download management. | High teacher engagement, stable payment infrastructure |
| Workshops / events | Multi-seat events with registration, capacity, and potentially Zoom integration. Biggest scope expansion possible. | Group session model |
| Mobile app | Justified when there's a native-specific workflow (push reminders, camera-based receipt capture, etc.) | Product-market fit confirmed, budget for native development |
| Curriculum marketplace | Teachers selling lesson plans or tutoring materials to other teachers (different audience). | Large teacher base, content moderation |

---

## Competitor Analysis

### Wyzant

**What it does well (for its market):**
- Large tutor supply creates genuine discovery value for parents
- Thorough credentialing (degree verification, background checks) builds parent trust
- In-app video + whiteboard for online sessions
- Session notes and summaries
- Structured trial session model reduces parent risk

**What it does badly for Tutelo's target user:**
- 25-40% commission is a deal-breaker for teachers who already have parent relationships. A classroom teacher doing $200/week in tutoring loses $50-80/week to Wyzant that they'd keep on Tutelo.
- Long onboarding (application review, background check wait). The "under 7 minutes" standard is impossible on Wyzant.
- Wyzant owns the client relationship. If a teacher leaves Wyzant, they lose their reviews, their profile, their booking history. Tutelo's model gives teachers their own URL and their own page — they can take the link with them.
- Platform drives client acquisition, meaning teachers compete against hundreds of other tutors on the same search result page. College students who can charge $20/hr undercut the classroom teacher.
- Complex dashboard and feature set designed for full-time professional tutors, not side-hustle teachers.

**Confidence:** MEDIUM (commission rates change; core model is stable)

---

### Preply

**What it does well (for its market):**
- Strong for language tutoring, international teacher market
- Built-in video with interactive whiteboard
- Student subscription model creates predictable recurring revenue for tutors
- Platform-driven acquisition via SEO and paid marketing

**What it does badly for Tutelo's target user:**
- Heavily language-tutor focused. A 5th grade math teacher at a US elementary school is not Preply's user.
- Commission structure (18-33% declining with hours) still takes a large cut.
- Platform discovery model means teachers compete globally, not locally. A US classroom teacher has a local trust advantage that Preply's model doesn't leverage.
- Requires video integration; in-person tutors have no good fit here.
- Long application process similar to Wyzant.

**Confidence:** MEDIUM

---

### Fons

**What it does well:**
- Built for independent instructors (music teachers, coaches, tutors) — not a marketplace
- Recurring appointment scheduling with smart conflict detection
- Package and subscription billing for sessions
- Client portal so students/parents can self-manage
- Studio/multi-instructor support
- Relatively clean onboarding compared to marketplaces

**What it does badly for Tutelo's target user:**
- Monthly subscription cost (no free tier at last check — ~$29-49/mo). Zero upfront cost is a hard requirement for Tutelo. A teacher needs to see real value (a booking) before paying anything.
- No concept of a public-facing discovery page or profile URL. Fons is a back-office tool, not a front-facing "find me" page. Teachers still need to drive their own traffic but get no shareable public profile.
- Designed for instructors with high session volume (music teachers with 20 students/week). The 2-5 hrs/week classroom teacher side hustle is under-served.
- Onboarding requires payment setup upfront.
- No teacher credential or school-affiliation trust layer.

**Confidence:** MEDIUM (subscription pricing verified to exist; exact tiers from training data, may have changed)

---

### Acuity Scheduling

**What it does well:**
- Extremely polished scheduling experience
- Deep Stripe integration
- Intake forms, packages, gift certificates
- Strong automation (reminders, follow-ups)
- Squarespace acquisition has increased polish and distribution

**What it does badly for Tutelo's target user:**
- Generic scheduling tool — no tutoring or education context whatsoever
- No public profile / discovery page. You get a booking page URL but it's purely functional (pick a time), not a trust-building profile.
- Monthly cost required to use Stripe payments (~$16-20+/mo depending on plan). Zero upfront cost requirement is violated.
- Setup requires meaningful configuration time — it does not auto-generate anything from your identity or credentials.
- No concept of "classroom teacher" identity as a trust signal.
- Parents see a calendar. They don't learn who the teacher is, what school they teach at, what subjects they specialize in.

**Confidence:** MEDIUM

---

### Calendly

**What it does well:**
- Frictionless scheduling link sharing — arguably the best in class
- Strong calendar integrations (Google, Outlook, iCal)
- Clean, professional UX
- Free tier for basic use
- Routing and round-robin for teams (irrelevant here but shows polish)

**What it does badly for Tutelo's target user:**
- No payment integration on free tier; paid tier required for Stripe (~$10-16/mo)
- No public profile page — just a scheduling page
- No concept of teacher identity, credentials, subjects, rates
- No reviews or social proof
- The booking page doesn't convert a skeptical parent — it's purely transactional for people who already trust the person
- No teacher dashboard, earnings tracking, or session history
- In the teacher side-hustle workflow: teacher would need Calendly ($) + Stripe ($) + Venmo + Google Calendar + a separate profile (LinkedIn?) — the fragmentation is exactly what Tutelo solves

**Confidence:** HIGH (Calendly's features are well-documented and stable)

---

## Feature Dependencies

Key dependencies that constrain build order:

```
Teacher Auth
  → Teacher Onboarding Wizard
    → Auto-generated Landing Page
      → Booking Request Form (parent can submit)
        → "Money Waiting" Email (teacher)
          → Stripe Connect Onboarding (teacher)
            → Direct Booking Flow (parent creates account + pays)
              → Payment Authorization at Booking
                → Session Completion → Payment Capture
                  → Review Prompt Email (parent)
                    → Reviews on Landing Page

Teacher Availability Calendar
  → Available Slots on Landing Page
  → Time Slot Selection in Booking Form

Teacher Dashboard
  → Session List (depends on bookings existing)
  → Earnings Display (depends on Stripe Connect)
  → Student List (depends on completed sessions)

Parent Account
  → Booking History (depends on bookings)
  → Rebook (depends on completed sessions + landing page)
```

**Critical path:** Auth → Onboarding → Landing Page → Booking Request → Stripe Trigger. Everything else hangs off this chain.

---

## Teacher-Specific Needs vs. Generic Tutoring Platform Needs

This table is the lens through which every feature decision should be evaluated.

| Dimension | Generic Tutoring Platform Assumption | K-12 Classroom Teacher Reality |
|-----------|--------------------------------------|-------------------------------|
| Time available | Tutors have flexible schedules to manage a full client book | Weekday evenings + weekends only; during term, energy is low |
| Client source | Platform drives discovery | Teacher already knows or is introduced to every parent |
| Volume | 10-20+ students for a full-time tutor | 2-6 students; this is a side hustle, not a business |
| Tech comfort | Comfortable setting up and managing SaaS tools | Varies widely; needs dead-simple setup |
| Trust signal | Resume, degree, star rating | "I teach their kid" is the ultimate trust signal |
| Price sensitivity | Professional tutors want maximum earning tools | $29/mo subscription feels like a side hustle tax; 7% at point of payment does not |
| Competition | Competes with other tutors for new clients | Doesn't need to compete — the parent already chose this teacher |
| Session format | Mix of in-person and online | Primarily in-person in early adopter cohort |
| Scheduling complexity | Full-time tutors need sophisticated scheduling with buffers, travel time, multi-location | Weekly availability grid + specific slot selection is sufficient |
| Motivation to set up | Tutoring is their income — high motivation to configure tools | Side hustle — activation energy is real; must minimize setup cost |

**The core insight:** Every feature built for a professional full-time tutor is likely overkill or wrong-fit for a classroom teacher doing this as a side hustle. Tutelo's moat is being the only product that builds *from* the classroom teacher's reality, not *down to* it.

---

## Sources

- Competitor knowledge from training data (August 2025 cutoff). Platforms analyzed: Wyzant, Preply, Fons, Acuity Scheduling, Calendly.
- WebSearch and WebFetch were unavailable during this research session. Verify commission rates and subscription pricing against current public pages before using in competitive positioning.
- PROJECT.md context from `/Users/soosupcha/Projects/Tutelo/.planning/PROJECT.md` — treated as HIGH confidence for Tutelo-specific decisions.
- Fons pricing: MEDIUM confidence — had free trial but required paid subscription for core features as of training data. Verify current pricing at fons.com/pricing.
- Wyzant commission: MEDIUM confidence — ranged 25-40% historically with a "new tutor" rate structure. Verify at wyzant.com/tutor/resources.
- Calendly features/pricing: HIGH confidence — stable, well-documented product.

# Pitfalls Research: Tutelo

**Domain:** Tutoring booking platform / B2B2C marketplace
**Stack:** Next.js + Supabase + Stripe Connect Express
**Researched:** 2026-03-03
**Overall Confidence:** MEDIUM (training data through Aug 2025; external verification blocked — flag critical items for manual confirmation before implementation)

---

## Critical Pitfalls (Must Address in MVP)

These will kill the product or require expensive rewrites if ignored.

---

### C1: Stripe Connect Express — Charges Blocked Until Capabilities Are Enabled

**Severity:** Critical
**Confidence:** HIGH (well-documented Stripe behavior)

**What goes wrong:**
Stripe Connect Express accounts go through an onboarding flow that requires the connected account to complete identity verification and agree to Stripe's Terms of Service before the `card_payments` and `transfers` capabilities are activated. Until `account.updated` fires with `charges_enabled: true` AND `payouts_enabled: true`, you cannot charge on behalf of that account. If your code creates a PaymentIntent with `transfer_data` pointing to an account that hasn't completed onboarding, Stripe returns a hard error at charge time — not at PaymentIntent creation time. This is a silent trap: the booking flow appears to succeed until payment is actually captured.

**Why it happens:**
Deferred onboarding (where you invite teachers post-booking-request) means there will always be a gap between "teacher exists in your system" and "teacher has a Stripe account that can receive money." If you attempt to collect payment before the teacher has completed onboarding, the payment fails. If you collect payment and THEN try to transfer, the transfer fails.

**Consequences for Tutelo:**
With the deferred Stripe Connect model (no payment setup until first booking arrives), you MUST gate payment collection behind `charges_enabled: true`. Any booking confirmed before that flag is true must be held in escrow-like state or payment collection must be deferred. If you forget to gate this, parents will experience payment failures at the point they feel most committed — after a teacher accepts their booking.

**Prevention:**
1. Subscribe to `account.updated` webhooks on your connected account webhook endpoint (see C2).
2. Store `stripe_charges_enabled` and `stripe_payouts_enabled` boolean columns on the `teachers` table, updated by webhook.
3. Gate the "Confirm Booking & Pay" button on the parent side behind `teacher.stripe_charges_enabled === true`.
4. Display a clear teacher-facing prompt: "Complete Stripe setup to accept your first booking."
5. Never hardcode capability checks — read them from the webhook-updated database field.

**Warning signs:**
- PaymentIntent creation succeeds but capture fails
- Logs show `StripeInvalidRequestError: The destination account needs to have at least one of the following capabilities enabled`
- Teachers report "I accepted a booking but the parent says payment failed"

**Phase:** Address in Phase 1 (Payments foundation). This cannot be bolted on.

---

### C2: Stripe Connect Webhooks — Two Separate Webhook Endpoints Required

**Severity:** Critical
**Confidence:** HIGH

**What goes wrong:**
Stripe Connect requires TWO distinct webhook endpoint configurations:
1. A **platform-level** webhook for your main Stripe account events (e.g., `payment_intent.succeeded`, `charge.refunded`)
2. A **connected-account** webhook for events happening on teacher accounts (e.g., `account.updated`, `payout.failed`, `payout.paid`)

Most developers set up only one. The connected-account events use a different signing secret and arrive at a different endpoint. If you use the same signing secret for both, signature verification fails silently or throws errors that surface as 500s, causing Stripe to retry endlessly.

**Why it happens:**
The Stripe dashboard has separate sections for "Webhooks" and "Connect > Webhooks." It's easy to configure one and assume it covers both. The Stripe CLI also doesn't make this obvious during local development.

**Consequences for Tutelo:**
- `account.updated` never fires in your system → `stripe_charges_enabled` never updates → all bookings are permanently blocked
- `payout.failed` never fires → teachers don't get notified of failed payouts → support tickets
- `account.application.deauthorized` never fires → deauthorized teachers remain "active" in your system

**Prevention:**
1. Create two webhook handlers in your Next.js API routes: `/api/webhooks/stripe` (platform) and `/api/webhooks/stripe-connect` (connected accounts).
2. Store both signing secrets in environment variables (`STRIPE_WEBHOOK_SECRET` and `STRIPE_CONNECT_WEBHOOK_SECRET`).
3. Use `stripe.webhooks.constructEvent(body, sig, secret)` with the correct secret per endpoint.
4. In the dashboard, set the connected account webhook with `connect: true` flag.
5. Test with `stripe listen --forward-connect-to localhost:3000/api/webhooks/stripe-connect`.

**Warning signs:**
- Webhook signature verification errors in logs
- `account.updated` events visible in Stripe dashboard but not in your DB
- Teachers complete onboarding but status never updates

**Phase:** Phase 1 (Payments foundation). Non-negotiable.

---

### C3: Timezone Bugs in Booking System — The Silent Data Corruption

**Severity:** Critical
**Confidence:** HIGH (extremely common in booking systems)

**What goes wrong:**
Booking systems that don't treat all times as UTC in the database, converting to/from user's timezone only at display time, will silently store wrong times. The failure modes are:
- Teacher in EST creates availability "3pm-5pm" → stored as `15:00` without timezone → when parent in PST views it, the system treats `15:00` as PST (11pm EST) — 3-hour offset error
- Daylight Saving Time transitions cause 1-hour double-booking windows (e.g., 1:00am–2:00am slots on DST switchover nights)
- "Available Sunday 9am" means different calendar days depending on UTC offset — a teacher in Hawaii setting Sunday availability may show Saturday slots for users in New York

**Why it happens:**
JavaScript `Date` objects carry timezone context but are often serialized to ISO strings and re-parsed without preserving timezone. Supabase `timestamptz` columns are correct, but `time` and `timestamp` (without tz) columns are a trap. Developers build availability as `time` type ranges (e.g., `09:00–17:00`) without timezone, then display them as if they're local time.

**Consequences for Tutelo:**
- Parents book a "4pm" slot that the teacher thought was "7pm" → no-show
- Teachers set weekly recurring availability that silently shifts after DST
- Overlap between booked sessions not detected because comparison is done in wrong timezone

**Prevention:**
1. Store ALL timestamps as `timestamptz` in Supabase. Never use `timestamp` (without tz) or bare `time` columns for booking data.
2. Store teacher's IANA timezone string (e.g., `America/New_York`) on the `teachers` table at profile creation. Require it — do not infer it.
3. Store availability slots as UTC `timestamptz` ranges, not local-time strings.
4. On the frontend, use a timezone-aware library. `date-fns-tz` or `Temporal` (if available) are preferred over raw `Date`. Never do timezone math manually.
5. When displaying times to users, always convert from UTC using the viewer's stored IANA timezone.
6. Write explicit tests: create a booking in EST, read it back as PST, verify the UTC storage is unchanged.

**Warning signs:**
- Teacher and parent see different times for the same booking
- Bookings that were correct yesterday are off by 1 hour today (DST fired)
- Availability slots appearing on wrong calendar days for users in different timezones

**Phase:** Phase 1 (Booking core). Retrofit is expensive — get this right initially.

---

### C4: Supabase RLS — Row Level Security Silent Failures

**Severity:** Critical
**Confidence:** HIGH

**What goes wrong:**
Supabase RLS policies that have logic errors don't throw errors — they silently return empty results or silently block writes. This means a bug in your RLS policies will manifest as:
- A parent trying to view their bookings sees an empty list (looks like a UI bug)
- A teacher trying to update their availability gets a silent no-op (no error, no rows updated)
- An admin dashboard query returns no data even when records exist

The hardest variant: RLS policies that work correctly when tested as the postgres superuser (which bypasses RLS) but fail for actual authenticated users. This leads to "works on my machine" bugs that are invisible in development if you don't test as actual Supabase auth users.

**Why it happens:**
RLS policies reference `auth.uid()` or `auth.jwt()` claims. In development, developers often test queries via the Supabase Studio table editor, which uses the service role key (bypassing RLS). The policy looks correct but has never been tested as an actual `anon` or `authenticated` role user.

**Consequences for Tutelo:**
With three roles (parent, teacher, admin), RLS policies must correctly gate:
- Parents: see only their own bookings, can read teacher profiles
- Teachers: see only their own bookings, can update their own availability
- Admins: see all data
- Service role: used only in backend API routes, never exposed to frontend

A misconfigured policy can mean parents see other parents' bookings (data breach), or teachers can't update their own profiles (broken UX), or admins are locked out.

**Prevention:**
1. Enable RLS on every table immediately — never create a table without immediately writing its policies.
2. Test every policy by calling Supabase from the frontend (as an authenticated user with a specific role), NOT from Supabase Studio with service role.
3. Use `SECURITY DEFINER` functions sparingly and understand they bypass RLS entirely.
4. Store user role (`parent` | `teacher` | `admin`) in `auth.users.raw_user_meta_data` OR in a separate `profiles` table joined via `auth.uid()`. Do not use `app_metadata` for things you set from the client — that's a security hole.
5. Write a test suite that authenticates as each role type and asserts what they can and cannot read/write.
6. Use Supabase's RLS policy tester in the dashboard during development.

**Warning signs:**
- Queries return 0 rows unexpectedly
- Updates return success but data doesn't change
- "Works in Studio but not in the app"
- Different behavior when using `supabaseAdmin` (service key) vs `supabase` (anon key)

**Phase:** Phase 1 (Auth/roles foundation). RLS must be designed before data model is finalized.

---

### C5: Double-Booking — Race Condition in Availability Check

**Severity:** Critical
**Confidence:** HIGH

**What goes wrong:**
The naive booking flow:
1. Check if teacher is available at requested time → YES
2. Create booking record

Between steps 1 and 2, a second parent can complete step 1 simultaneously and also get YES. Both bookings are created, teacher is double-booked. This is a classic TOCTOU (time-of-check, time-of-use) race condition.

**Why it happens:**
Most developers implement availability checks as a SELECT query followed by an INSERT query — two separate database operations with no atomicity guarantee. At low traffic it rarely manifests. At higher traffic (especially if you send push notifications to parents that a new teacher is available, causing a spike), it becomes frequent.

**Consequences for Tutelo:**
A double-booked teacher must cancel one session. The parent who gets cancelled has a terrible first experience. On a platform where trust is the product, this is catastrophic for retention.

**Prevention:**
1. Implement booking creation as a **single atomic Postgres function** (RPC via `supabase.rpc()`). The function should use `SELECT ... FOR UPDATE` or a unique constraint to prevent concurrent conflicts.
2. Add a **unique constraint** on `(teacher_id, session_start_time)` in the bookings table so the database itself enforces non-overlap at the insert level.
3. Consider a "slot reservation" pattern: when a parent clicks "Request Session," atomically reserve the slot for 10 minutes. If payment/confirmation doesn't complete, the reservation expires.
4. For recurring bookings, the uniqueness check must cover all instances, not just the first.

**Warning signs:**
- Duplicate bookings in the database for the same teacher at the same time
- Teacher complaints about double-booking
- `23505 unique_violation` errors in logs (good — means constraint is working)

**Phase:** Phase 1 (Booking core). Atomic booking creation must be designed from the start.

---

### C6: Stripe Webhook Signature Verification — Raw Body Destruction

**Severity:** Critical
**Confidence:** HIGH

**What goes wrong:**
Stripe webhook signature verification requires the **raw, unparsed request body**. If Next.js (or any middleware) parses the JSON body before your webhook handler sees it, the raw bytes are gone and `stripe.webhooks.constructEvent()` will always fail with a signature mismatch error.

In Next.js App Router, this is particularly subtle: if you have a global body parser middleware (or if you're using `NextResponse` with automatic JSON parsing), the raw body is consumed before your handler runs.

**Why it happens:**
Next.js 13+ App Router doesn't have the `bodyParser: false` configuration that Pages Router had. Developers copy webhook handler code from Pages Router examples into App Router without adapting it. The error messages are confusing: "No signatures found matching the expected signature for payload."

**Prevention:**
1. In App Router, read the raw body using `req.text()` or `req.arrayBuffer()` before passing to `stripe.webhooks.constructEvent()`.
2. Do NOT use `req.json()` in webhook routes.
3. Example:
   ```typescript
   const body = await req.text();
   const sig = headers().get('stripe-signature')!;
   const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
   ```
4. Test locally with `stripe listen` CLI to confirm signature verification works before deployment.

**Warning signs:**
- `WebhookSignatureVerificationError` in production
- Stripe dashboard shows 400 responses for webhook deliveries
- All webhooks fail immediately after deployment but work in local dev

**Phase:** Phase 1 (Payments). Often caught late when payments fail in staging.

---

## High Priority Pitfalls

Significant user pain or technical debt if ignored.

---

### H1: Deferred Stripe Connect — Booking Limbo State

**Severity:** High
**Confidence:** HIGH

**What goes wrong:**
The deferred model (teacher gets Stripe onboarding link only after first booking request) creates a "limbo" booking state that most implementations handle poorly:

- Parent requests booking → teacher accepts → parent goes to pay → teacher has no Stripe account yet
- Parent requests booking → teacher accepts → teacher starts Stripe onboarding → parent pays → teacher abandons onboarding halfway → payment is collected but cannot be transferred
- Parent pays → teacher completes onboarding days later → payout happens weeks later → teacher is confused

**Consequences for Tutelo:**
Limbo bookings accumulate. Parents feel payment is processing forever. Teachers think money is lost. Trust collapses in the critical first interaction.

**Prevention:**
1. Design the state machine explicitly. Booking states should be: `requested` → `teacher_accepted` → `awaiting_stripe_setup` (if teacher has no Stripe) → `payment_pending` → `confirmed` → `completed`.
2. Never collect payment until `teacher.stripe_charges_enabled === true`.
3. After teacher accepts, immediately send the Stripe onboarding link. Make this the next required step before the parent is even notified of acceptance.
4. Set a maximum wait time (e.g., 48 hours) for Stripe setup. If not completed, auto-cancel the booking with a clear explanation to both parties.
5. Consider alternative: require teachers to complete Stripe setup during PROFILE creation (before any booking), not deferred. Simpler state machine, less limbo risk.

**Warning signs:**
- Bookings stuck in `teacher_accepted` state for >24 hours
- Parent emails asking "when does my payment go through"
- Teacher emails asking "I accepted but haven't been paid"

**Phase:** Phase 1 (Booking + Payments integration design). State machine must be explicit in the DB schema.

---

### H2: Supabase Free Tier Limits — Production Traffic Surprise

**Severity:** High
**Confidence:** MEDIUM (limits change; verify current values at launch)

**What goes wrong:**
Supabase free tier has limits that are invisible during development but hit suddenly in production:
- **500MB database storage** — a booking platform with session notes, availability slots, and user profiles grows faster than expected
- **2GB bandwidth per month** — if you serve profile images or documents through Supabase Storage, this is reached quickly
- **50MB file uploads per project** — per upload limit
- **Paused projects after 1 week of inactivity** — on free tier, if Tutelo launches then goes quiet for a week during iteration, the project pauses and users hit a dead site

**Why it happens:**
Development databases are sparse. 500MB sounds like a lot. But with RLS policies, indexes, audit logs, and session data, real apps hit it sooner than expected.

**Consequences for Tutelo:**
If Instagram launch goes well and drives traffic, hitting Supabase free tier limits mid-launch is a worst-case scenario. The Pro plan upgrade takes effect immediately but requires downtime management. More importantly, the project-pausing behavior can kill early traction entirely.

**Prevention:**
1. Upgrade to Supabase Pro ($25/month) before any public launch. Not optional.
2. Implement Supabase Storage with a CDN (Supabase has Cloudflare integration) for profile images to avoid bandwidth costs.
3. Monitor database size from day one using `SELECT pg_database_size(current_database())`.
4. Archive or soft-delete old booking data to control growth.

**Warning signs:**
- Supabase dashboard shows >60% storage usage
- API requests start returning 429 errors (rate limiting)
- Project goes offline unexpectedly during low-traffic period

**Phase:** Pre-launch checklist. Easy to miss, expensive to hit.

---

### H3: Supabase Auth — Email Confirmation Breaks Mobile Signup

**Severity:** High
**Confidence:** HIGH

**What goes wrong:**
Supabase Auth requires email confirmation by default. On mobile (which will be Tutelo's primary channel given the Instagram GTM strategy), the email confirmation flow is broken:
- User signs up on their phone
- Supabase sends confirmation email
- User leaves the app to go to Gmail (or worse, checks email on desktop)
- Confirmation link opens in the desktop browser, creating a new session
- User returns to phone, is not logged in, is confused

Additionally, if you're building a PWA or mobile-first web app, deep links from email to app are non-trivial to configure correctly.

**Prevention:**
1. Configure Supabase Auth to redirect to your app's URL after email confirmation, not to `localhost`.
2. Use Supabase's PKCE flow (recommended for mobile/SPAs) to prevent session fragmentation.
3. Consider disabling email confirmation for MVP and using only email/password or magic link, with confirmation as a background check.
4. If using magic links: set short expiry (1 hour), handle "link expired" gracefully with a "resend" option.
5. Test the entire auth flow on a real mobile device, not just desktop browser.

**Warning signs:**
- Analytics show high signup-to-confirmation drop-off
- Support tickets: "I confirmed but I'm not logged in"
- Users creating multiple accounts because they couldn't confirm the first

**Phase:** Phase 1 (Auth). Must test on mobile before launch.

---

### H4: Stripe 1099-K Compliance — Teacher Tax Surprise

**Severity:** High
**Confidence:** MEDIUM

**What goes wrong:**
In the US, Stripe is required to issue a 1099-K to connected account holders who exceed the IRS reporting threshold. As of recent legislation (pending final implementation as of Aug 2025), the threshold may drop significantly from the prior $20,000/200-transaction rule. Stripe handles the form generation automatically for connected accounts, BUT:
- Teachers who are employees of a school district may have contract restrictions on outside income
- Teachers are often unaware that tutoring income is taxable self-employment income subject to SE tax (~15.3%)
- If you don't surface this clearly during onboarding, teachers feel blindsided by a 1099 they weren't expecting
- This can cause teacher churn: they quit the platform rather than deal with tax complexity they didn't sign up for

**Prevention:**
1. Display a clear disclaimer during teacher onboarding: "Tutelo reports earnings to the IRS via 1099-K. You are responsible for applicable self-employment taxes."
2. Link to IRS guidance on self-employment income.
3. Consider adding a tax FAQ to the teacher help center.
4. Collect teacher's SSN/EIN during Stripe onboarding (Stripe handles this). Don't collect it yourself.
5. Do NOT position the platform as a way to earn "under the table" — this is a compliance and reputation risk.

**Warning signs:**
- Teacher support tickets: "I got a 1099 from Stripe, what is this?"
- Teacher churning in January (after receiving 1099-Ks for prior year)
- Negative reviews mentioning unexpected tax burden

**Phase:** Phase 1 onboarding copy and legal review.

---

### H5: Booking System — Recurring Sessions Edge Cases

**Severity:** High
**Confidence:** HIGH

**What goes wrong:**
"Weekly sessions" sound simple but have dozens of edge cases:
- Teacher cancels a recurring session: cancel just this one, or all future? UI must be explicit.
- Holiday conflicts: teacher is unavailable Dec 25 but recurring session exists
- Payment for recurring: charge weekly? Monthly? At time of session? In advance?
- Teacher changes their availability: does this invalidate confirmed recurring bookings?
- DST transition: weekly sessions at "4pm" that recur across a DST boundary are stored as UTC — 4pm EST in November becomes 4pm EDT in March — which is a different UTC time
- One-off session vs. recurring: parents assume "monthly" means "last Tuesday of each month at 3pm" but developers implement it as "every 4 weeks"

**Prevention:**
1. For MVP: implement ONLY single sessions. No recurring. Recurring is a Phase 2+ feature.
2. When you build recurring: use an explicit recurrence rule (RRULE format, iCal-compatible) stored in the database, not a custom "repeat every N days" scheme.
3. Never expand recurring events into individual rows at creation time — expand lazily (create rows for upcoming sessions on a schedule), keeping the RRULE as source of truth.
4. Handle cancellation modes explicitly: "this session," "this and all future," "all in series."

**Warning signs:**
- Teacher calendar showing sessions that were supposed to be cancelled
- Parent paying for sessions that don't happen
- DST-related complaints about session times being "wrong"

**Phase:** Phase 2+. Do not build recurring for MVP.

---

### H6: Stripe Payout Timing — Teacher Expectation Mismatch

**Severity:** High
**Confidence:** HIGH

**What goes wrong:**
New Stripe Connect Express accounts have a default payout schedule of T+7 (7 days rolling) or longer for the first 90 days while Stripe performs risk assessment. Teachers who complete a tutoring session on Monday expecting to be paid that week will be surprised when nothing appears in their bank account for 7–14 days.

Additionally:
- Bank account verification adds 2-3 business days
- Payout failures (wrong bank account details) don't surface immediately — Stripe sends `payout.failed` webhook, but if you don't handle it, the teacher just sees no money

**Consequences for Tutelo:**
Teacher's first payout experience is "I finished my session, where is my money?" This is a high-churn moment. Teachers who don't understand the payout timeline leave negative feedback or simply stop showing up.

**Prevention:**
1. During Stripe onboarding, explicitly communicate: "Your first payment will arrive 7–10 business days after your first session. After 90 days, payouts occur every 2 business days."
2. Add a "Your upcoming payouts" section to the teacher dashboard showing scheduled payout amounts and arrival dates (pull from Stripe API).
3. Handle `payout.failed` webhook: notify the teacher immediately via email with instructions to update bank details.
4. Handle `payout.paid` webhook: send teacher a "You've been paid!" notification.

**Warning signs:**
- Teacher support tickets in the first 2 weeks: "where is my money"
- Teacher deactivating their account after first session (payout frustration)

**Phase:** Phase 1 (Payments). Notification must be built alongside payment collection.

---

### H7: Self-Reported Credentials — Trust and Liability

**Severity:** High
**Confidence:** MEDIUM

**What goes wrong:**
Allowing teachers to self-report credentials (school district, grade level, subject) creates two distinct risks:
1. **Trust:** Parents don't know if a "7th grade math teacher" is actually a certified teacher or someone claiming to be one
2. **Liability:** If a teacher with false credentials causes harm to a child, Tutelo may bear reputational (and potentially legal) liability for facilitating the connection

The subtler risk: verified-credential competitors will market against you ("Unlike Tutelo, we verify every teacher"). Once a competitor does this, self-reported credentials become a liability rather than just a neutral feature gap.

**Prevention:**
1. Add social proof proxies that are verifiable without manual review: school email address verification (`@[district].edu`), LinkedIn profile link, teaching license number (displayed, not verified).
2. Display a clear disclaimer on teacher profiles: "Tutelo does not independently verify teacher credentials."
3. Implement parent reviews as a trust signal immediately — a teacher with 10 5-star reviews from real parents is more trustworthy than a credential badge.
4. Plan background check integration for Phase 2 (services like Checkr have APIs). Signal this publicly: "Enhanced background checks coming soon."
5. Consider requiring school email verification at minimum for MVP — it's cheap, automated, and meaningfully increases trust.

**Warning signs:**
- Parent complaints about misrepresented credentials
- Teacher profiles with implausible claims (10 years experience at age 22)
- Press coverage of a marketplace trust incident in the edtech space

**Phase:** Phase 1 (Teacher onboarding). Copy and disclaimer must be in place at launch.

---

## Medium Priority Pitfalls

Worth knowing, can defer but should be on radar.

---

### M1: Supabase Realtime — Presence and Connection Limits

**Severity:** Medium
**Confidence:** MEDIUM

**What goes wrong:**
If you build realtime features (live booking status updates, messaging), Supabase Realtime has connection limits on the free tier (200 concurrent connections) and the Pro tier (500 concurrent). More importantly, Realtime subscriptions that don't filter correctly (e.g., subscribing to `bookings:*` instead of `bookings:teacher_id=eq.{uid}`) will push ALL booking change events to ALL connected clients — a privacy leak and a performance problem.

**Prevention:**
1. Always filter Realtime subscriptions by the authenticated user's ID.
2. For MVP, consider polling (every 30 seconds) rather than Realtime for booking status updates. Simpler, no connection limit issues.
3. If using Realtime: test with 50+ concurrent connections in staging before launch.

**Phase:** Phase 2 (if adding messaging or live status). Not MVP-critical.

---

### M2: Next.js App Router — Server Actions and Stripe Race Conditions

**Severity:** Medium
**Confidence:** MEDIUM

**What goes wrong:**
Next.js Server Actions are convenient but have subtle gotchas in payment flows:
- Server Actions don't have built-in idempotency. If a user double-clicks a "Confirm Booking" button, the Server Action may fire twice, creating duplicate PaymentIntents.
- Server Actions timeout at 60 seconds by default. Stripe Connect operations (creating accounts, processing payments) can take longer under load.
- Error handling in Server Actions doesn't automatically roll back database writes. If you write to Supabase then call Stripe and Stripe fails, the Supabase write is committed but the payment doesn't exist — inconsistent state.

**Prevention:**
1. Create Stripe PaymentIntents with an `idempotency_key` (use a booking UUID) to prevent duplicate charges.
2. Disable the submit button after first click (client-side) AND enforce idempotency server-side.
3. For payment flows, use database-first pattern: create the booking record first, then process payment, then update status. If payment fails, mark booking as `payment_failed`. Never assume both succeed atomically.

**Phase:** Phase 1 (Payments). Design idempotency from day one.

---

### M3: Onboarding Drop-Off — Form Friction on Mobile

**Severity:** Medium
**Confidence:** HIGH

**What goes wrong:**
Long signup forms (especially for teachers who need to provide school, grade level, subjects, bio, availability, and Stripe info) are the primary cause of onboarding drop-off. On mobile, each additional form field loses ~10-15% of users.

The specific failure mode for teacher onboarding: requiring too much information before the teacher can see any value. If a teacher must complete a 12-field form AND connect Stripe before they can even browse what the platform looks like, most will abandon.

**Prevention:**
1. Use progressive disclosure: minimum viable profile first (name, school, email), then prompt for more detail later.
2. For MVP: require only name, email, school district, and subjects. Everything else (bio, photo, availability) can be added after account creation.
3. Defer Stripe Connect setup until the teacher wants to accept their first booking — this is actually the deferred model and it's correct for onboarding friction reduction.
4. Use autocomplete for school district names (there are public datasets of US school districts).
5. Test the teacher signup flow on a real phone with real cellular connection, not WiFi.

**Phase:** Phase 1 (Onboarding). A/B test form length early.

---

### M4: Cold Start — Two-Sided Marketplace Without Demand

**Severity:** Medium (for Tutelo's specific GTM, mitigated by Instagram audience)
**Confidence:** HIGH

**What goes wrong:**
Classic two-sided marketplace chicken-and-egg: teachers won't join if there are no parents, parents won't use it if there are no teachers. Most edtech marketplaces fail at this stage.

The risk for Tutelo specifically: if the Instagram audience (@eyes_on_meme) skews toward parents rather than teachers (or vice versa), the platform will have demand on one side and nothing on the other. Additionally, an audience built around content (memes, relatable teacher content) doesn't automatically convert to commerce. Purchase intent is very different from content engagement.

**Prevention:**
1. Launch supply first: recruit 20-30 verified teacher profiles BEFORE opening to parents. Don't launch to parents with an empty marketplace.
2. Personally onboard the first 10-20 teachers from your Instagram audience. DM them, walk them through signup, treat it as white-glove.
3. For the first cohort, offer 0% platform fee. Remove economic friction completely for early adopters.
4. Track the follower-to-signup conversion rate from the first Instagram CTA. If it's <1%, the audience isn't converting and GTM strategy needs adjustment.

**Warning signs:**
- Parents sign up but there are no teachers near them or in their subject area
- Teachers sign up but sit without booking requests for 2+ weeks
- Engagement on Instagram posts about Tutelo is high (comments, likes) but signups are low

**Phase:** Pre-launch and Phase 1. Supply seeding is a launch prerequisite.

---

### M5: Legal — School District Employment Contract Restrictions

**Severity:** Medium
**Confidence:** MEDIUM

**What goes wrong:**
Many US school districts have employment contracts that restrict teachers from:
- Competing with district programs (some districts offer their own tutoring programs)
- Using student relationships formed at school for private commercial purposes
- Contacting students' parents outside official channels for commercial purposes
- Operating a business that could be seen as a conflict of interest

Teachers who violate their contract to use Tutelo face disciplinary action. This creates churn (they leave when they realize the risk) and reputational risk for Tutelo if a district investigates.

**Prevention:**
1. Add a teacher onboarding acknowledgment: "I confirm that using Tutelo complies with my employer's policies regarding outside employment and tutoring."
2. Add FAQ content: "Is using Tutelo allowed for school teachers?" with general guidance and a prompt to review their contract.
3. Do NOT market Tutelo with messaging that implies teachers can tutor their own students — this is the highest-risk violation.
4. Position Tutelo as serving students who are NOT a teacher's own classroom students (different school, different district, or different grade level).

**Phase:** Phase 1 (Copy and legal review before launch).

---

### M6: Platform Fee Collection — Timing and Failure Modes

**Severity:** Medium
**Confidence:** HIGH

**What goes wrong:**
Stripe Connect Express allows the platform to take an `application_fee_amount` at charge time. If you set the fee percentage incorrectly (e.g., computing 15% of $50 in integer cents and getting a rounding error), you either undercharge or fail the transaction. More commonly:

- If a refund is issued, the application fee is automatically refunded proportionally — but only if you issued the refund via Stripe, not via a manual bank transfer workaround.
- If you update your fee structure later (e.g., 10% → 15%), existing bookings confirmed under old fees must be processed at the old rate. No mechanism to retroactively update.
- Fee collection fails silently if the `application_fee_amount` exceeds the charge amount (Stripe returns an error but many implementations don't handle it).

**Prevention:**
1. Compute fees in integer cents using integer arithmetic (not floating point). `Math.round(amountInCents * feePercent / 100)` not `amountInCents * 0.15`.
2. Store the agreed fee percentage on the booking record at booking creation time, not on the teacher profile. This locks in the rate.
3. Always process refunds through Stripe's API, never via manual workarounds.
4. Handle `application_fee_amount > charge_amount` as a hard error with clear logging.

**Phase:** Phase 1 (Payments). Fee math errors compound quickly.

---

### M7: Solo Build Scope Creep — Death by Polish

**Severity:** Medium
**Confidence:** HIGH

**What goes wrong:**
At 10-15 hours/week, a solo builder has approximately 40-60 hours per month of productive development time. Features that seem small (a notification system, a review/rating system, a calendar UI, a messaging system) each consume 20-40 hours individually. The trap: building polished versions of features instead of functional versions.

Common fatal scope decisions for a solo tutoring platform at MVP:
- Building in-app messaging (use email for MVP)
- Building a custom calendar picker (use a library like `react-day-picker` or Calendly embed)
- Building a teacher search with filters (use a simple list sorted by rating for MVP)
- Building automated session reminders (use Supabase edge functions triggering simple emails)

**Prevention:**
1. Set a hard MVP feature list and treat every addition as a tradeoff against launch date.
2. Use a launch deadline (target date) as the primary constraint, not feature completeness.
3. Prefer library solutions for all UI components: shadcn/ui, react-day-picker, react-hook-form.
4. Defer: messaging, reviews/ratings, search/filters, recurring bookings, referral system, coupon codes.
5. Track hours per feature to calibrate estimates.

**Phase:** Ongoing. Most dangerous in Phase 2-3 when the platform "almost works."

---

### M8: Stripe Connect — Account Deauthorization Handling

**Severity:** Medium
**Confidence:** HIGH

**What goes wrong:**
Teachers can disconnect their Stripe account from your platform at any time by going to their Stripe dashboard and revoking access. When this happens, Stripe sends `account.application.deauthorized`. If you don't handle this webhook:
- The teacher still appears as "active" in your system
- Parents can still try to book them
- When payment is attempted, it fails with a confusing error
- There are no payouts to the teacher

**Prevention:**
1. Handle `account.application.deauthorized` webhook: set `stripe_account_id = null` and `stripe_charges_enabled = false` on the teacher record.
2. Immediately disable the teacher's booking availability so no new bookings can be made.
3. Email the teacher: "Your Stripe account was disconnected from Tutelo. Reconnect to continue accepting bookings."
4. For any pending bookings: cancel them and refund parents.

**Phase:** Phase 1 (Webhooks). Must be part of initial webhook implementation.

---

## Design Decision Validation

Evaluating Tutelo's five key architectural decisions against research findings.

---

### Decision 1: Deferred Stripe Connect

**Decision:** No payment setup required until first booking request arrives.
**Verdict:** SMART with critical guardrails.
**Confidence:** HIGH

**Analysis:**
Deferred onboarding is the correct decision for reducing teacher signup friction. Requiring Stripe setup before a teacher has any reason to complete it creates a 100% abandonment rate at that step for teachers who aren't yet convinced the platform will generate revenue for them.

HOWEVER, the deferred model introduces the limbo booking problem (see H1). The key is engineering the state machine correctly:
- Teachers must be blocked from "accepting" bookings until Stripe is set up, OR
- Acceptance triggers an immediate Stripe setup prompt with a time limit, OR
- Payment is not collected until setup completes, with the parent clearly informed

**Guardrail required:** Define the exact state machine before writing any booking code. The sequence `request → accept → stripe_setup → payment → confirm` must be explicit in the database schema and enforced, not assumed.

**Risk level:** Low if state machine is implemented correctly. High if state machine is implicit/assumed.

---

### Decision 2: Booking Request Model (No Payment Until Stripe Connected)

**Decision:** No payment collected until teacher connects Stripe.
**Verdict:** VALID for MVP, but fraud risk is real and must be bounded.
**Confidence:** MEDIUM

**Analysis:**
The fraud risk in the "request without payment" model is primarily:
- Fake booking spam: bad actors can flood teachers with fake booking requests
- Parent intent verification: a parent who isn't charged feels less committed, leading to no-shows even after teacher accepts

The fraud risk is bounded in the early phase because:
- Volume is low (small user base)
- Teachers are real identities (school email verification)
- The Instagram GTM brings a known community, not anonymous users

**Guardrail required:** Add rate limiting on booking requests per parent account. Consider a small deposit or card pre-authorization (not charge) at booking request time — this verifies the card and parent intent without completing the charge until after the session.

**Risk level:** Low at MVP scale. Revisit when volume exceeds 100 bookings/month.

---

### Decision 3: Self-Reported Teacher Credentials

**Decision:** MVP uses self-reported credentials with no verification.
**Verdict:** ACCEPTABLE for MVP with strong disclaimers. Must have Phase 2 plan.
**Confidence:** MEDIUM

**Analysis:**
Self-reported credentials are industry-standard for early-stage edtech platforms. Wyzant, Tutor.com, and Varsity Tutors all started with lighter verification. The risk is real but manageable at low scale.

The critical guardrails:
- Explicit disclaimer on profiles and during parent onboarding: "Credentials are self-reported by teachers. Tutelo does not independently verify."
- School email verification as a minimum trust signal (verifiable, automated, meaningful)
- Parent reviews/ratings as early as possible (Phase 2 at latest)
- No marketing language that implies verification you haven't done

**Risk level:** Low at MVP. Elevates when you reach media attention or larger scale. Plan Checkr or similar integration for Phase 3.

---

### Decision 4: Solo Build at 10-15 hrs/week

**Decision:** Building solo, 10-15 hours per week.
**Verdict:** VIABLE for MVP if scope is ruthlessly constrained.
**Confidence:** HIGH

**Analysis:**
At 15 hrs/week, you have approximately 60 hours per month. Realistic milestones:
- Phase 1 (Auth + profiles + booking + payments): 120-180 hours → 2-3 months
- Phase 2 (Reviews + notifications + teacher dashboard): 80-120 hours → 1.5-2 months
- Phase 3 (Search + mobile polish + compliance): 60-80 hours → 1-1.5 months

Total to launch-ready: 5-7 months at this pace. This is achievable if scope doesn't expand. The pitfall is feature creep adding 20-40% to each phase.

**Guardrail required:** Maintain a strict "not in MVP" list. Every feature request or idea gets triaged: MVP or backlog. No exceptions during Phase 1-2.

**Risk level:** Medium. The risk is motivation and consistency over 6+ months, not technical feasibility.

---

### Decision 5: Instagram (@eyes_on_meme) as Primary GTM

**Decision:** Leverage existing Instagram teacher audience for launch distribution.
**Verdict:** HIGH UPSIDE, HIGH DEPENDENCY RISK.
**Confidence:** MEDIUM

**Analysis:**
Having an existing audience is a genuine advantage that most marketplace founders don't have. However:

1. **Content-to-commerce conversion is uncertain.** An audience that follows for relatable teacher content may not convert to users who want to set up a tutoring side hustle. The psychographic overlap needs validation with a test CTA before the platform exists.

2. **Single channel dependency.** If Instagram algorithm changes, account gets flagged, or engagement drops, GTM collapses. No diversification.

3. **Audience composition risk.** If the audience skews heavily toward one geography, subject area, or grade level, supply will be imbalanced.

4. **Timing dependency.** Instagram algorithm favors active accounts. A long build phase without product-relevant content may cause audience decay.

**Guardrail required:**
- Post a "would you use this?" poll or waitlist CTA before building. Validate conversion intent.
- Grow an email list (not just Instagram) of interested teachers during the build phase.
- Identify 2-3 backup channels (teacher Facebook groups, Reddit r/Teachers, TikTok for Teachers).
- Set a minimum teacher signup threshold (e.g., 25 verified teachers) before opening to parents.

**Risk level:** Medium-High. GTM is the product's biggest risk, more so than technical execution.

---

## Phase-by-Phase Risk Mapping

| Phase | Topic | Primary Pitfall | Mitigation | Severity |
|-------|-------|-----------------|------------|----------|
| Phase 1 | Database schema | Timezone storage errors | Use `timestamptz` everywhere; store IANA tz string | Critical |
| Phase 1 | RLS design | Silent policy failures for multi-role access | Design policies before schema; test as real users | Critical |
| Phase 1 | Booking creation | Double-booking race condition | Atomic DB function + unique constraint | Critical |
| Phase 1 | Webhook setup | Missing Connect webhook endpoint | Two endpoints, two secrets, test both | Critical |
| Phase 1 | Webhook body | Raw body destroyed by middleware | Use `req.text()` not `req.json()` | Critical |
| Phase 1 | Payments | Teacher capabilities not enabled | Gate payment on `charges_enabled` flag from webhook | Critical |
| Phase 1 | Booking state | Limbo bookings (deferred Stripe) | Explicit state machine, 48-hour timeout, clear UX | High |
| Phase 1 | Auth mobile | Email confirmation broken on mobile | PKCE flow, correct redirect URLs, mobile test | High |
| Phase 1 | Teacher onboarding | Credentials trust gap | Disclaimer copy, school email verification | High |
| Phase 1 | Payout | Teacher payout timing surprise | Onboarding copy explaining T+7 timeline | High |
| Phase 1 | Fees | Integer rounding errors | Integer arithmetic, store rate on booking record | Medium |
| Phase 1 | Deauthorization | Teacher disconnects Stripe silently | Handle `account.application.deauthorized` | Medium |
| Phase 1 | Idempotency | Double-click creates duplicate PaymentIntents | Idempotency key = booking UUID | Medium |
| Pre-launch | Infrastructure | Supabase free tier limits | Upgrade to Pro before launch | High |
| Pre-launch | GTM | Supply-side cold start | Seed 20-30 teacher profiles before parent launch | Medium |
| Pre-launch | Legal | School district contract violations | Acknowledgment copy + FAQ in teacher onboarding | Medium |
| Pre-launch | Tax | Teacher 1099-K surprise | Disclosure in onboarding, link to IRS guidance | High |
| Phase 2 | Recurring bookings | DST edge cases, cancellation complexity | Build only after single-session is proven | High |
| Phase 2 | Realtime | Unfiltered subscriptions = privacy leak | Filter by `auth.uid()`, consider polling for MVP | Medium |
| Phase 2 | Credentials | Competitor trust gap widens | Begin Checkr or school-email verification | High |
| Ongoing | Scope | Solo builder feature creep | Strict MVP list, time-box features | Medium |
| Ongoing | GTM | Single channel Instagram dependency | Grow email list, identify 2 backup channels | Medium |

---

## Summary of Most Critical Risks

In priority order for a solo builder at 10-15 hrs/week:

1. **Timezone storage** — Silent data corruption. Get this right in the schema before any booking code is written.
2. **Stripe webhook architecture** — Two endpoints, two secrets. Get this right before payments are written.
3. **RLS policy testing** — Test as real users, not studio superuser. Build the test harness in Phase 1.
4. **Booking state machine** — Make the limbo states explicit. Draw the state machine before writing code.
5. **Teacher payout expectations** — Cheap to fix with copy; expensive to lose early teachers over.
6. **GTM validation** — Test the Instagram conversion before investing 6 months of build time.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stripe Connect Express pitfalls | HIGH | Well-documented, consistent with official Stripe docs as of Aug 2025 |
| Supabase RLS pitfalls | HIGH | Core product behavior unlikely to change |
| Supabase free tier limits | MEDIUM | Verify current limits at launch — Supabase changes these |
| Booking/timezone pitfalls | HIGH | Universal booking system problem, well-documented |
| 1099-K threshold | MEDIUM | IRS threshold was in legislative flux as of Aug 2025; verify current rules |
| School district contract law | LOW | Jurisdiction-specific; requires legal counsel for definitive guidance |
| Stripe payout timing | MEDIUM | Stripe changes default schedules; verify current defaults |
| Instagram conversion rates | LOW | No data available; requires empirical testing |

---

## Sources

Note: External web access was unavailable during this research session. All findings are based on training knowledge through August 2025, cross-referenced across Stripe documentation, Supabase documentation, edtech marketplace post-mortems, and booking system engineering patterns in the author's training corpus. Items marked MEDIUM or LOW confidence should be manually verified against current official documentation before implementation.

**Key sources to verify manually:**
- https://stripe.com/docs/connect/express-accounts — Express account capabilities and requirements
- https://stripe.com/docs/connect/webhooks — Connect webhook configuration
- https://supabase.com/docs/guides/auth/row-level-security — RLS patterns
- https://supabase.com/pricing — Current free tier limits
- https://stripe.com/docs/connect/payout-statement-descriptors — Payout timing documentation
- IRS.gov — Current 1099-K reporting thresholds