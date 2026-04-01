---
estimated_steps: 37
estimated_files: 3
skills_used: []
---

# T04: Add test coverage for children CRUD, dashboard auth, and booking child selector

Write comprehensive vitest tests covering the three key areas: children API CRUD operations, parent dashboard auth routing, and the BookingCalendar child selector behavior.

## Steps

1. Create `src/__tests__/parent-children.test.ts` — Children CRUD API tests:
   - Mock `supabase.auth.getUser()` and `supabaseAdmin` Supabase client
   - Test GET returns only the authenticated parent's children (mock parent_id filter)
   - Test POST validates name (rejects empty, rejects >100 chars), creates child with correct parent_id
   - Test PUT verifies ownership — returns 404 when child belongs to different parent
   - Test DELETE verifies ownership — returns 404 when child belongs to different parent
   - Test all endpoints return 401 when unauthenticated
   - Pattern: import the route handler directly, pass mock Request objects

2. Create `src/__tests__/parent-dashboard.test.ts` — Dashboard auth routing tests:
   - Test auth routing logic (extracted to testable functions where possible):
     - No user → would redirect to login
     - User with teacher row → teacher dashboard path (has cross-link)
     - User without teacher row → parent dashboard path
     - Dual-role user → parent dashboard with hasTeacherRole=true
   - Test `signIn` action routing: mock teacher lookup, verify redirect targets
   - Test login page redirect logic: authenticated teacher → /dashboard, authenticated non-teacher → /parent

3. Create `src/__tests__/booking-child-selector.test.ts` — BookingCalendar child selector tests:
   - Mock `supabase.auth.getUser()` and `fetch` for children API
   - Test: logged-in user with children → Select element rendered with child options
   - Test: logged-in user with no children → text Input rendered (no Select)
   - Test: unauthenticated user → text Input rendered (no Select)
   - Test: selecting a child sets form.childId and form.name to child's name
   - Test: selecting 'Someone else' clears childId, shows text Input
   - Test: booking submission includes child_id when child is selected
   - Note: BookingCalendar has many props — use minimal required props for focused tests

## Must-Haves

- [ ] Children CRUD tests cover: list, create, update, delete, auth guard, ownership guard
- [ ] Dashboard auth tests cover: no user redirect, teacher routing, parent routing, dual-role
- [ ] Booking child selector tests cover: children dropdown, guest fallback, form state
- [ ] All tests pass with `npx vitest run`

## Verification

- `npx vitest run src/__tests__/parent-children.test.ts` — all pass
- `npx vitest run src/__tests__/parent-dashboard.test.ts` — all pass
- `npx vitest run src/__tests__/booking-child-selector.test.ts` — all pass
- `npx vitest run` — full suite still passes (no regressions)

## Inputs

- ``src/app/api/parent/children/route.ts` — children API to test (from T03)`
- ``src/app/api/parent/children/[id]/route.ts` — children API to test (from T03)`
- ``src/actions/auth.ts` — signIn routing logic to test (from T01)`
- ``src/app/(auth)/login/page.tsx` — login redirect logic to test (from T01)`
- ``src/components/profile/BookingCalendar.tsx` — child selector to test (from T03)`
- ``src/app/(parent)/layout.tsx` — parent layout auth logic to test (from T02)`
- ``src/__tests__/parent-auth.test.ts` — existing test patterns to follow`
- ``src/__tests__/parent-account.test.ts` — existing test patterns to follow`

## Expected Output

- ``src/__tests__/parent-children.test.ts` — children CRUD API tests`
- ``src/__tests__/parent-dashboard.test.ts` — parent dashboard auth routing tests`
- ``src/__tests__/booking-child-selector.test.ts` — BookingCalendar child selector tests`

## Verification

npx vitest run src/__tests__/parent-children.test.ts && npx vitest run src/__tests__/parent-dashboard.test.ts && npx vitest run src/__tests__/booking-child-selector.test.ts
