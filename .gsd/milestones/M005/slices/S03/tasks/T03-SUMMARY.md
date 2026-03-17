---
id: T03
parent: S03
milestone: M005
provides:
  - SchoolEmailVerification component renders verified state with green CheckCircle when isVerified is true
  - SchoolEmailVerification component renders email input form when isVerified is false
  - Form calls requestSchoolEmailVerification action with useTransition loading state (Loader2 spinner)
  - Success and error toasts display correctly after action call (toast.success/toast.error)
  - URL params from verify-email redirect trigger appropriate toast messages (verified, invalid, expired)
  - Settings page select query includes verified_at
  - Settings page renders SchoolEmailVerification below AccountSettings in space-y-8 container
  - npm run build passes with zero errors (25 routes)
key_files:
  - src/components/dashboard/SchoolEmailVerification.tsx
  - src/app/(dashboard)/dashboard/settings/page.tsx
key_decisions:
  - Used bordered card layout matching AccountSettings visual pattern (rounded-lg border bg-card p-6)
  - Used Loader2 spinner icon for loading state consistency with lucide-react
patterns_established:
  - URL param → useEffect toast pattern for post-redirect feedback in client components
observability_surfaces:
  - Toast notifications surface success/error to user for all verification state transitions
  - URL params (?verified=true, ?error=invalid, ?error=expired) visible in browser for debugging
  - Green checkmark vs email form visually indicates verification status
duration: 10m
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T03: Build SchoolEmailVerification UI and wire into dashboard settings

**Created SchoolEmailVerification client component and wired it into the dashboard settings page with verified/unverified states and URL param toast feedback.**

## What Happened

Created `SchoolEmailVerification.tsx` as a `'use client'` component with two render states:
- **Verified**: Green emerald-600 checkmark icon in a rounded circle + "School email verified" heading + description about the badge.
- **Unverified**: Mail icon header + email input with label + "Send verification link" button using `useTransition` for loading state (Loader2 spinner). On success, clears input and shows success toast. On error, shows error toast with the server action's error message.

`useEffect` on mount handles URL param feedback from the `/api/verify-email` redirect:
- `verifiedParam === true` → success toast
- `errorParam === 'invalid'` → error toast about invalid/used link
- `errorParam === 'expired'` → error toast about expired link

Updated `settings/page.tsx` to:
- Add `verified_at` to the Supabase select query
- Accept `searchParams` as a Promise (Next.js 15+ pattern), await it
- Render `SchoolEmailVerification` below `AccountSettings` in a `space-y-8` container

## Verification

- `npm run build` — ✅ zero errors, all 25 routes generated successfully
- `npx vitest run src/__tests__/verification.test.ts` — ✅ 9/9 tests pass (T01 tests unchanged)
- Slice-level: `npm run build` ✅, vitest ✅, manual verification deferred to UAT

## Diagnostics

- **UI state inspection**: Visit `/dashboard/settings` — presence of "School email verified" (green) vs "Verify your school email" (form) indicates verification status
- **URL param feedback**: After redirect from `/api/verify-email`, URL contains `?verified=true` or `?error=invalid|expired`
- **Toast messages**: Sonner toasts appear for all state transitions (send success, send error, verified, invalid link, expired link)
- **Server action errors**: Returned as `{ error: string }`, displayed via `toast.error` — visible in browser

## Deviations

None — implementation follows the task plan exactly.

## Known Issues

None.

## Files Created/Modified

- `src/components/dashboard/SchoolEmailVerification.tsx` — New client component with verified/unverified states, useTransition loading, and URL param toast handling
- `src/app/(dashboard)/dashboard/settings/page.tsx` — Added `verified_at` to select, `searchParams` Promise handling, renders `SchoolEmailVerification` below `AccountSettings`
- `.gsd/milestones/M005/slices/S03/tasks/T03-PLAN.md` — Added Observability Impact section
