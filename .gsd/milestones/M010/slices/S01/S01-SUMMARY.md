---
id: S01
parent: M010
milestone: M010
provides:
  - Parent user identity infrastructure (user.id = parent identity) for S03 Stripe Customer creation
  - ParentSidebar nav slots for S04 messaging tab addition
  - children table FK linkage for future booking analytics (child_id on bookings)
  - Auth routing pattern (getUser() + maybeSingle()) for S02 Google SSO verification work
requires:
  []
affects:
  - S03 — parent user.id is the Stripe Customer anchor; children table provides child_id for booking-level attribution
  - S04 — ParentSidebar will need a Messages nav item added
  - S02 — auth routing pattern established here is the ground truth for callback/signIn/login redirect logic
key_files:
  - supabase/migrations/0017_children_and_parent_dashboard.sql
  - src/app/(auth)/callback/route.ts
  - src/actions/auth.ts
  - src/app/(auth)/login/page.tsx
  - src/app/account/page.tsx
  - src/lib/parent-nav.ts
  - src/components/parent/ParentSidebar.tsx
  - src/components/parent/ParentMobileNav.tsx
  - src/app/(parent)/layout.tsx
  - src/app/(parent)/parent/page.tsx
  - src/app/(parent)/parent/children/page.tsx
  - src/app/(parent)/parent/bookings/page.tsx
  - src/app/api/parent/children/route.ts
  - src/app/api/parent/children/[id]/route.ts
  - src/lib/schemas/booking.ts
  - src/app/api/direct-booking/create-intent/route.ts
  - src/components/profile/BookingCalendar.tsx
  - src/__tests__/parent-children.test.ts
  - src/__tests__/parent-dashboard.test.ts
  - src/__tests__/booking-child-selector.test.ts
key_decisions:
  - getUser() + maybeSingle() teacher lookup pattern used consistently across all 3 auth paths (callback, signIn, login page) — getClaims() is unreliable on POST re-renders in Next.js 16
  - Client-side Supabase for children CRUD on dashboard page — RLS enforces parent_id ownership, no API route needed for this surface
  - Supabase relation join types are always arrays in TypeScript — BookingRow uses children/teachers as arrays, accessed with [0]?.field
  - signUp kept as /onboarding redirect intentionally — new users need teacher onboarding; only returning parent-only users go to /parent
  - BookingCalendar child selector uses useEffect fetch + childrenLoaded guard to prevent premature Select render before auth/fetch resolves
patterns_established:
  - (parent) route group mirrors (dashboard) group: auth-guarded layout + sidebar + mobile nav + page composition
  - Auth routing pattern: getUser() → maybeSingle() teacher check → /dashboard if teacher, /parent otherwise
  - Parent API routes: getUser() auth guard → Zod validation → parent_id ownership check before mutation
  - BookingCalendar personalization: useEffect + auth check + API fetch + conditional render (Select for authed-with-children, Input for all others)
observability_surfaces:
  - GET /api/parent/children logs query errors to console.error with context
  - POST/PUT/DELETE /api/parent/children/[id] return structured JSON error responses (401/404/400/500) with message field
  - BookingCalendar child selector fetch errors are caught silently — falls back to text input without user-visible error (by design: personalization failure must not block booking)
drill_down_paths:
  - .gsd/milestones/M010/slices/S01/tasks/T01-SUMMARY.md
  - .gsd/milestones/M010/slices/S01/tasks/T02-SUMMARY.md
  - .gsd/milestones/M010/slices/S01/tasks/T03-SUMMARY.md
  - .gsd/milestones/M010/slices/S01/tasks/T04-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-04-01T13:09:45.930Z
blocker_discovered: false
---

# S01: Parent Dashboard & Multi-Child

**Delivered a full parent account experience: auth-guarded /parent dashboard with multi-child CRUD, booking history, and a BookingCalendar child selector dropdown — replacing free-text student names for logged-in parents.**

## What Happened

S01 was the foundational parent-side build for M010, spanning four tasks across database schema, UI infrastructure, API layer, and test coverage.

