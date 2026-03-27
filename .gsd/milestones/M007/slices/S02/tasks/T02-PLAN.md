---
estimated_steps: 7
estimated_files: 4
skills_used: []
---

# T02: Build waitlist dashboard page with nav entry, server action for entry deletion, and WaitlistEntryRow client component

Create the /dashboard/waitlist teacher-facing page, the removeWaitlistEntry server action, the WaitlistEntryRow client component, and the Waitlist nav item.

Steps:
1. In `src/lib/nav.ts`, add `ListOrdered` to lucide-react imports. Insert `{ href: '/dashboard/waitlist', label: 'Waitlist', icon: ListOrdered }` into navItems array between Students (index 3) and Page (index 4).
2. Create `src/actions/waitlist.ts` — 'use server' file exporting `removeWaitlistEntry(entryId: string)`. Auth: getClaims() → teacher lookup → `.delete().eq('id', entryId).eq('teacher_id', teacher.id)` → revalidatePath('/dashboard/waitlist') → return { success: true } or { error }. Teacher_id guard prevents cross-teacher deletion.
3. Create `src/components/dashboard/WaitlistEntryRow.tsx` — 'use client' component. Props: entry (id, parent_email, created_at, notified_at) + removeAction. Uses useTransition for pending state, window.confirm for deletion confirmation, toast.success/error for feedback. Shows email, join date, notified status badge (green 'Notified' vs grey 'Pending'), and red 'Remove' button.
4. Create `src/app/(dashboard)/dashboard/waitlist/page.tsx` — RSC page. Auth: getUser() → teacher lookup (select id, capacity_limit) → query waitlist entries ordered by created_at ascending. Three states: capacity_limit null → show link to Settings, empty waitlist → 'No one on your waitlist yet', entries → map WaitlistEntryRow with removeWaitlistEntry action prop.
5. Verify: `npx tsc --noEmit` shows no S02-related errors; `npm run build` passes with /dashboard/waitlist in route manifest.

## Inputs

- ``src/lib/nav.ts` — existing nav items array to extend`
- ``src/actions/bookings.ts` — pattern reference for server action auth (getClaims pattern)`
- ``src/components/dashboard/WaitlistEntryRow.tsx` — will be created`
- ``src/actions/waitlist.ts` — will be created`

## Expected Output

- ``src/lib/nav.ts` — modified with ListOrdered import and Waitlist nav item`
- ``src/actions/waitlist.ts` — new server action file with removeWaitlistEntry`
- ``src/components/dashboard/WaitlistEntryRow.tsx` — new client component`
- ``src/app/(dashboard)/dashboard/waitlist/page.tsx` — new RSC page`

## Verification

npx tsc --noEmit 2>&1 | grep -v session-types && npm run build 2>&1 | grep -q 'dashboard/waitlist'
