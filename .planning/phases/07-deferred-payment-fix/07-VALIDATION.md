---
phase: 7
slug: deferred-payment-fix
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-11
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (existing) |
| **Config file** | `vitest.config.ts` (existing) |
| **Quick run command** | `npx vitest run tests/stripe/checkout-session.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/stripe/checkout-session.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | BOOK-02 | unit | `npx vitest run tests/stripe/checkout-session.test.ts` | ✅ | ⬜ pending |
| 07-01-02 | 01 | 1 | NOTIF-03 | unit | `npx vitest run tests/stripe/checkout-session.test.ts` | ✅ | ⬜ pending |
| 07-01-03 | 01 | 1 | STRIPE-04 | unit | `npx vitest run tests/stripe/auto-cancel.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

None — existing test infrastructure covers all phase requirements. `checkout-session.test.ts` already has the mock setup (mockCheckoutSessionsCreate, mockWebhooksConstructEvent, supabaseAdmin, email mocks). Phase 7 only needs implemented test bodies added to existing `it.todo()` stubs.

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| End-to-end: teacher accepts booking then connects Stripe — parent receives Checkout email | BOOK-02 | Requires live Stripe webhook delivery | Use Stripe CLI: `stripe trigger account.updated`, verify Checkout email sent to parent with `pending` booking |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
