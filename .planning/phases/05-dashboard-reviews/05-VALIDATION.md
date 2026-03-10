---
phase: 5
slug: dashboard-reviews
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose 2>&1 \| tail -20` |
| **Full suite command** | `npx vitest run 2>&1 \| tail -30` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose 2>&1 | tail -20`
- **After every plan wave:** Run `npx vitest run 2>&1 | tail -30`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 5-01-01 | 01 | 0 | DASH-01 | unit | `npx vitest run src/app/(dashboard)/dashboard/page.test.tsx` | ❌ W0 | ⬜ pending |
| 5-01-02 | 01 | 1 | DASH-03 | unit | `npx vitest run src/app/(dashboard)/dashboard/page.test.tsx` | ❌ W0 | ⬜ pending |
| 5-01-03 | 01 | 1 | DASH-04 | unit | `npx vitest run src/app/(dashboard)/dashboard/page.test.tsx` | ❌ W0 | ⬜ pending |
| 5-01-04 | 01 | 1 | DASH-01 | unit | `npx vitest run src/app/(dashboard)/dashboard/page.test.tsx` | ❌ W0 | ⬜ pending |
| 5-02-01 | 02 | 0 | DASH-05 | unit | `npx vitest run src/app/(dashboard)/dashboard/requests/page.test.tsx` | ❌ W0 | ⬜ pending |
| 5-02-02 | 02 | 1 | REVIEW-01 | unit | `npx vitest run src/app/review/page.test.tsx` | ❌ W0 | ⬜ pending |
| 5-02-03 | 02 | 1 | REVIEW-02 | unit | `npx vitest run src/app/review/page.test.tsx` | ❌ W0 | ⬜ pending |
| 5-02-04 | 02 | 2 | REVIEW-03 | unit | `npx vitest run src/app/(public)/[slug]/page.test.tsx` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/app/(dashboard)/dashboard/page.test.tsx` — stubs for DASH-01, DASH-03, DASH-04 (dashboard renders with session list, earnings, student list)
- [ ] `src/app/(dashboard)/dashboard/requests/page.test.tsx` — stubs for DASH-05 (mark-complete action)
- [ ] `src/app/review/page.test.tsx` — stubs for REVIEW-01, REVIEW-02 (review form renders, submit action)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Review prompt email delivered after mark-complete | REVIEW-01 | Email delivery requires Resend integration; no email mock in test suite | Trigger mark-complete, check Resend dashboard / test inbox for email with correct review link |
| Review link resolves and pre-fills token | REVIEW-02 | End-to-end URL token flow across server/client | Follow email link, verify form loads with correct booking data |
| Reviews visible on public profile | REVIEW-03 | Depends on live DB + public page render | Submit review, visit `/[slug]`, confirm star + text appear |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
