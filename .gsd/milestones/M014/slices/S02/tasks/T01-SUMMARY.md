---
id: T01
parent: S02
milestone: M014
key_files:
  - src/components/auth/LoginForm.tsx
key_decisions:
  - Replace RHF+zod with native form handling in LoginForm — 2 fields don't justify 296K of validation library
  - Keep RHF+zod in OnboardingWizard — complex validation (phone, arrays, regex) justifies the dependency
  - Zod scoped to /onboarding only — no longer in shared bundle
duration: 
verification_result: passed
completed_at: 2026-04-07T16:41:00.907Z
blocker_discovered: false
---

# T01: Replaced react-hook-form + zodResolver in LoginForm with native form handling — Zod no longer in shared client bundle.

**Replaced react-hook-form + zodResolver in LoginForm with native form handling — Zod no longer in shared client bundle.**

## What Happened

LoginForm was the only non-onboarding client component importing react-hook-form and zod. Replaced it with native useState + FormEvent handling and a simple validate() function for email format and password length checks. The OnboardingWizard keeps react-hook-form + zod since it has genuinely complex validation (phone number parsing, array constraints, regex patterns) — but its imports are now scoped to the /onboarding page chunk only.

Result: the 296K Zod chunk no longer appears in dashboard, landing page, or any shared chunk. It loads only when a user hits /onboarding. The dashboard root JS stays at 403K (framework-only). react-hook-form references remain in the framework chunk because Turbopack co-locates them with react-dom, but the actual RHF payload is minimal (~4 occurrences in a 220K chunk that's 95% react-dom+scheduler).

## Verification

Build succeeds. Zod chunk (a59989690ea104d9.js, 434K) exists but is not referenced by dashboard or landing page manifests. 52 files, 490 tests, 0 failures.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx next build` | 0 | ✅ pass | 17500ms |
| 2 | `npx vitest run` | 0 | ✅ pass — 490 tests | 8360ms |
| 3 | `node -e 'check zod not in dashboard manifest'` | 0 | ✅ pass — Zod chunk not loaded by dashboard | 50ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/components/auth/LoginForm.tsx`