**T01 — Schema & Auth Routing**
Created `supabase/migrations/0017_children_and_parent_dashboard.sql` with the `children` table (id, parent_id, name, grade, created_at), an index on parent_id, a full-ownership RLS policy (`children_owner_all`), and `child_id` FK on bookings. Fixed all three auth paths (callback route, signIn action, login page) to route parent-only users (no teacher row) to `/parent` instead of `/onboarding`. Used consistent `getUser()` + `maybeSingle()` teacher lookup across all three. Replaced `/account` page body with a redirect to `/parent/bookings`. Intentionally kept signUp → `/onboarding` for new teacher onboarding.

**T02 — Parent Dashboard UI**
Created the full `(parent)` route group: auth-guarded layout using `getUser()`, `ParentSidebar` (dual-role cross-link to teacher dashboard, children count badge, sign out), `ParentMobileNav` (icon-only bottom tabs), and three pages: overview (parallel-queried stats cards), children management (full inline add/edit/delete CRUD via client-side Supabase — RLS handles ownership), and booking history (teacher+child joins split into upcoming/past). Installed shadcn Dialog for delete confirmation. Fixed BookingRow types to use arrays for Supabase relation joins.

**T03 — API & BookingCalendar Integration**
Created `/api/parent/children` (GET + POST) and `/api/parent/children/[id]` (PUT + DELETE) with Zod validation, auth guards, and ownership verification. Extended `BookingRequestSchema` and `RecurringBookingSchema` with optional `child_id`/`childId`. Updated `create-intent` route to pass `child_id` to booking INSERT. Grafted child selector into `BookingCalendar`: `useEffect` fetch on mount, `Select` dropdown for logged-in parents with children (options + "Someone else" text-input fallback), `childId` passthrough in all three booking submission paths. All code was already present from a prior execution; T03 was a verification pass.

**T04 — Test Coverage**
Three test files covering 46 cases: `parent-children.test.ts` (16 tests: GET/POST/PUT/DELETE including auth guards, Zod validation, UUID checks, ownership verification, DB error paths), `parent-dashboard.test.ts` (15 tests: auth routing logic, signIn action routing, auth file consistency, layout auth guard), `booking-child-selector.test.ts` (15 tests: child loading behavior, Select vs Input rendering, form state on child selection, "Someone else" path, booking submission payload for all three booking types). Full 419-test suite passes with zero failures.

**Verification:** `npx tsc --noEmit` clean, `npx next build` succeeds, all 46 targeted tests pass, no `/onboarding` redirects remain in callback or login paths, `redirect.*parent` confirmed in auth.ts.

## Verification

All slice-level verification checks passed:
- `npx tsc --noEmit` → exit 0, zero errors
- `npx vitest run src/__tests__/parent-children.test.ts` → 16/16 pass
- `npx vitest run src/__tests__/parent-dashboard.test.ts` → 15/15 pass
- `npx vitest run src/__tests__/booking-child-selector.test.ts` → 15/15 pass
- `npx vitest run` → 419/419 pass (full suite, zero regressions)
- `grep -rn 'onboarding' src/app/(auth)/callback/route.ts src/app/(auth)/login/page.tsx` → exit 1 (no matches — correct)
- `grep -c 'redirect.*parent' src/actions/auth.ts` → 2 (present)
- All 7 required T02 files exist and are non-empty
- Migration SQL syntactically valid, file present at supabase/migrations/0017_children_and_parent_dashboard.sql
- `npx next build` succeeds with /parent, /parent/children, /parent/bookings compiled

## Requirements Advanced

- PARENT-04 — children table with RLS, CRUD API with ownership checks, dashboard management page, BookingCalendar child selector — full multi-child management delivered
- PARENT-07 — login-required /parent dashboard with sidebar nav, overview/children/bookings pages, dual-role support, correct auth routing from all 3 entry points
- PARENT-08 — BookingCalendar shows child dropdown for logged-in parents with children; falls back to text input for guests; child_id passes through all booking paths

## Requirements Validated

- PARENT-04 — children table + RLS (migration 0017), /api/parent/children CRUD with ownership, /parent/children page with inline add/edit/delete, BookingCalendar Select dropdown. 16 children CRUD + 15 child selector unit tests pass.
- PARENT-07 — auth-guarded (parent) layout with getUser(), ParentSidebar + ParentMobileNav, 3 pages (overview/children/bookings), auth routing in callback/signIn/login. 15 auth routing unit tests pass.
- PARENT-08 — BookingCalendar useEffect fetch + conditional Select/Input, childId passthrough in all 3 booking paths (direct/recurring/deferred), BookingRequestSchema accepts child_id. 15 child selector unit tests pass.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

