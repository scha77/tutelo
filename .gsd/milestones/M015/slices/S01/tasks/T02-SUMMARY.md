---
id: T02
parent: S01
milestone: M015
key_files:
  - src/lib/webhooks/resend.ts
  - src/app/api/webhooks/resend/route.ts
  - package.json
key_decisions:
  - Only bounce/complaint/delay events go to Sentry — delivered/opened are too noisy
  - Node runtime required for Svix Buffer dependency
duration: 
verification_result: untested
completed_at: 2026-04-10T04:05:49.975Z
blocker_discovered: false
---

# T02: Built Resend webhook endpoint with Svix signature verification and Sentry alerting for bounces/complaints.

**Built Resend webhook endpoint with Svix signature verification and Sentry alerting for bounces/complaints.**

## What Happened

Installed `svix` package. Created `src/lib/webhooks/resend.ts` with `verifyResendWebhook()` that wraps Svix's `Webhook.verify()` with typed Resend event payloads. Built `src/app/api/webhooks/resend/route.ts` as a POST handler that: reads raw body, extracts svix-id/timestamp/signature headers, verifies signature, and dispatches to Sentry for alert-worthy events (bounced, complained, delivery_delayed). Delivered/opened/clicked events are acknowledged with 200 but NOT sent to Sentry (too noisy). Node runtime forced for Buffer compatibility.

## Verification

npx tsc --noEmit passes clean. Route handler tests deferred to T03.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| — | No verification commands discovered | — | — | — |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/lib/webhooks/resend.ts`
- `src/app/api/webhooks/resend/route.ts`
- `package.json`
