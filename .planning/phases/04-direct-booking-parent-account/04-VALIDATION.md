---
phase: 4
slug: direct-booking-parent-account
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-07
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (existing) |
| **Config file** | `vitest.config.ts` (or `package.json` scripts) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 1 | BOOK-05 | unit | `npx vitest run --reporter=verbose src/__tests__/booking-routing.test.ts` | ❌ W0 | ⬜ pending |
| 4-01-02 | 01 | 1 | BOOK-05 | unit | `npx vitest run --reporter=verbose src/__tests__/booking-routing.test.ts` | ❌ W0 | ⬜ pending |
| 4-01-03 | 01 | 2 | BOOK-05 | unit | `npx vitest run --reporter=verbose src/__tests__/payment-intent.test.ts` | ❌ W0 | ⬜ pending |
| 4-01-04 | 01 | 2 | BOOK-05 | manual | n/a — Stripe Elements rendering | n/a | ⬜ pending |
| 4-01-05 | 01 | 2 | BOOK-05 | unit | `npx vitest run --reporter=verbose src/__tests__/webhook-capture.test.ts` | ❌ W0 | ⬜ pending |
| 4-02-01 | 02 | 1 | PARENT-01 | unit | `npx vitest run --reporter=verbose src/__tests__/parent-auth.test.ts` | ❌ W0 | ⬜ pending |
| 4-02-02 | 02 | 1 | PARENT-02 | unit | `npx vitest run --reporter=verbose src/__tests__/parent-account.test.ts` | ❌ W0 | ⬜ pending |
| 4-02-03 | 02 | 1 | PARENT-03 | unit | `npx vitest run --reporter=verbose src/__tests__/rebook.test.ts` | ❌ W0 | ⬜ pending |
| 4-02-04 | 02 | 2 | NOTIF-04 | unit | `npx vitest run --reporter=verbose src/__tests__/reminders.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/booking-routing.test.ts` — stubs for BOOK-05 conditional routing logic
- [ ] `src/__tests__/payment-intent.test.ts` — stubs for PaymentIntent creation/capture API
- [ ] `src/__tests__/webhook-capture.test.ts` — stubs for `payment_intent.amount_capturable_updated` webhook handler
- [ ] `src/__tests__/parent-auth.test.ts` — stubs for PARENT-01 inline auth step logic
- [ ] `src/__tests__/parent-account.test.ts` — stubs for PARENT-02 session list queries
- [ ] `src/__tests__/rebook.test.ts` — stubs for PARENT-03 rebook URL param pre-fill
- [ ] `src/__tests__/reminders.test.ts` — stubs for NOTIF-04 nightly cron idempotency

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Stripe Elements card UI renders inline in BookingCalendar | BOOK-05 | Requires real Stripe.js browser load | Visit teacher page, select slot, complete form and auth, verify card field appears |
| Google OAuth sign-in during booking | PARENT-01 | OAuth flow requires browser redirect | Click "Continue with Google" in auth step, verify return after OAuth |
| Payment confirmation inline success state | BOOK-05 | Stripe test card required | Use Stripe test card 4242 4242 4242 4242, verify success state renders without redirect |
| 24hr reminder email delivery | NOTIF-04 | Email delivery requires live Resend | Trigger cron manually, verify email received in inbox |
| Parent `/account` session list | PARENT-02 | Requires real Supabase session | Log in as parent, verify upcoming and past sessions display correctly |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
