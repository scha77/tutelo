---
estimated_steps: 12
estimated_files: 3
skills_used: []
---

# T02: Install and wire Svix webhook verification

Resend webhooks are signed with Svix. Install the `svix` package, create a verification helper, and build the /api/webhooks/resend route.

Steps:
1. `npm install svix`
2. Create `src/lib/webhooks/resend.ts` with a `verifyResendWebhook(headers, body, secret)` function that uses Svix's `Webhook` class
3. Create `src/app/api/webhooks/resend/route.ts` with POST handler:
   - Reads raw body via `request.text()`
   - Extracts `svix-id`, `svix-timestamp`, `svix-signature` headers
   - Calls verifier (returns the parsed event or throws)
   - On invalid signature → 401
   - On valid: switch on `event.type`, call `Sentry.captureMessage` for bounces/complaints with tags
   - Returns 200 OK
4. Handler must use Node runtime (not edge) because Svix requires Buffer

## Inputs

- `Resend webhook docs: https://resend.com/docs/dashboard/webhooks/introduction`
- `Svix webhook verification docs`

## Expected Output

- `src/lib/webhooks/resend.ts with verifyResendWebhook helper`
- `src/app/api/webhooks/resend/route.ts with POST handler`
- `svix added to dependencies`

## Verification

npx tsc --noEmit && npx vitest run src/__tests__/resend-webhook.test.ts
