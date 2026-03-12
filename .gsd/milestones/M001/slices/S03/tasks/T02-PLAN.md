# T02: 03-stripe-connect-deferred-payment 02

**Slice:** S03 — **Milestone:** M001

## Description

Implement the full deferred payment flow: when a teacher activates Stripe, create Checkout sessions for all waiting bookings and email parents; wire checkout.session.completed to confirm bookings; add 48hr auto-cancel cron and 24hr/48hr follow-up email cron; create FollowUpEmail and UrgentFollowUpEmail templates.

Purpose: This is the core revenue mechanism. Without it, teachers connecting Stripe produces no result for waiting parents, and unresolved requests stack up forever.

Output: DB migration, complete platform webhook handlers, two cron routes, two email templates, vercel.json, test scaffolds.

## Must-Haves

- [ ] "When account.updated fires with charges_enabled: true, Stripe Checkout sessions are created for ALL requested bookings for that teacher, and each parent is emailed their checkout URL"
- [ ] "When a parent completes Stripe Checkout, the booking status moves from requested to confirmed and the stripe_payment_intent is stored"
- [ ] "The auto-cancel cron at /api/cron/auto-cancel cancels requested bookings older than 48hr if the teacher still has stripe_charges_enabled = false"
- [ ] "The reminders cron at /api/cron/stripe-reminders sends a 24hr gentle email and a 48hr urgent email to teachers with requested bookings and no Stripe connection"
- [ ] "Both cron routes are protected by CRON_SECRET and are idempotent (running twice does not double-cancel or double-email)"
- [ ] "vercel.json has both cron jobs scheduled hourly (requires Vercel Pro)"

## Files

- `supabase/migrations/0004_stripe_checkout_url.sql`
- `src/app/api/stripe/webhook/route.ts`
- `src/app/api/cron/auto-cancel/route.ts`
- `src/app/api/cron/stripe-reminders/route.ts`
- `src/lib/email.ts`
- `src/emails/FollowUpEmail.tsx`
- `src/emails/UrgentFollowUpEmail.tsx`
- `vercel.json`
- `tests/stripe/checkout-session.test.ts`
- `tests/stripe/auto-cancel.test.ts`
- `tests/stripe/reminders-cron.test.ts`
