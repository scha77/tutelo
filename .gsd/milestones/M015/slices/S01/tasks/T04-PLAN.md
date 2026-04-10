---
estimated_steps: 8
estimated_files: 1
skills_used: []
---

# T04: Collect RESEND_WEBHOOK_SECRET and register webhook in Resend dashboard

User needs to:
1. Go to Resend dashboard → Webhooks → Add Endpoint
2. URL: https://tutelo.app/api/webhooks/resend
3. Select events: email.delivered, email.bounced, email.complained, email.delivery_delayed
4. Copy the signing secret (starts with `whsec_`)

Agent then:
1. Use secure_env_collect to write RESEND_WEBHOOK_SECRET to both .env.local and Vercel production
2. Verify env var is set in both environments

## Inputs

- None specified.

## Expected Output

- `RESEND_WEBHOOK_SECRET in .env.local`
- `RESEND_WEBHOOK_SECRET in Vercel production`

## Verification

grep -q '^RESEND_WEBHOOK_SECRET=' .env.local && vercel env ls production 2>&1 | grep -q RESEND_WEBHOOK_SECRET