1. T02 used client-side Supabase for children CRUD on the dashboard page (not a dedicated API route as implied by the plan) — RLS enforces ownership at the DB level, making an API route redundant for this surface. The /api/parent/children route still exists for BookingCalendar (client component that needs an HTTP endpoint).
2. T01 callback route switched from getClaims() to getUser() for consistency with other auth paths — same routing effect, more reliable pattern.
3. T02 BookingRow types required array-typed relation joins (not object types) — fixed during implementation after Supabase join behavior was observed.
4. T03 and T04 were primarily verification passes — all implementation was already complete from prior execution sessions.

## Known Limitations

1. Migration 0017 is not auto-applied — requires manual `supabase db push` or deployment to Supabase before any parent features work in production.
2. The /parent/children page uses client-side Supabase which requires the user's session cookie to be present — works in all normal browser flows but would fail in server-side rendering without a session.
3. BookingCalendar child selector is not shown to parents until after the auth check resolves — brief flash of text input before children load (mitigated by `childrenLoaded` guard but still noticeable on slow connections).
4. Grade field in children management is free-text, not a dropdown — allows any string; no validation against standard grade levels.

## Follow-ups

- S03 (Saved Payment Methods) builds on S01's parent user identity model — parent's user.id will be used to create/retrieve Stripe Customer
- S04 (Messaging) builds on S01's parent dashboard layout — messages tab will be added to ParentSidebar nav items
- Consider adding a Stripe Customer lookup/creation on first parent login to pre-warm S03 implementation
- Parent dashboard bookings page should eventually show child name from join rather than free-text student_name — already implemented (children[0]?.name with fallback to student_name)

## Files Created/Modified

- `supabase/migrations/0017_children_and_parent_dashboard.sql` — New migration: children table with RLS owner policy + child_id FK on bookings
- `src/app/(auth)/callback/route.ts` — Routes parent-only users to /parent instead of /onboarding; uses getUser() + maybeSingle()
- `src/actions/auth.ts` — signIn action routes parent-only users to /parent; adds redirect.*parent
- `src/app/(auth)/login/page.tsx` — Authenticated non-teacher users redirected to /parent instead of /dashboard
- `src/app/account/page.tsx` — Replaced with redirect to /parent/bookings
- `src/lib/parent-nav.ts` — New: parent nav items (Overview, My Children, My Bookings)
- `src/components/parent/ParentSidebar.tsx` — New: desktop sidebar with dual-role cross-link and children count badge
- `src/components/parent/ParentMobileNav.tsx` — New: mobile bottom tab bar for parent dashboard
- `src/app/(parent)/layout.tsx` — New: auth-guarded parent layout (getUser() guard, teacher role check, children count query)
- `src/app/(parent)/parent/page.tsx` — New: parent overview page with stats cards
- `src/app/(parent)/parent/children/page.tsx` — New: children management page with inline add/edit/delete CRUD
- `src/app/(parent)/parent/bookings/page.tsx` — New: booking history page with upcoming/past split and child name join
- `src/components/ui/dialog.tsx` — New: shadcn Dialog component (installed for delete confirmation)
- `src/app/api/parent/children/route.ts` — New: GET (list children) + POST (create child) with auth + Zod validation
- `src/app/api/parent/children/[id]/route.ts` — New: PUT (update child) + DELETE (delete child) with ownership verification
- `src/lib/schemas/booking.ts` — Added child_id (BookingRequestSchema) and childId (RecurringBookingSchema) as optional UUID fields
- `src/app/api/direct-booking/create-intent/route.ts` — Passes child_id from request body to bookings INSERT
- `src/components/profile/BookingCalendar.tsx` — Added child selector: useEffect fetch, childrenLoaded guard, Select/Input conditional, childId passthrough in all 3 booking paths
- `src/__tests__/parent-children.test.ts` — New: 16 unit tests for children CRUD API (auth, validation, ownership)
- `src/__tests__/parent-dashboard.test.ts` — New: 15 unit tests for auth routing and dashboard guard logic
- `src/__tests__/booking-child-selector.test.ts` — New: 15 unit tests for BookingCalendar child selector behavior
