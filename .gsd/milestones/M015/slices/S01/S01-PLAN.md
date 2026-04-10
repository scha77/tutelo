# S01: DMARC + Resend Webhook Observability

**Goal:** Close the email observability gap: DMARC monitoring record live on tutelo.app, Resend webhook endpoint wired to capture bounces/complaints/delivered events into Sentry with proper signature verification.
**Demo:** After this: After this: `dig TXT _dmarc.tutelo.app` returns a valid DMARC record; Resend sends bounce/complaint events to a new /api/webhooks/resend endpoint; test events land in Sentry with tags.

## Tasks
- [x] **T01: DMARC monitoring record live on _dmarc.tutelo.app via Vercel DNS, resolves in &lt;5s.** — Add the DMARC monitoring record to `_dmarc.tutelo.app` via the Vercel CLI. Start in p=none (monitor only) to avoid accidentally quarantining legitimate email. Include `fo=1` to receive reports on any authentication failure.

Steps:
1. Run `vercel dns add tutelo.app _dmarc TXT 'v=DMARC1; p=none; rua=mailto:soosup.cha@gmail.com; fo=1'`
2. Verify with `dig +short TXT _dmarc.tutelo.app` (wait up to 60s for propagation)
3. Verify Vercel sees the record with `vercel dns ls tutelo.app`
  - Estimate: 5 min
  - Verify: dig +short TXT _dmarc.tutelo.app | grep -q 'v=DMARC1; p=none'
- [x] **T02: Built Resend webhook endpoint with Svix signature verification and Sentry alerting for bounces/complaints.** — Resend webhooks are signed with Svix. Install the `svix` package, create a verification helper, and build the /api/webhooks/resend route.

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
  - Estimate: 30 min
  - Files: src/lib/webhooks/resend.ts, src/app/api/webhooks/resend/route.ts, package.json
  - Verify: npx tsc --noEmit && npx vitest run src/__tests__/resend-webhook.test.ts
- [x] **T03: 8 integration tests cover all webhook handler paths: valid/invalid signatures, bounce/complaint/delay alerting, delivered/opened silence, missing secret.** — Write a Vitest test that exercises the full handler path with a realistic Resend webhook payload. Use the real Svix `Webhook.sign` to generate a valid signature for a test payload, then call the route handler with it.

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
  - Estimate: 20 min
  - Files: src/__tests__/resend-webhook.test.ts
  - Verify: npx vitest run src/__tests__/resend-webhook.test.ts
- [x] **T04: RESEND_WEBHOOK_SECRET applied to .env.local and Vercel production.** — User needs to:
1. Go to Resend dashboard → Webhooks → Add Endpoint
2. URL: https://tutelo.app/api/webhooks/resend
3. Select events: email.delivered, email.bounced, email.complained, email.delivery_delayed
4. Copy the signing secret (starts with `whsec_`)

Agent then:
1. Use secure_env_collect to write RESEND_WEBHOOK_SECRET to both .env.local and Vercel production
2. Verify env var is set in both environments
  - Estimate: 5 min
  - Files: .env.local
  - Verify: grep -q '^RESEND_WEBHOOK_SECRET=' .env.local && vercel env ls production 2>&1 | grep -q RESEND_WEBHOOK_SECRET
- [ ] **T05: Deploy, trigger Resend test event, verify Sentry capture** — Push the new route to production and verify end-to-end.

Steps:
1. Commit T01-T04 changes with a clear message
2. `git push origin main` — Vercel auto-deploys
3. Wait for deploy ready (vercel ls polling)
4. In Resend dashboard → Webhooks → (our endpoint) → click "Send test event" for `email.bounced`
5. Curl the Sentry Issues feed or check in-browser for the captured event
6. Also verify via curl with a real signature that the endpoint returns 200
  - Estimate: 15 min
  - Verify: curl -sI https://tutelo.app/api/webhooks/resend returns 401 without signature; Sentry receives test bounce event within 30s of Resend test trigger
