# M002: Production Launch — Context

**Gathered:** 2026-03-11
**Status:** Ready for planning

## Project Description

Tutelo is a complete MVP tutoring platform built in M001. The code is done — 95 source files, 105 passing tests, all 59 requirements validated. But it's running on localhost. This milestone gets it live on the internet so real teachers can use it.

## Why This Milestone

The hard deadline is end of June 2026 (baby due July). The 90-day validation clock hasn't started because the app isn't deployed. Every day the app sits on localhost is a day lost from the validation window. The code risk is retired — the deployment and real-world risk is not.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Visit tutelo.app (or staging URL) in a browser and see the live application
- A real teacher can sign up, complete onboarding, and publish a live landing page
- A real parent can submit a booking request from that landing page
- Stripe Connect and all payment flows work with real (test-mode) credentials
- Email notifications are delivered via Resend to real email addresses
- Cron jobs (auto-cancel, reminders) run on schedule in production

### Entry point / environment

- Entry point: https://tutelo.app (or Vercel preview URL)
- Environment: Vercel production
- Live dependencies: Supabase (hosted), Stripe Connect, Resend, Vercel Cron

## Completion Class

- Contract complete means: build succeeds on Vercel, all routes accessible, no 500 errors
- Integration complete means: auth flow works, booking creates DB records, Stripe webhooks fire, emails send
- Operational complete means: cron jobs execute on schedule, webhooks are verified with real signing secrets

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- A teacher can sign up via the live URL, complete onboarding, and their public page is accessible at /[slug]
- A parent can submit a booking request and the teacher receives a real email notification
- Stripe Connect onboarding link works (test mode)
- The application handles errors gracefully (no raw stack traces shown to users)

## Risks and Unknowns

- **Supabase remote schema sync** — local migrations may need adjustment for remote apply. Medium risk.
- **Stripe webhook URL configuration** — webhooks must point to the live Vercel URL with correct signing secrets. Configuration-only but easy to misconfigure.
- **Vercel Pro requirement** — cron jobs need Vercel Pro ($20/mo). Without it, auto-cancel and reminders won't run.
- **Domain/DNS** — tutelo.app domain may not be purchased yet. Can launch on Vercel's default URL first.
- **Supabase free tier pausing** — must upgrade to Pro before real users arrive. Can defer until founding teachers are being onboarded.

## Existing Codebase / Prior Art

- `vercel.json` — already has cron configuration for 3 endpoints
- `supabase/migrations/` — 6 migration files ready to apply
- `next.config.ts` — standard Next.js config, no special Vercel settings needed
- `.env.local` — has all 10 required env var keys defined

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions.

## Relevant Requirements

All 59 requirements are already validated in code. This milestone is about making them work in production, not implementing new features.

## Scope

### In Scope

- Vercel project setup and first deployment
- Supabase remote project creation and migration application
- Stripe account configuration (test mode — webhook endpoints, Connect settings)
- Resend domain verification and API key provisioning
- Environment variable configuration on Vercel
- Smoke test of critical flows on the live URL
- Basic error handling audit (no raw errors shown to users)

### Out of Scope / Non-Goals

- Custom domain (tutelo.app) purchase and DNS — can use Vercel default URL initially
- Supabase Pro or Vercel Pro upgrades — document as requirements, user decides timing
- Founding teacher recruitment — that's a GTM activity, not a technical milestone
- Performance optimization, SEO, analytics — post-launch
- Mobile responsive fixes — post-launch
- Filling in remaining 45 test todo stubs — tech debt, not launch-blocking

## Technical Constraints

- 10 environment variables must be configured on Vercel
- Stripe requires 2 separate webhook endpoints with 2 separate signing secrets
- Supabase Storage bucket (profile-images) must be created manually via Dashboard
- Cron endpoints require CRON_SECRET for authentication

## Integration Points

- **Vercel** — hosting, cron jobs, environment variables
- **Supabase** — database, auth, storage (remote project)
- **Stripe** — Connect Express, webhooks (test mode initially)
- **Resend** — transactional email delivery

## Open Questions

- Does the user already have a Vercel account? — Will discover during S01
- Does the user already have a Stripe account? — Will discover during S01
- Does the user want to go straight to production or use a staging environment first? — Default to production with Stripe test mode
