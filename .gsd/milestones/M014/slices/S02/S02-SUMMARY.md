---
id: S02
parent: M014
milestone: M014
provides:
  - (none)
requires:
  []
affects:
  []
key_files:
  - src/components/auth/LoginForm.tsx
key_decisions:
  - Replace RHF+zod with native form handling in LoginForm — 2 fields don't justify 296K
  - Keep RHF+zod in OnboardingWizard — complex validation justifies the dependency
patterns_established:
  - (none)
observability_surfaces:
  - none
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-04-07T16:41:19.546Z
blocker_discovered: false
---

# S02: Eliminate Client-Side Zod

**Removed Zod from the shared client bundle by replacing zodResolver in LoginForm with native form validation — Zod now loads only on /onboarding.**

## What Happened

LoginForm was the only shared-route component importing react-hook-form + zod via zodResolver. Since every auth route loads LoginForm, the 296K Zod library was pulled into the shared client chunk and downloaded on every page. Replaced LoginForm's form handling with native useState + FormEvent + a simple validate() function. The OnboardingWizard retains react-hook-form + zod because its validation is genuinely complex (libphonenumber-js phone parsing, array constraints, regex patterns). After the change, the Zod chunk only loads when users navigate to /onboarding — not on dashboard, landing, login, or any other route.

## Verification

Build succeeds. Zod chunk exists but is not referenced by dashboard or landing page build manifests. 52 files, 490 tests, 0 failures.

## Requirements Advanced

None.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

None.

## Known Limitations

None.

## Follow-ups

None.

## Files Created/Modified

None.
