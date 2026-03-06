---
phase: 3
slug: stripe-connect-deferred-payment
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/stripe/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/stripe/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 0 | STRIPE-03 | unit | `npx vitest run tests/stripe/connect-stripe.test.ts -x` | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 0 | STRIPE-05 | unit | `npx vitest run tests/stripe/checkout-session.test.ts -x` | ❌ W0 | ⬜ pending |
| 3-03-01 | 03 | 0 | STRIPE-06 | unit | `npx vitest run tests/stripe/mark-complete.test.ts -x` | ❌ W0 | ⬜ pending |
| 3-03-02 | 03 | 0 | STRIPE-07 | unit | `npx vitest run tests/stripe/mark-complete.test.ts -x` | ❌ W0 | ⬜ pending |
| 3-02-02 | 02 | 0 | STRIPE-04 | unit | `npx vitest run tests/stripe/auto-cancel.test.ts -x` | ❌ W0 | ⬜ pending |
| 3-02-03 | 02 | 0 | NOTIF-02 | unit | `npx vitest run tests/stripe/reminders-cron.test.ts -x` | ❌ W0 | ⬜ pending |
| 3-03-03 | 03 | 0 | NOTIF-03 | unit | `npx vitest run tests/stripe/email-confirmation.test.ts -x` | ❌ W0 | ⬜ pending |
| 3-03-04 | 03 | 0 | NOTIF-05 | unit | `npx vitest run tests/stripe/email-cancellation.test.ts -x` | ❌ W0 | ⬜ pending |
| 3-03-05 | 03 | 0 | NOTIF-06 | unit | `npx vitest run tests/stripe/email-complete.test.ts -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/stripe/connect-stripe.test.ts` — stubs for STRIPE-03: Server Action account + account link creation
- [ ] `tests/stripe/checkout-session.test.ts` — stubs for STRIPE-05: Checkout session with `capture_method: manual`
- [ ] `tests/stripe/mark-complete.test.ts` — stubs for STRIPE-06 + STRIPE-07: `paymentIntents.capture()` with `application_fee_amount`
- [ ] `tests/stripe/auto-cancel.test.ts` — stubs for STRIPE-04: cron idempotency + cancellation logic
- [ ] `tests/stripe/reminders-cron.test.ts` — stubs for NOTIF-02: 24hr/48hr reminder email trigger logic
- [ ] `tests/stripe/email-confirmation.test.ts` — stubs for NOTIF-03: dual-recipient booking confirmation email
- [ ] `tests/stripe/email-cancellation.test.ts` — stubs for NOTIF-05: cancellation email to both parties
- [ ] `tests/stripe/email-complete.test.ts` — stubs for NOTIF-06: session-complete email with review prompt

**Mocking pattern:** Use `vi.hoisted()` + class-based mock for `new Stripe()` constructor; `vi.mock('@/lib/supabase/service', ...)` for `supabaseAdmin`. Follow pattern in `tests/bookings/email.test.ts`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Stripe Express onboarding completes end-to-end (2–3 min) | STRIPE-03 | Requires live Stripe test credentials + browser | Use Stripe test mode, click Connect link in email, complete Express onboarding, verify `stripe_charges_enabled` flips to true in DB |
| Both webhook endpoints receive events with correct signing secrets | STRIPE-03 | Requires Stripe CLI or live webhooks | `stripe listen --forward-to localhost:3000/api/stripe/webhook` and `--forward-connected-to localhost:3000/api/stripe-connect/webhook` separately |
| Parent completes Stripe Checkout in browser | STRIPE-05 | Browser flow required | Use Stripe test card 4242 4242 4242 4242, verify PaymentIntent in `requires_capture` state |
| Vercel cron jobs fire at correct UTC intervals | STRIPE-04, NOTIF-02 | Requires Vercel Pro deployment | Verify via Vercel dashboard cron logs after deploying with Pro plan |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
