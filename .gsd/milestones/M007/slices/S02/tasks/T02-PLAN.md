---
estimated_steps: 4
estimated_files: 4
skills_used: []
---

# T02: Build waitlist dashboard page with nav entry and delete action

Create the `/dashboard/waitlist` dashboard page where teachers view their waitlist entries (parent email, join date, notified status) and can remove entries. Includes a `removeWaitlistEntry` server action, a `WaitlistEntryRow` client component with delete button + useTransition + toast pattern, and a Waitlist nav item added between Students and Settings in `src/lib/nav.ts`.

This task delivers requirement WAIT-02 (teacher sees waitlist in dashboard and can manage entries — view, remove).

## Steps

1. **Add Waitlist nav item to `src/lib/nav.ts`** — Import `ListOrdered` from `lucide-react`. Insert a new nav item between Students (index 3) and Page (index 4): `{ href: '/dashboard/waitlist', label: 'Waitlist', icon: ListOrdered }`. The nav is consumed by `Sidebar` and `MobileBottomNav` — both render from `navItems` automatically, so no other component changes needed.

2. **Create `src/actions/waitlist.ts`** — New server action file with `'use server'` directive. Export `removeWaitlistEntry(entryId: string)`. Implementation:
   - `createClient()` from `@/lib/supabase/server` to get authed Supabase client
   - Auth check: `supabase.auth.getUser()` → redirect or error if not authenticated
   - Teacher lookup: `supabase.from('teachers').select('id').eq('user_id', user.id).single()`
   - Delete: `supabase.from('waitlist').delete().eq('id', entryId).eq('teacher_id', teacher.id)` — the `teacher_id` guard prevents cross-teacher deletion. RLS `waitlist_teacher_delete` policy also enforces this.
   - Call `revalidatePath('/dashboard/waitlist')` after successful delete
   - Return `{ success: true }` or `{ error: string }`

3. **Create `src/components/dashboard/WaitlistEntryRow.tsx`** — Client component (`'use client'`) following the `ConfirmedSessionCard` pattern. Props: `{ entry: { id: string, parent_email: string, created_at: string, notified_at: string | null }, removeAction: (id: string) => Promise<{ success?: true; error?: string }> }`. Implementation:
   - Use `useTransition()` for pending state on delete button
   - Show parent_email, formatted join date (use `new Date(entry.created_at).toLocaleDateString()`)
   - Show notified status: if `notified_at` is not null, show a small "Notified" badge (green); otherwise show nothing or "Pending"
   - Delete button: `window.confirm('Remove this entry from your waitlist?')` → call `removeAction(entry.id)` inside `startTransition` → `toast.success('Removed from waitlist')` on success, `toast.error(...)` on failure
   - Import `toast` from `sonner`
   - Use `rounded-lg border bg-card px-4 py-3 flex items-center gap-4` card styling (matches student card pattern)

4. **Create `src/app/(dashboard)/dashboard/waitlist/page.tsx`** — RSC page following the `students/page.tsx` pattern exactly. Implementation:
   - Auth check: `createClient()` → `supabase.auth.getUser()` → redirect to `/login` if not authed
   - Teacher lookup: `supabase.from('teachers').select('id, capacity_limit').eq('user_id', user.id).maybeSingle()` → redirect to `/onboarding` if no teacher
   - Query waitlist: `supabase.from('waitlist').select('id, parent_email, created_at, notified_at').eq('teacher_id', teacher.id).order('created_at', { ascending: true })` — RLS `waitlist_teacher_select` gates this to the authed teacher's entries
   - Render heading "Waitlist" (h1, same styling as StudentsPage)
   - Empty state logic:
     - If `teacher.capacity_limit` is null: show "Set a capacity limit in Settings to enable the waitlist feature." with a link to `/dashboard/settings`
     - If capacity_limit is set but no entries: show "No one on your waitlist yet."
   - List entries using `WaitlistEntryRow` component, passing `removeWaitlistEntry` as the action prop (import from `@/actions/waitlist`)

## Must-Haves

- [ ] Waitlist nav item appears between Students and Settings in `navItems` array
- [ ] `removeWaitlistEntry` server action authenticates, verifies teacher ownership, deletes entry, revalidates path
- [ ] `WaitlistEntryRow` shows email, join date, notified status; delete button uses useTransition + toast
- [ ] `/dashboard/waitlist` page queries waitlist entries for authed teacher, renders list or empty state
- [ ] Empty state is contextual: no capacity_limit → prompt to set one; no entries → "No one on your waitlist yet"
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npm run build` exits 0 with `/dashboard/waitlist` in route manifest

## Inputs

- `src/lib/nav.ts` — existing nav items array to extend
- `src/app/(dashboard)/dashboard/students/page.tsx` — pattern reference for RSC dashboard page (auth check, teacher lookup, query, render)
- `src/components/dashboard/ConfirmedSessionCard.tsx` — pattern reference for client component with server action prop + useTransition + toast
- `src/lib/supabase/server.ts` — `createClient()` for authed Supabase client

## Expected Output

- `src/app/(dashboard)/dashboard/waitlist/page.tsx` — new RSC dashboard page
- `src/actions/waitlist.ts` — new server action for waitlist entry deletion
- `src/components/dashboard/WaitlistEntryRow.tsx` — new client component for waitlist row with delete
- `src/lib/nav.ts` — modified: new Waitlist nav item added

## Verification

```
npx tsc --noEmit && npm run build | grep -q 'dashboard/waitlist'
```
