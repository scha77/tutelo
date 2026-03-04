---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-03
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (integrates with Next.js App Router and Tailwind v4) |
| **Config file** | `vitest.config.ts` — does not exist yet; Wave 0 installs |
| **Quick run command** | `npx vitest run tests/utils/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds (unit tests only); ~45 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/utils/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-03-01 | 01-03 | 1 | AUTH-01, AUTH-02 | integration | `npx vitest run tests/auth/signup.test.ts` | ❌ W0 | ⬜ pending |
| 1-03-02 | 01-03 | 1 | AUTH-02 | integration | `npx vitest run tests/auth/session.test.ts` | ❌ W0 | ⬜ pending |
| 1-04-01 | 01-04 | 2 | ONBOARD-07 | unit | `npx vitest run tests/utils/slugify.test.ts` | ❌ W0 | ⬜ pending |
| 1-04-02 | 01-04 | 2 | ONBOARD-01–07 | integration | `npx vitest run tests/onboarding/wizard.test.ts` | ❌ W0 | ⬜ pending |
| 1-05-01 | 01-05 | 3 | PAGE-01 | integration | `npx vitest run tests/profile/slug-page.test.ts` | ❌ W0 | ⬜ pending |
| 1-05-02 | 01-05 | 3 | VIS-02 | unit | `npx vitest run tests/profile/draft-visibility.test.ts` | ❌ W0 | ⬜ pending |
| 1-05-03 | 01-05 | 3 | AVAIL-03 | unit | `npx vitest run tests/availability/timezone.test.ts` | ❌ W0 | ⬜ pending |
| 1-05-04 | 01-05 | 3 | PAGE-04 | unit | `npx vitest run tests/utils/bio.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — Vitest configuration for Next.js App Router
- [ ] `tests/utils/slugify.test.ts` — stubs for ONBOARD-07 (slug generation + collision)
- [ ] `tests/utils/bio.test.ts` — stubs for PAGE-04 (auto-bio generation)
- [ ] `tests/availability/timezone.test.ts` — stubs for AVAIL-03 (timezone conversion)
- [ ] `tests/profile/draft-visibility.test.ts` — stubs for VIS-02 (graceful draft state)
- [ ] `tests/auth/signup.test.ts` — stubs for AUTH-01 (email + Google SSO signup)
- [ ] `tests/auth/session.test.ts` — stubs for AUTH-02 (session persistence)
- [ ] `tests/onboarding/wizard.test.ts` — stubs for ONBOARD-01–07 (wizard flow)
- [ ] `tests/profile/slug-page.test.ts` — stubs for PAGE-01 (public profile renders)
- [ ] Framework install: `npm install -D vitest @vitejs/plugin-react jsdom` — Wave 0 installs if not already present

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Google OAuth flow in browser | AUTH-01 | Requires browser OAuth redirect + cookie flow | Sign in with Google on staging; verify session created and redirected to /dashboard |
| Photo upload to Supabase Storage | ONBOARD-03 | Requires real S3-compatible storage backend | Upload avatar in onboarding wizard; verify URL stored in `teachers.photo_url` |
| Accent color live preview | CUSTOM-01 | Visual rendering check | Change accent color in dashboard; verify public page reflects change immediately |
| Mobile-first public page layout | PAGE-02 | CSS/visual regression | Load `/[slug]` on 375px viewport; verify sticky Book Now button and responsive layout |
| Active/Draft toggle | VIS-01 | State persistence UI check | Toggle page to Draft; verify graceful "not available" message on public URL |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
