# M015: Pre-Launch Hardening

## Vision
Close the remaining launch gaps before MVP goes live: tighten email deliverability with DMARC and bounce/complaint tracking, confirm cron jobs are actually running in production, protect public endpoints from abuse, and lock down the critical booking flow behind an automated end-to-end test.

## Slice Overview
| ID | Slice | Risk | Depends | Done | After this |
|----|-------|------|---------|------|------------|
| S01 | DMARC + Resend Webhook Observability | low | — | ⬜ | After this: `dig TXT _dmarc.tutelo.app` returns a valid DMARC record; Resend sends bounce/complaint events to a new /api/webhooks/resend endpoint; test events land in Sentry with tags. |
| S02 | Cron Job Verification & Monitoring | medium | — | ⬜ | After this: Each cron route (session-reminders, auto-cancel, stripe-reminders, recurring-charges) has been verified as scheduled in Vercel, manually triggered once with a 200 response in logs, and has an explicit heartbeat mechanism so future silent failures are detectable. |
| S03 | Rate Limiting Primitive | medium | — | ⬜ | After this: A rate-limiting helper is available at `src/lib/rate-limit.ts` backed by a distributed store. Calling `checkLimit(ip, 'endpoint-key', { max: 10, window: '1m' })` returns allowed/blocked. |
| S04 | Wire Rate Limits to Public Endpoints | low | S03 | ⬜ | After this: Burst traffic against /api/waitlist, /api/track-view, /api/verify-email, and the login action returns 429 after hitting the limit. Legitimate requests still work. |
| S05 | End-to-End Booking Flow Test | medium | S04 | ⬜ | After this: `npx playwright test booking-e2e` signs up a test parent, navigates to a seeded test teacher profile, books a session, completes Stripe test card payment, verifies the booking email arrived in a test inbox, cancels the booking, and verifies the cancellation email arrived. All green. |
