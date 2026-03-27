---
estimated_steps: 11
estimated_files: 2
skills_used: []
---

# T02: Wire SessionTypeManager into settings page + fetch session types in profile RSC

Two wiring changes:

**Settings page** (`src/app/(dashboard)/dashboard/settings/page.tsx`):
1. Add `id` to the teacher select string (currently missing — needed to query session_types by teacher.id)
2. After the teacher query, fetch session_types: `supabase.from('session_types').select('id, label, price, duration_minutes, sort_order').eq('teacher_id', teacher.id).order('sort_order')`
3. Import `SessionTypeManager` from `@/components/dashboard/SessionTypeManager`
4. Render `<SessionTypeManager sessionTypes={sessionTypes ?? []} />` between `CapacitySettings` and `SchoolEmailVerification`

Note: The existing bookings query uses `eq('teacher_id', userId)` where userId is the auth UID. For session_types, we must use `teacher.id` (the teachers table PK from the `id` we just added to select). The teacher object's `.id` field is the UUID PK, not the auth UID.

**Profile page** (`src/app/[slug]/page.tsx`):
1. After the reviews query, fetch session_types: `supabase.from('session_types').select('id, label, price, duration_minutes, sort_order').eq('teacher_id', teacher.id).order('sort_order')`
2. Pass `sessionTypes={sessionTypes ?? []}` as a new prop to `<BookingCalendar>` (the component will accept this prop after T03, but TypeScript won't error because T03 adds the prop — for now just pass it and the type will be resolved when T03 is done)

**Requirements advanced:** SESS-01 (session type management in settings), SESS-02 (session types data pipeline to profile page)

## Inputs

- ``src/app/(dashboard)/dashboard/settings/page.tsx` — existing settings page to add session_types fetch + SessionTypeManager render`
- ``src/app/[slug]/page.tsx` — existing profile RSC to add session_types fetch and pass to BookingCalendar`
- ``src/components/dashboard/SessionTypeManager.tsx` — pre-built component (S02), just import and render`

## Expected Output

- ``src/app/(dashboard)/dashboard/settings/page.tsx` — extended with teacher.id select, session_types fetch, SessionTypeManager render`
- ``src/app/[slug]/page.tsx` — extended with session_types fetch and sessionTypes prop passed to BookingCalendar`

## Verification

npx tsc --noEmit 2>&1 | head -20
