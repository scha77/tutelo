# GSD State

**Active Milestone:** None
**Active Slice:** None
**Phase:** idle
**Requirements Status:** 0 active · 59 validated · 0 deferred · 0 out of scope

## Milestone Registry
- ✅ **M001:** Migration (all 59 requirements implemented and validated; 105 passing tests)
- ✅ **M002:** Production Launch (deployed to https://tutelo.app; all flows verified on live URL)

## Recent Decisions
- API route handlers required for protected-layout actions in Next.js 16 (connectStripe pattern)
- getUser() is correct auth primitive for all verified identity checks; getClaims() unreliable on POST re-renders
- Daily cron frequency for Vercel Hobby plan (vs hourly planned)

## Blockers
- None

## Known Pending Items
- Homepage (tutelo.app/) shows Next.js default — needs redirect or landing page before broad sharing
- Stripe in test mode — switch to live keys before real payments
- Stripe Connect full roundtrip (account.updated → DB update) not yet manually exercised by founder
- social_email must be set for teacher booking notification emails to fire
- Cron frequency daily (Hobby) — upgrade to Pro for hourly auto-cancel precision
- React hydration mismatch (error #418) on public profile pages — cosmetic, investigate before high traffic

## Next Action
M002 complete. App is live and production-ready. Next milestone should address:
1. Switch Stripe to live mode (after founder completes test onboarding walkthrough)
2. Fix homepage (tutelo.app/ marketing page or /login redirect)
3. Founder teacher recruitment and validation (90-day clock)
4. ONBOARD-08 candidate: prompt for social_email in onboarding wizard
