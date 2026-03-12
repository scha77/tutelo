# T01: 03-stripe-connect-deferred-payment 01

**Slice:** S03 — **Milestone:** M001

## Description

Install the Stripe SDK, build the /dashboard/connect-stripe page with a single "Connect with Stripe" Server Action, and wire both webhook endpoints (platform + connected-account).

Purpose: Establishes the Stripe infrastructure backbone. The connect page is the destination teachers land on from the "money waiting" email CTA. The platform webhook is where all Stripe events arrive — account activation, payment completion.

Output: Working connect page, connectStripe Server Action, two webhook route handlers, test scaffold.

## Must-Haves

- [ ] "Teacher can visit /dashboard/connect-stripe and click a button that redirects them to Stripe Express onboarding"
- [ ] "If teacher already has stripe_charges_enabled = true, visiting /dashboard/connect-stripe redirects immediately to /dashboard"
- [ ] "Platform webhook at /api/stripe/webhook verifies Stripe signatures and handles account.updated events"
- [ ] "Connected-account webhook at /api/stripe-connect/webhook exists with its own signing secret (stub for now)"
- [ ] "When account.updated fires with charges_enabled: true, teachers.stripe_charges_enabled is set to true in DB"
- [ ] "connectStripe Server Action creates a Stripe Express account (if none exists) and generates a one-time account link"

## Files

- `package.json`
- `src/app/(dashboard)/dashboard/connect-stripe/page.tsx`
- `src/actions/stripe.ts`
- `src/app/api/stripe/webhook/route.ts`
- `src/app/api/stripe-connect/webhook/route.ts`
- `tests/stripe/connect-stripe.test.ts`
