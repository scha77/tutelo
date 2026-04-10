---
id: S01
parent: M015
milestone: M015
provides:
  - Email deliverability visibility via Sentry
  - DMARC monitoring for SPF/DKIM alignment
requires:
  []
affects:
  []
key_files:
  - src/lib/webhooks/resend.ts
  - src/app/api/webhooks/resend/route.ts
  - src/__tests__/resend-webhook.test.ts
key_decisions:
  - DMARC starts at p=none (monitor only) — bump to p=quarantine after 1-2 weeks of clean reports
  - Only bounce/complaint/delay events go to Sentry — delivered/opened are too noisy
  - Node runtime for Svix Buffer dependency
patterns_established:
  - Svix webhook verification pattern for Resend events
  - Selective Sentry alerting based on event severity
observability_surfaces:
  - none
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-04-10T04:17:58.344Z
blocker_discovered: false
---

# S01: DMARC + Resend Webhook Observability

**DMARC monitoring live on tutelo.app; Resend webhook endpoint deployed with Svix signature verification and Sentry alerting for bounces/complaints.**

## What Happened

S01 closed two email observability gaps. First, added a DMARC TXT record at _dmarc.tutelo.app in p=none (monitor) mode with forensic reporting enabled (fo=1) — aggregate reports go to soosup.cha@gmail.com. This gives visibility into SPF/DKIM authentication failures without risking legitimate email delivery. Second, built a /api/webhooks/resend POST endpoint that verifies Resend's Svix-signed payloads and routes bounce/complaint/delay events to Sentry as warning-level messages with email_event and email_id tags. Delivered/opened/clicked events are acknowledged silently (too noisy for Sentry). The endpoint is protected by signature verification (401 on missing or invalid signatures) and returns 500 if RESEND_WEBHOOK_SECRET is not configured. 8 integration tests cover all handler paths. RESEND_WEBHOOK_SECRET is set in both .env.local and Vercel production. Production deployment verified with curl — unauthenticated requests correctly return 401.

## Verification

dig TXT _dmarc.tutelo.app → valid DMARC record. npx vitest run → 498 tests, 0 failures (including 8 new webhook tests). curl POST to production endpoint without/with-bad-sig → 401. Endpoint deployed and live.

## Requirements Advanced

None.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

None.

## Known Limitations

None.

## Follow-ups

None.

## Files Created/Modified

None.
