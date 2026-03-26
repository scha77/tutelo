---
estimated_steps: 18
estimated_files: 3
skills_used: []
---

# T02: Dashboard capacity settings UI

Add a CapacitySettings component to the dashboard settings page so teachers can view and update their capacity limit.

**CapacitySettings component (`src/components/dashboard/CapacitySettings.tsx`):**

A 'use client' component that renders a card with:
- A heading: "Capacity Limit" with a short description explaining what it controls
- A toggle or checkbox: "Limit the number of active students" — when unchecked, capacity is unlimited (null)
- When enabled: a number input for the max student count (min 1, max 100)
- Current active student count displayed for context (passed as prop from the server page)
- A "Save" button that calls `updateProfile({ capacity_limit: value })` — reuse the existing action
- Toast feedback on save success/failure (sonner, matching existing patterns in AccountSettings)

The component receives `capacityLimit` (number | null) and `activeStudentCount` (number) as props.

**Settings page changes (`src/app/(dashboard)/dashboard/settings/page.tsx`):**

- Add `capacity_limit` to the teacher select query
- Import and compute active student count using a bookings query (count distinct student_name where status in confirmed/completed and booking_date within 90 days)
- Render `<CapacitySettings capacityLimit={teacher.capacity_limit} activeStudentCount={count} />` between AccountSettings and SchoolEmailVerification

**Profile action changes (`src/actions/profile.ts`):**

- Add `capacity_limit` to the `ProfileUpdateSchema` as `z.number().int().min(1).max(100).nullable().optional()`
- No other changes needed — the existing `updateProfile` function handles arbitrary fields

Follow the exact patterns from `AccountSettings.tsx` for state management (useState + useTransition + toast).

## Inputs

- `src/app/(dashboard)/dashboard/settings/page.tsx`
- `src/actions/profile.ts`
- `src/components/dashboard/AccountSettings.tsx`
- `supabase/migrations/0011_capacity_and_session_types.sql`

## Expected Output

- `src/components/dashboard/CapacitySettings.tsx`
- `src/app/(dashboard)/dashboard/settings/page.tsx`
- `src/actions/profile.ts`

## Verification

npx tsc --noEmit && npm run build
