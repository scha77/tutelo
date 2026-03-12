# T01: 05-dashboard-reviews 01

**Slice:** S05 — **Milestone:** M001

## Description

Lay the schema foundation and test scaffold for Phase 5. This plan runs first (Wave 1) so all downstream plans in Wave 2 can implement against known column shapes and a pre-existing test file.

Purpose: Migration 0006 adds the four missing columns Phase 5 requires (token, token_used_at, reviewer_name, amount_cents) and adjusts RLS policies. The test scaffold creates the vitest file with it.todo() stubs so Wave 2 plans can fill in real tests. The sidebar and requests page cleanups are atomic changes that belong here — they unblock the sessions page plan from having a broken UI state mid-deploy.

Output: Migration file, green test scaffold, updated Sidebar with 2 new nav items, pending-only requests page.

## Must-Haves

- [ ] "Migration 0006 runs clean: reviews.token, reviews.token_used_at, reviews.reviewer_name, bookings.amount_cents columns all exist with correct types"
- [ ] "reviews.rating is nullable (DROP NOT NULL); CHECK constraint still enforces 1–5 when non-null"
- [ ] "Sidebar renders Sessions and Students nav items; /dashboard has exact-match active state"
- [ ] "requests/page.tsx shows only pending/requested bookings — confirmed section removed"
- [ ] "Test scaffold file exists with it.todo() stubs covering all 7 req IDs; vitest run is green (no failures)"

## Files

- `supabase/migrations/0006_phase5_reviews.sql`
- `src/__tests__/dashboard-reviews.test.ts`
- `src/components/dashboard/Sidebar.tsx`
- `src/app/(dashboard)/dashboard/requests/page.tsx`
