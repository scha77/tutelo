---
estimated_steps: 27
estimated_files: 3
skills_used: []
---

# T02: Add capacity limit setting to dashboard settings page

Add a CapacitySettings component to the dashboard settings page that lets teachers set their capacity limit (nullable integer). The setting persists to the teachers.capacity_limit column.

## Steps

1. Create `src/components/dashboard/CapacitySettings.tsx` as a 'use client' component:
   - Props: `currentLimit: number | null`
   - Shows a card with title 'Student Capacity' and description explaining what capacity limits do
   - Input field for capacity limit (number input, min=1, placeholder 'No limit')
   - Toggle or clear button to switch between 'limited' and 'unlimited' (null)
   - Save button that calls `updateCapacityLimit` server action
   - Shows success toast on save (use sonner, already in the project)
   - Pending state while saving
2. Create `src/actions/capacity.ts` with `updateCapacityLimit(limit: number | null)` server action:
   - Auth check: get user via `supabase.auth.getUser()`, find teacher by user_id
   - Validate: if limit is not null, must be a positive integer
   - Update `teachers.capacity_limit` via supabase update
   - Revalidate `/dashboard/settings` path
   - Return `{ success: true }` or `{ success: false, error: string }`
3. Update `src/app/(dashboard)/dashboard/settings/page.tsx`:
   - Add `capacity_limit` to the teacher select query
   - Import and render `<CapacitySettings currentLimit={teacher.capacity_limit} />` between AccountSettings and SchoolEmailVerification

## Must-Haves

- [ ] CapacitySettings component renders with current limit value
- [ ] Teacher can set a numeric limit (positive integer) or clear to unlimited (null)
- [ ] Server action validates input and persists to DB
- [ ] Settings page renders without TypeScript errors

## Verification

- `npx tsc --noEmit` exits 0
- `npm run build` passes

## Inputs

- ``supabase/migrations/0011_capacity_and_session_types.sql` — confirms capacity_limit column exists on teachers table`
- ``src/app/(dashboard)/dashboard/settings/page.tsx` — existing settings page to extend`
- ``src/components/dashboard/AccountSettings.tsx` — pattern reference for dashboard settings component style`
- ``src/components/ui/input.tsx` — existing UI component`
- ``src/components/ui/button.tsx` — existing UI component`
- ``src/components/ui/card.tsx` — existing UI component`

## Expected Output

- ``src/components/dashboard/CapacitySettings.tsx` — capacity limit settings component`
- ``src/actions/capacity.ts` — server action for updating capacity limit`
- ``src/app/(dashboard)/dashboard/settings/page.tsx` — updated to include CapacitySettings`

## Verification

npx tsc --noEmit && npm run build
