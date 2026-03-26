# S01: Capacity Limits + Waitlist Signup

**Goal:** Teacher can set a capacity limit in dashboard settings. When at capacity, the teacher's public profile page shows 'Currently at capacity' with a waitlist email signup form instead of the booking calendar. Teachers without a capacity limit see no changes.
**Demo:** Teacher sets capacity_limit=3 in dashboard settings. With 3 active students, their profile page shows 'Currently at capacity' with teacher info still visible and a waitlist email signup form replacing the booking calendar. A parent enters their email and sees a confirmation. Teachers without a capacity limit see no changes.

## Must-Haves

- Teacher sets capacity_limit=3 in dashboard settings → saved to DB, reflected in UI
- Teacher with capacity_limit=3 and 3+ active students → profile page hides booking calendar, shows 'Currently at capacity' + waitlist form
- Parent enters email on waitlist form → row inserted into waitlist table, confirmation shown
- Teacher with no capacity_limit → profile page unchanged (booking calendar visible)
- Teacher with capacity_limit=5 and 2 active students → profile page shows booking calendar normally
- Migration 0011 applies cleanly: capacity_limit on teachers, waitlist table with RLS, session_types table with RLS
- `npx vitest run tests/unit/capacity.test.ts` passes
- `npx tsc --noEmit` passes
- `npm run build` passes

## Proof Level

- This slice proves: Contract + integration — migration applies, capacity check logic unit-tested, dashboard settings save to DB, profile page conditionally renders at-capacity state with real Supabase queries, waitlist insert works with anon RLS.

## Integration Closure

- Upstream surfaces consumed: `src/app/[slug]/page.tsx` (profile RSC), `src/app/(dashboard)/dashboard/settings/page.tsx` (settings page), `src/actions/profile.ts` (updateProfile action), `supabase/migrations/0001_initial_schema.sql` (teachers + bookings tables)
- New wiring introduced: capacity_limit column on teachers table, waitlist table, session_types table (structure only — CRUD in S03), capacity check query in profile RSC, CapacitySettings component in dashboard settings, AtCapacitySection + WaitlistForm components on profile page
- What remains before the milestone is truly usable end-to-end: S02 (waitlist dashboard + notification emails), S03 (session types CRUD + booking flow integration)

## Verification

- Runtime signals: console.error on waitlist insert failure with teacher_id context
- Inspection surfaces: waitlist table queryable via Supabase dashboard; capacity_limit visible on teachers table
- Failure visibility: waitlist form shows user-facing error message on insert failure; capacity check failure falls back to showing booking calendar (safe default)
- Redaction constraints: parent_email is PII — no logging of email values

## Tasks

- [ ] **T01: Migration + capacity check utility** `est:45m`
  Write the 0011 migration adding capacity_limit to teachers, waitlist table, and session_types table (per D005). Create a server-side utility function that counts active students for a teacher and returns whether they are at capacity.
  - Files: `supabase/migrations/0011_capacity_and_session_types.sql`, `src/lib/utils/capacity.ts`, `tests/unit/capacity.test.ts`
  - Verify: npx vitest run tests/unit/capacity.test.ts && npx tsc --noEmit

- [ ] **T02: Dashboard capacity settings UI** `est:40m`
  Add a CapacitySettings component to the dashboard settings page so teachers can set or clear their capacity limit. Wire it to the existing updateProfile action.
  - Files: `src/components/dashboard/CapacitySettings.tsx`, `src/app/(dashboard)/dashboard/settings/page.tsx`, `src/actions/profile.ts`
  - Verify: npx tsc --noEmit && npm run build

- [ ] **T03: Profile at-capacity state + waitlist signup form** `est:1h`
  Modify the teacher profile page to check capacity and conditionally render an AtCapacitySection with a waitlist email signup form instead of the booking calendar. Create the AtCapacitySection and WaitlistForm client components.
  - Files: `src/app/[slug]/page.tsx`, `src/components/profile/AtCapacitySection.tsx`, `src/components/profile/WaitlistForm.tsx`, `src/app/api/waitlist/route.ts`
  - Verify: npx tsc --noEmit && npm run build

## Files Likely Touched

- supabase/migrations/0011_capacity_and_session_types.sql
- src/lib/utils/capacity.ts
- tests/unit/capacity.test.ts
- src/components/dashboard/CapacitySettings.tsx
- src/app/(dashboard)/dashboard/settings/page.tsx
- src/actions/profile.ts
- src/app/[slug]/page.tsx
- src/components/profile/AtCapacitySection.tsx
- src/components/profile/WaitlistForm.tsx
- src/app/api/waitlist/route.ts
