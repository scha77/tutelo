---
id: T02
parent: S02
milestone: M007
key_files:
  - src/lib/nav.ts
  - src/actions/waitlist.ts
  - src/components/dashboard/WaitlistEntryRow.tsx
  - src/app/(dashboard)/dashboard/waitlist/page.tsx
key_decisions:
  - Used getClaims() for server action auth (matching bookings.ts pattern) and getUser() for RSC page auth (matching students/page.tsx pattern) — consistent with existing codebase convention
  - Placed Waitlist nav item between Students and Page in navItems array (before Settings), as specified in the plan
duration: ""
verification_result: passed
completed_at: 2026-03-26T02:40:46.578Z
blocker_discovered: false
---

# T02: Build waitlist dashboard page with nav entry, server action for entry deletion, and WaitlistEntryRow client component

**Build waitlist dashboard page with nav entry, server action for entry deletion, and WaitlistEntryRow client component**

## What Happened

Implemented the full `/dashboard/waitlist` teacher-facing page across 4 files:

1. **nav.ts** — Added `ListOrdered` import and inserted `{ href: '/dashboard/waitlist', label: 'Waitlist', icon: ListOrdered }` between Students (index 3) and Page (index 4) in the `navItems` array. Both Sidebar and MobileBottomNav render from this array automatically.

2. **actions/waitlist.ts** — New `'use server'` file exporting `removeWaitlistEntry(entryId)`. Follows the `acceptBooking` pattern exactly: `getClaims()` for auth → teacher lookup → `.delete().eq('id', entryId).eq('teacher_id', teacher.id)` for ownership-guarded deletion → `revalidatePath('/dashboard/waitlist')` → return `{ success: true }` or `{ error }`.

3. **WaitlistEntryRow.tsx** — Client component following the `ConfirmedSessionCard` pattern. Shows parent email, formatted join date, notified status badge (green "Notified" or muted "Pending"), and a delete button. Delete uses `window.confirm` → `useTransition` + `startTransition` → `removeAction(entry.id)` → `toast.success`/`toast.error` from sonner.

4. **waitlist/page.tsx** — RSC page following the `students/page.tsx` pattern. Auth check → teacher lookup (fetches `id, capacity_limit`) → waitlist query ordered by `created_at asc`. Three states: (a) no `capacity_limit` → prompt to set one in Settings with a link, (b) capacity set but no entries → "No one on your waitlist yet", (c) entries present → renders `WaitlistEntryRow` for each with `removeWaitlistEntry` as the action prop.

## Verification

All verification checks passed:
1. `npx tsc --noEmit` — exits 0 with no type errors
2. `npm run build` — compiles successfully, `/dashboard/waitlist` appears in route manifest as a dynamic route
3. `npm run build | grep -q 'dashboard/waitlist'` — confirms route presence
4. `npx vitest run tests/unit/waitlist-notify.test.ts` — 7/7 T01 tests still pass (no regressions)

Slice-level verification (partial — T02 is task 2 of slice):
- ✅ Inspection surfaces: `/dashboard/waitlist` page shows notified status per entry via `notified_at` badge
- ✅ Runtime signals: existing console.error patterns from T01 unchanged
- ✅ Failure visibility: per-entry error logging from T01 unchanged; server action returns structured errors

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx tsc --noEmit` | 0 | ✅ pass | 3000ms |
| 2 | `npm run build` | 0 | ✅ pass | 12900ms |
| 3 | `npm run build 2>&1 | grep -q 'dashboard/waitlist'` | 0 | ✅ pass | 12900ms |
| 4 | `npx vitest run tests/unit/waitlist-notify.test.ts` | 0 | ✅ pass | 3600ms |


## Deviations

Used `getClaims()` instead of `getUser()` for auth in the server action, matching the established pattern in bookings.ts (acceptBooking, markSessionComplete, cancelSession) rather than the plan's suggestion of `getUser()`. The page itself uses `getUser()` matching the students/page.tsx pattern — this is the correct split since RSC pages use getUser while server actions use getClaims in this codebase.

## Known Issues

None.

## Files Created/Modified

- `src/lib/nav.ts`
- `src/actions/waitlist.ts`
- `src/components/dashboard/WaitlistEntryRow.tsx`
- `src/app/(dashboard)/dashboard/waitlist/page.tsx`
