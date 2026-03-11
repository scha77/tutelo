---
phase: 6
slug: profile-account-fixes
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/auth/signup.test.ts src/__tests__/rebook.test.ts src/__tests__/parent-account.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~6 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/auth/signup.test.ts src/__tests__/rebook.test.ts src/__tests__/parent-account.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 6 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 6-01-01 | 01 | 0 | AUTH-02 | unit | `npx vitest run tests/auth/signup.test.ts` | ✅ | ⬜ pending |
| 6-01-02 | 01 | 0 | PARENT-03 | unit | `npx vitest run src/__tests__/rebook.test.ts` | ✅ | ⬜ pending |
| 6-01-03 | 01 | 1 | PAGE-06 | manual | Browser: visit `/[slug]` on mobile, confirm CTA visible | ✅ | ⬜ pending |
| 6-01-04 | 01 | 1 | PARENT-03 | unit | `npx vitest run src/__tests__/rebook.test.ts` | ✅ | ⬜ pending |
| 6-01-05 | 01 | 1 | AUTH-02 | unit | `npx vitest run src/__tests__/parent-account.test.ts` | ✅ | ⬜ pending |
| 6-01-06 | 01 | 1 | AUTH-02 | unit | `npx vitest run tests/auth/signup.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/auth/signup.test.ts` — add test case: draft teacher (`is_published: false`) redirects to `/dashboard` after signIn fix
- [ ] `src/__tests__/rebook.test.ts` line 137 — update assertion from `#booking?subject=Math` to `?subject=Math#booking`

*Wave 0 covers test infrastructure gaps before implementation tasks run.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sticky "Book Now" CTA visible on mobile | PAGE-06 | No automated DOM rendering test for mobile viewport | Visit `/[slug]` on mobile (or DevTools 375px), confirm CTA is visible and sticky at bottom of screen at all times |
| Hourly rate displays in credentials bar | PAGE-05 | CredentialsBar rendering requires DB data; no unit test for display | Visit `/[slug]` for a teacher with `hourly_rate` set; confirm `$X/hr` appears in credentials bar |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 6s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
