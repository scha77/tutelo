# M002: Production Launch

**Vision:** Tutelo is live on the internet — a real teacher can sign up, publish a page, and receive a booking request from a real parent, with all payment and notification infrastructure working in production.

## Success Criteria

- The app is deployed and accessible at a public URL (Vercel)
- Supabase remote project has all 6 migrations applied with RLS active
- Stripe webhooks are configured and verified with real signing secrets
- Email notifications are delivered to real email addresses via Resend
- A teacher can complete the full onboarding flow on the live URL
- No raw error messages or stack traces are visible to end users

## Key Risks / Unknowns

- Supabase remote migration application — migrations written for local may need adjustments
- Stripe webhook configuration — two endpoints, two secrets, easy to misconfigure
- Environment variable completeness — 10 vars across 4 services, any missing one breaks a feature silently

## Proof Strategy

- Migration risk → retire in S01 by successfully applying all 6 migrations to remote Supabase
- Webhook risk → retire in S02 by receiving a real Stripe event at the live endpoint
- Env var risk → retire in S01 by deploying and verifying no 500 errors on any route

## Verification Classes

- Contract verification: `npm run build` succeeds, Vercel deployment succeeds
- Integration verification: live auth flow, live booking creation, live webhook receipt, live email delivery
- Operational verification: cron jobs execute on schedule (visible in Vercel logs)
- UAT / human verification: teacher onboarding flow on live URL

## Milestone Definition of Done

This milestone is complete only when all are true:

- All 3 slices are complete
- The app is accessible at a public Vercel URL
- A real teacher signup → onboarding → publish flow works end-to-end
- A booking request creates a real DB record and sends a real email
- Stripe webhooks are verified (test mode event received and processed)
- No critical errors in Vercel deployment logs

## Requirement Coverage

- Covers: all 59 existing requirements (production deployment of already-validated code)
- Partially covers: none
- Leaves for later: custom domain, Supabase Pro upgrade, Vercel Pro upgrade, founding teacher recruitment
- Orphan risks: none

## Slices

- [x] **S01: Deploy & Configure** `risk:high` `depends:[]`
  > After this: The app is live on Vercel with Supabase, Stripe, and Resend configured. All routes load without errors.
- [x] **S02: Integration Verification** `risk:medium` `depends:[S01]`
  > After this: Auth, booking, Stripe webhooks, and email delivery are verified working on the live URL. Any broken integrations are fixed.
- [x] **S03: Production Hardening** `risk:low` `depends:[S02]`
  > After this: Error boundaries catch unexpected failures gracefully, environment is documented for the founder, and the app is ready for real teachers.

## Boundary Map

### S01 → S02

Produces:
- Live Vercel URL with all env vars configured
- Supabase remote project with all 6 migrations applied and RLS active
- Stripe webhook endpoints registered in Stripe Dashboard
- Resend domain verified and API key active

Consumes:
- nothing (first slice)

### S02 → S03

Produces:
- Verified auth flow (signup, login, session persistence)
- Verified booking flow (request creation, DB record, email sent)
- Verified Stripe webhook receipt (test event processed)
- List of any integration issues discovered and fixed

Consumes:
- Live Vercel deployment from S01
