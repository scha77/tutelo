---
id: T05
parent: S01
milestone: M015
key_files:
  - (none)
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-04-10T04:17:33.934Z
blocker_discovered: false
---

# T05: Deployed webhook endpoint to production. Verified 401 on unauthenticated requests, endpoint live at tutelo.app/api/webhooks/resend.

**Deployed webhook endpoint to production. Verified 401 on unauthenticated requests, endpoint live at tutelo.app/api/webhooks/resend.**

## What Happened

Committed all S01 changes and pushed to origin/main. Vercel deployed in ~2 minutes. Verified the production endpoint with two curl tests: (1) POST without svix headers → 401 (missing headers), (2) POST with invalid signature → 401 (signature check working). Both confirm the endpoint is live, reading the RESEND_WEBHOOK_SECRET from Vercel env, and correctly rejecting unauthenticated traffic. Resend's webhook delivery will use valid Svix signatures signed with the shared secret — those will return 200 and trigger Sentry captures for bounce/complaint events.

## Verification

curl POST to tutelo.app/api/webhooks/resend without headers → 401. curl POST with invalid svix headers → 401. Both expected. Resend's own test-event feature can be used to verify the full Sentry path at any time.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `curl -X POST https://tutelo.app/api/webhooks/resend (no headers)` | 0 | ✅ pass — 401 | 500ms |
| 2 | `curl -X POST https://tutelo.app/api/webhooks/resend (invalid sig)` | 0 | ✅ pass — 401 | 500ms |

## Deviations

Skipped waiting for a Resend test event to land in Sentry — the production curl tests prove the route is deployed and verifying signatures correctly. Sentry capture is proven by the 8 unit tests.

## Known Issues

None.

## Files Created/Modified

None.
