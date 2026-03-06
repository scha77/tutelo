---
phase: 03-stripe-connect-deferred-payment
plan: "01"
subsystem: stripe-connect
tags: [stripe, webhooks, server-action, connect]
dependency_graph:
  requires: [02-03-email, 01-01-auth]
  provides: [stripe-connect-page, connectStripe-action, platform-webhook, connect-webhook-stub]
  affects: [teachers-table, booking-flow]
tech_stack:
  added: [stripe@20.x]
  patterns: [server-action-redirect, req.text-webhook, supabaseAdmin-service-role, express-connect-account]
key_files:
  created:
    - tests/stripe/connect-stripe.test.ts
    - src/actions/stripe.ts
    - src/app/(dashboard)/dashboard/connect-stripe/page.tsx
    - src/app/api/stripe/webhook/route.ts
    - src/app/api/stripe-connect/webhook/route.ts
  modified:
    - package.json
key_decisions:
  - "connectStripe action returns Promise<void> (not Promise<{error}|never>) — form action type contract; unauthenticated/not-found cases redirect('/login') instead of returning error objects"
  - "Idempotency guard in account.updated handler: checks !stripe_charges_enabled before update to prevent duplicate Checkout session creation on repeated webhook delivery"
  - "connect-stripe page has dual guard: server-side redirect at page load (instant, no button press) + Server Action guard (for direct form submission)"
metrics:
  duration: 3 min
  completed_date: "2026-03-06"
  tasks_completed: 3
  files_created: 5
  files_modified: 1
requirements_satisfied: [STRIPE-03]
---

# Phase 3 Plan 01: Stripe Connect Infrastructure Summary

Stripe SDK installed, connect page built, connectStripe Server Action wired, and both webhook endpoints scaffolded.

## What Was Built

**Stripe Connect page (`/dashboard/connect-stripe`):** Teacher-facing page with a brief value prop and a single "Connect with Stripe" button. Stripe brand color (#635BFF) used per branding guidelines. Server-side guard: if `stripe_charges_enabled = true`, page redirects to `/dashboard` without rendering. This is the destination teachers land on from the "money waiting" email CTA.

**connectStripe Server Action (`src/actions/stripe.ts`):** Creates a Stripe Express account (if none exists), saves `stripe_account_id` to the teachers table, generates a one-time account link, and redirects the teacher to Stripe onboarding. Account links are generated fresh on each request (single-use requirement). Uses `createClient()` (authenticated — teacher must be logged in).

**Platform webhook (`/api/stripe/webhook`):** Handles `account.updated` — when `charges_enabled: true`, updates `teachers.stripe_charges_enabled = true` via `supabaseAdmin` (service role, no user session). Idempotency guard prevents duplicate processing. Stubs `checkout.session.completed` for Plan 02. Uses `req.text()` as the very first line — critical for Stripe signature verification.

**Connected-account webhook stub (`/api/stripe-connect/webhook`):** Exists with its own signing secret (`STRIPE_CONNECT_WEBHOOK_SECRET`). Verifies signatures, returns 200. Future home for payout/dispute events.

**Test scaffold (`tests/stripe/connect-stripe.test.ts`):** 4 `it.todo()` stubs with full mock infrastructure: `vi.hoisted()` + class-based `MockStripe` constructor, `@/lib/supabase/server` mock, `next/navigation` redirect mock. Passes green (todos, no failures).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] connectStripe return type adjusted for form action compatibility**

- **Found during:** Task 2
- **Issue:** Plan specified `Promise<{ error: string } | never>` return type, but TypeScript's form `action` prop type requires `(formData: FormData) => void | Promise<void>`. This caused a TS2322 type error.
- **Fix:** Changed return type to `Promise<void>`. Unauthenticated/not-found cases now `redirect('/login')` instead of returning error objects. This is semantically correct for a form action — redirect is the right UX response to auth failures.
- **Files modified:** `src/actions/stripe.ts`
- **Commit:** 96586ef

## Required Environment Variables

These must be added to Vercel before this feature works in production:

| Variable | Where to get it |
|----------|----------------|
| `STRIPE_SECRET_KEY` | Stripe Dashboard > Developers > API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard > Developers > Webhooks (platform endpoint `/api/stripe/webhook`) |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | Stripe Dashboard > Developers > Webhooks (connect endpoint `/api/stripe-connect/webhook`) |

## Self-Check

Files created:
- [x] tests/stripe/connect-stripe.test.ts — FOUND
- [x] src/actions/stripe.ts — FOUND
- [x] src/app/(dashboard)/dashboard/connect-stripe/page.tsx — FOUND
- [x] src/app/api/stripe/webhook/route.ts — FOUND
- [x] src/app/api/stripe-connect/webhook/route.ts — FOUND

Commits:
- [x] da2e13e — test(03-01): test scaffold
- [x] 96586ef — feat(03-01): Stripe SDK + action + page
- [x] a8b797f — feat(03-01): webhooks

TypeScript: PASS (zero errors)
Tests: PASS (4 todos, 0 failures)

## Self-Check: PASSED
