---
estimated_steps: 8
estimated_files: 1
skills_used: []
---

# T05: Deploy, trigger Resend test event, verify Sentry capture

Push the new route to production and verify end-to-end.

Steps:
1. Commit T01-T04 changes with a clear message
2. `git push origin main` — Vercel auto-deploys
3. Wait for deploy ready (vercel ls polling)
4. In Resend dashboard → Webhooks → (our endpoint) → click "Send test event" for `email.bounced`
5. Curl the Sentry Issues feed or check in-browser for the captured event
6. Also verify via curl with a real signature that the endpoint returns 200

## Inputs

- None specified.

## Expected Output

- `M015/S01 end-to-end verified in production`

## Verification

curl -sI https://tutelo.app/api/webhooks/resend returns 401 without signature; Sentry receives test bounce event within 30s of Resend test trigger
