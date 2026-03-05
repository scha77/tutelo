---
phase: 2
slug: booking-requests
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-05
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` (Wave 0 creates if missing) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 0 | BOOK-01 | unit | `npx vitest run src/__tests__/booking` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | BOOK-01 | unit | `npx vitest run src/__tests__/booking` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | BOOK-02 | unit | `npx vitest run src/__tests__/booking` | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 1 | BOOK-01 | manual | — | — | ⬜ pending |
| 02-02-01 | 02 | 1 | BOOK-03 | unit | `npx vitest run src/__tests__/booking-state` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | BOOK-04 | unit | `npx vitest run src/__tests__/booking-state` | ❌ W0 | ⬜ pending |
| 02-02-03 | 02 | 2 | DASH-02 | manual | — | — | ⬜ pending |
| 02-03-01 | 03 | 2 | NOTIF-01 | unit | `npx vitest run src/__tests__/email` | ❌ W0 | ⬜ pending |
| 02-03-02 | 03 | 2 | STRIPE-01 | unit | `npx vitest run src/__tests__/email` | ❌ W0 | ⬜ pending |
| 02-03-03 | 03 | 2 | STRIPE-02 | manual | — | — | ⬜ pending |
| 02-03-04 | 03 | 2 | BOOK-06 | unit | `npx vitest run src/__tests__/email` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/booking/create-booking.test.ts` — stubs for BOOK-01, BOOK-02 (atomic creation, no double-booking)
- [ ] `src/__tests__/booking-state/state-machine.test.ts` — stubs for BOOK-03, BOOK-04 (state transitions, accept/decline)
- [ ] `src/__tests__/email/money-waiting.test.ts` — stubs for NOTIF-01, STRIPE-01 (email trigger, first-request logic)
- [ ] `vitest.config.ts` — if not already present in project root
- [ ] Install `resend @react-email/components` — required for Plan 03

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Parent can select time slot on public page and see booking form | BOOK-01 | UI interaction, calendar state | Visit `/[slug]`, click available slot, verify form appears with correct date/time |
| Pending confirmation screen shown after submit | BOOK-02 | UI/UX flow | Submit booking form, verify confirmation UI with "pending" status |
| Teacher can accept/decline from dashboard | DASH-02 | Auth + UI flow | Log in as teacher, navigate to dashboard bookings, accept and decline pending requests |
| "Money waiting" email delivers to teacher inbox | STRIPE-01 | External email delivery | Submit booking as parent, check teacher email for "money waiting" message |
| Teacher without Stripe sees correct CTA | STRIPE-02 | UI conditional logic | View dashboard as teacher without `stripe_charges_enabled`, verify Stripe connect banner/CTA appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
