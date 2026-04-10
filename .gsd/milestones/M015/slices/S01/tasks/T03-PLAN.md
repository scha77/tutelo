---
estimated_steps: 11
estimated_files: 1
skills_used: []
---

# T03: Write integration test for webhook handler

Write a Vitest test that exercises the full handler path with a realistic Resend webhook payload. Use the real Svix `Webhook.sign` to generate a valid signature for a test payload, then call the route handler with it.

Steps:
1. Create `src/__tests__/resend-webhook.test.ts`
2. Mock `@sentry/nextjs` captureMessage
3. Test cases:
   - Valid signature + `email.bounced` → 200, Sentry captureMessage called once with level:warning and email_event tag
   - Valid signature + `email.complained` → 200, Sentry capture called with email_event:complained
   - Valid signature + `email.delivered` → 200, Sentry NOT called (too noisy)
   - Invalid signature → 401, Sentry not called
   - Missing svix headers → 401
   - Malformed JSON → 400 or 401 (whatever Svix throws)

## Inputs

- `src/lib/webhooks/resend.ts`
- `src/app/api/webhooks/resend/route.ts`

## Expected Output

- `src/__tests__/resend-webhook.test.ts passing all assertions`

## Verification

npx vitest run src/__tests__/resend-webhook.test.ts
