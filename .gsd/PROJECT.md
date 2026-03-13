# Tutelo

## What This Is

Tutelo is a web application that gives K-12 classroom teachers a professional tutoring landing page — with scheduling, payments, and booking — in under 7 minutes, at zero upfront cost. Parents discover and book verified classroom teachers through those pages. Teachers own their client relationships and pay only when they earn (7% platform fee, no monthly cost).

Tagline: "Shopify for teacher side hustles."

## Core Value

**The deferred Stripe model:** teachers publish a professional page and share it with zero financial commitment — payment setup is triggered only when a real parent with real money is waiting. This eliminates the single biggest drop-off in competing products (entering bank info before seeing any value).

## Requirements

All 59 MVP requirements are **Validated** — implemented in M001 and verified working in production in M002.
See `.gsd/REQUIREMENTS.md` for the full register with status and evidence.

### Candidate (not yet formal)

- **ONBOARD-08** — Onboarding wizard should prompt for teacher notification email (`social_email`). Teachers who skip Page settings after onboarding will silently miss booking notification emails. Recommend adding this prompt to step 1 or 2 of the onboarding wizard.

### Out of Scope

- Discovery/search directory — teachers share their own links at launch; search is Phase 2
- In-app messaging — teachers/parents communicate externally for MVP; Phase 2
- Session notes / progress tracking — post-session notes and skill tracking is Phase 2
- Recurring bookings — manual rebooking for MVP; automation is Phase 2
- Cancellation policy enforcement — handled informally at MVP
- School/district pages — Phase 2
- SEO city/subject landing pages — Phase 2
- Credential verification — self-reported at MVP; formal verification is Phase 2+
- Video conferencing — teachers use Zoom/Meet; not Tutelo's problem
- Group sessions, digital products, workshops — Phase 3
- Mobile app — web-first, mobile app later

## Context

**Founder background:** Former K-12 teacher, now full-time at LiveSchool (edtech). Building solo. 10-15 hrs/week available. Baby due July 2026 — MVP must be live and validated by end of June 2026. Uses Claude Code for maximum velocity.

**Distribution advantage:** The @eyes_on_meme Instagram audience — an existing, engaged teacher following. First 50-500 teachers at zero CAC. No competing product has this. First cohort = "Founding Teachers" with a badge on their page.

**Market gap:** Existing options are either exploitative marketplaces (Wyzant 18-33% commission, platform owns the client) or DIY chaos (Venmo + Google Cal + text messages). No product is designed for the exhausted classroom teacher doing 2-5 hours/week tutoring as a side hustle.

**Revenue model:** 7% platform fee on completed sessions (teacher pays). Stripe takes ~2.9% + $0.30. Total teacher cost ~10%. At $40/hr, teacher keeps ~$36. Far better than any marketplace alternative.

**Validation target (90 days post-launch):**
- 50+ teachers complete onboarding
- 25+ teachers receive ≥1 booking request
- 80%+ teachers connect Stripe after receiving a request
- 100+ completed paid sessions
- 30%+ repeat booking rate

## Constraints

- **Timeline:** MVP live by end of June 2026 — baby due July 2026; this is a hard deadline
- **Development capacity:** Solo build, 10-15 hrs/week, ~80-120 total hours budgeted
- **Tech stack:** Next.js + Tailwind (frontend), Supabase (DB + auth), Stripe Connect Express (payments), Vercel (hosting), Resend (email) — pre-decided, do not deviate
- **Budget:** Near-zero fixed cost. All chosen services are free at MVP scale. No paid infra until significant scale.
- **Auth:** Supabase Auth (Google SSO + email). No custom auth.
- **Payments:** Stripe Connect Express only. No custom payment logic.

## Current Status

**M002 complete — live in production at https://tutelo.app** (deployed March 11, completed March 12, 2026)

All milestones complete:
- **M001:** All 59 requirements implemented and validated (105 passing tests)
- **M002:** Production deployment — all flows verified on live URL; error boundaries in place

Current state:
- Stripe in **test mode** — switch to live keys before real payments go live
- Crons running **daily** (Vercel Hobby plan) — upgrade to Pro for hourly cadence
- Homepage (tutelo.app/) shows Next.js default page — needs a redirect or landing page before broad sharing
- Stripe Connect full roundtrip (account.updated webhook → DB update) not yet manually exercised
- `social_email` must be set for teacher booking notification emails to fire

See `LAUNCH.md` for full production environment documentation, upgrade checklist, and operational runbook.

### Known Limitations Before Broad Launch

1. **Homepage** — tutelo.app/ shows Next.js default starter page; add redirect to /login or a marketing page
2. **Stripe live mode** — currently test mode; requires switching `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and `STRIPE_SECRET_KEY` on Vercel
3. **Stripe Connect roundtrip** — button redirects correctly to Stripe Express onboarding; full test onboarding walkthrough (and `account.updated` webhook receipt verification) not yet completed by founder
4. **Notification email** — teachers who don't visit Page settings won't have `social_email` set; booking notifications silently skip in that case
5. **Cron frequency** — daily (Hobby plan); auto-cancel window effectively 48–72hr instead of 48hr; upgrade to Pro for tighter cadence
6. **React hydration mismatch (error #418)** — on public profile pages; likely timezone rendering server/client delta; cosmetic only

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Defer Stripe Connect to first booking request | Removes friction at lowest motivation point; adds it at highest (real parent waiting to pay) | ✅ Verified end-to-end on live URL |
| Booking request model before teacher connects Stripe | Parent submits request without payment; teacher activates payments in response to urgency | ✅ "money waiting" email triggers Stripe setup |
| No marketplace / discovery at MVP | Teachers bring their own students; platform professionalizes existing relationships, not new matchmaking | ✅ No discovery; teachers share /[slug] links |
| 7% platform fee (teacher-side only) | Below all major competitors; justified by full stack (page + booking + payments + trust layer) | ✅ application_fee_amount on all captures |
| Next.js + Supabase + Vercel | Full-stack JS, minimal ops overhead, generous free tiers, founder already knows React | ✅ Deployed — Next.js 16.1.6 + Supabase + Vercel |
| Vanity URL slug (tutelo.app/ms-johnson) | Shareable, professional, memorable — core to the "own your page" value prop | ✅ Auto-generated on onboarding |
| API route handlers not server actions for protected-layout actions | Next.js 16 server actions fail auth under dashboard layout during POST re-renders | ✅ connectStripe converted; pattern documented in DECISIONS.md |

---
*Last updated: 2026-03-12 after M002 completion*
