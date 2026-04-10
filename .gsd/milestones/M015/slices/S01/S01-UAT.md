# S01: DMARC + Resend Webhook Observability — UAT

**Milestone:** M015
**Written:** 2026-04-10T04:17:58.344Z

## S01 UAT: DMARC + Resend Webhook Observability

### Test 1: DMARC record
- [ ] Run `dig +short TXT _dmarc.tutelo.app`
- [ ] Verify output contains `v=DMARC1; p=none; rua=mailto:soosup.cha@gmail.com; fo=1`

### Test 2: Webhook endpoint security
- [ ] POST to `https://tutelo.app/api/webhooks/resend` without headers → 401
- [ ] POST with invalid svix-signature → 401

### Test 3: Resend test event
- [ ] In Resend dashboard → Webhooks → Send test event (email.bounced)
- [ ] Verify event appears in Sentry Issues feed within 60s with `email_event: bounced` tag

### Test 4: Non-alert events
- [ ] Resend test event for `email.delivered` → endpoint returns 200, NO new Sentry issue
