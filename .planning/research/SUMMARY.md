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
