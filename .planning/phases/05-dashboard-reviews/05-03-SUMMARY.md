---
phase: "05-dashboard-reviews"
plan: "03"
subsystem: "reviews"
tags: [reviews, email, public-profile, token]
dependency_graph:
  requires: ["05-01"]
  provides: ["complete-review-flow"]
  affects: ["src/actions/bookings.ts", "src/lib/email.ts", "src/app/[slug]/page.tsx"]
tech_stack:
  added: []
  patterns: ["token-based review URL", "RSC + client component split", "idempotency guard via IS NULL"]
key_files:
  created:
    - src/actions/reviews.ts
    - src/app/review/[token]/page.tsx
    - src/app/review/[token]/ReviewForm.tsx
    - src/components/profile/ReviewsSection.tsx
  modified:
    - src/actions/bookings.ts
    - src/lib/email.ts
    - src/app/[slug]/page.tsx
    - src/__tests__/dashboard-reviews.test.ts
    - tests/bookings/booking-action.test.ts
decisions:
  - "RSC page.tsx + separate ReviewForm.tsx client component — cannot mix 'use client' with supabaseAdmin import"
  - "submitReview uses .is('token_used_at', null) as idempotency guard — rejects second submission cleanly"
  - "ReviewsSection hidden entirely when no reviews (null return) — no empty state per user decision"
  - "supabaseAdmin used on /review/[token] page (no user session on public route)"
metrics:
  duration_min: 5
  completed_date: "2026-03-10"
  tasks_completed: 3
  files_changed: 9
---

# Phase 05 Plan 03: Review Flow End-to-End Summary

**One-liner:** Token-based review flow wired end-to-end — 64-char hex token at mark-complete, public /review/[token] form with idempotent submission, and ReviewsSection on /[slug] filtered to submitted reviews only.

## What Was Built

### Task 1: markSessionComplete token generation + email URL
- `markSessionComplete` in `src/actions/bookings.ts` now generates a 64-char hex token via `randomBytes(32).toString('hex')`
- Inserts review stub `{ booking_id, teacher_id, token }` via `supabaseAdmin` (service role bypasses RLS)
- Writes `amount_cents: amountToCapture` to the booking row at capture time
- `sendSessionCompleteEmail` signature updated to `(bookingId, reviewToken)` — URL changed from `/review?booking=id` to `/review/${reviewToken}`
- `revalidatePath('/dashboard/sessions')` added alongside existing revalidate calls

### Task 2: Review submission page + submitReview action
- `src/actions/reviews.ts`: `submitReview` server action with `.is('token_used_at', null)` idempotency guard
- `src/app/review/[token]/page.tsx`: RSC shell resolves token via `supabaseAdmin`, handles invalid/already-used states
- `src/app/review/[token]/ReviewForm.tsx`: Client component with 5-star click rating, optional text + first name, inline success state

### Task 3: ReviewsSection + /[slug] integration
- `src/components/profile/ReviewsSection.tsx`: Returns null when empty, shows aggregate avg + count, slices to 5 most recent
- `firstNameFromEmail()` exported for testability
- `/[slug]/page.tsx` queries reviews with `.not('rating', 'is', null)` to skip stubs, renders `<ReviewsSection />`

## Test Results

- **DASH-05**: 3 tests passing (token length, amount_cents, sendSessionCompleteEmail signature)
- **REVIEW-01**: 3 tests passing (success write, idempotency, invalid rating rejection)
- **REVIEW-02**: 3 tests passing (hidden when empty, aggregate header, 5-item limit)
- **REVIEW-03**: 1 test passing (URL uses /review/[token] not stub)
- **Full suite**: 100 passing, 0 failing

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Regression in booking-action.test.ts after supabaseAdmin import added to bookings.ts**
- **Found during:** Task 2 — full suite run
- **Issue:** `bookings.ts` now imports `supabaseAdmin` from `@/lib/supabase/service` at module level. `tests/bookings/booking-action.test.ts` didn't mock this module, causing Supabase client instantiation to fail (no env vars in test environment).
- **Fix:** Added `vi.mock('@/lib/supabase/service', ...)` to `tests/bookings/booking-action.test.ts`
- **Files modified:** `tests/bookings/booking-action.test.ts`
- **Commit:** 715ecef

**2. [Rule 2 - Architecture] RSC + 'use client' split required for /review/[token] page**
- **Found during:** Task 2 — plan suggested inline ReviewForm but supabaseAdmin can't be imported in 'use client' files
- **Fix:** Split into `page.tsx` (RSC, no directive) + `ReviewForm.tsx` ('use client')
- **Files modified:** Created both files separately

## Self-Check: PASSED

- src/actions/reviews.ts: FOUND
- src/app/review/[token]/page.tsx: FOUND
- src/app/review/[token]/ReviewForm.tsx: FOUND
- src/components/profile/ReviewsSection.tsx: FOUND
- Commit bf67759: FOUND
- Commit 715ecef: FOUND
- TypeScript: clean (tsc --noEmit 0 errors)
- Tests: 19/19 passing in dashboard-reviews.test.ts, 100 total passing
