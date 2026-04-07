---
estimated_steps: 19
estimated_files: 2
skills_used: []
---

# T02: Wire updateTag invalidation into server actions and verify full build

Server actions that mutate bookings or waitlist entries must invalidate the corresponding page caches via `updateTag`. This ensures that after a teacher accepts/declines a request, completes/cancels a session, or removes a waitlist entry, the cached data is immediately refreshed.

## Steps

1. Open `src/actions/bookings.ts`. Add `updateTag` calls to these actions (alongside existing `updateTag('overview-${teacher.id}')` calls):
   - `acceptBooking`: add `updateTag(\`requests-${teacher.id}\`)` — request is removed from list (status requested→pending)
   - `declineBooking`: add `updateTag(\`requests-${teacher.id}\`)` — request is removed from list (status requested→cancelled)
   - `markSessionComplete`: add `updateTag(\`sessions-${teacher.id}\`)` and `updateTag(\`students-${teacher.id}\`)` — session status changes, new student may appear in students list
   - `cancelSession`: add `updateTag(\`sessions-${teacher.id}\`)` — session removed from upcoming
   - `cancelSingleRecurringSession`: add `updateTag(\`sessions-${teacher.id}\`)` — session removed
   - `cancelRecurringSeries`: add `updateTag(\`sessions-${teacher.id}\`)` — multiple sessions removed

2. Open `src/actions/waitlist.ts`. Add `import { updateTag } from 'next/cache'` (currently only imports `revalidatePath`). In `removeWaitlistEntry`, add `updateTag(\`waitlist-${teacher.id}\`)` after the delete operation succeeds.

3. Run `npx tsc --noEmit` — verify zero type errors.

4. Run `npx vitest run` — verify all tests pass. The existing test mocks already mock `updateTag` from `next/cache`, so new calls won't break tests. If any test explicitly asserts `updateTag` call count, update the expected count.

5. Run `npm run build` — verify build succeeds with no errors.

## Key constraints
- `updateTag` (not `revalidateTag`) — per research, `revalidateTag` without second argument is deprecated in Next.js 16.1.6
- `updateTag` is already imported in `bookings.ts` — just add new calls
- `waitlist.ts` needs a new import: change `import { revalidatePath } from 'next/cache'` to `import { revalidatePath, updateTag } from 'next/cache'`
- `acceptBooking` does NOT need `sessions-${teacher.id}` tag — status goes to `pending`, not `confirmed`
- Place `updateTag` calls near existing `revalidatePath`/`updateTag` calls for consistency

## Inputs

- ``src/actions/bookings.ts` — server actions with existing updateTag('overview-...') calls`
- ``src/actions/waitlist.ts` — server action with only revalidatePath currently`
- ``src/app/(dashboard)/dashboard/requests/page.tsx` — T01 output with cache tag `requests-${teacherId}``
- ``src/app/(dashboard)/dashboard/sessions/page.tsx` — T01 output with cache tag `sessions-${teacherId}``
- ``src/app/(dashboard)/dashboard/students/page.tsx` — T01 output with cache tag `students-${teacherId}``
- ``src/app/(dashboard)/dashboard/waitlist/page.tsx` — T01 output with cache tag `waitlist-${teacherId}``

## Expected Output

- ``src/actions/bookings.ts` — updated with updateTag calls for requests, sessions, and students cache tags`
- ``src/actions/waitlist.ts` — updated with updateTag import and call for waitlist cache tag`

## Verification

npx tsc --noEmit && npx vitest run && npm run build
