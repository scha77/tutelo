---
estimated_steps: 51
estimated_files: 5
skills_used: []
---

# T03: Children CRUD API routes and BookingCalendar child selector graft

Create the children CRUD API endpoints and graft the child selector into BookingCalendar.tsx. Update BookingRequestSchema to accept optional `child_id` and pass it through the booking creation flow.

## Steps

1. Create `src/app/api/parent/children/route.ts` — GET + POST:
   - GET: `getUser()` → 401 if not authenticated. Query `children` where `parent_id = user.id`, order by `created_at`. Return JSON array.
   - POST: `getUser()` → 401. Parse body with Zod: `{ name: string (1-100 chars), grade?: string (max 50 chars) }`. Insert via `supabaseAdmin` with `parent_id = user.id`. Return created child JSON.

2. Create `src/app/api/parent/children/[id]/route.ts` — PUT + DELETE:
   - PUT: `getUser()` → 401. Fetch child by id, verify `parent_id = user.id` → 404 if not owner. Update name/grade. Return updated child.
   - DELETE: `getUser()` → 401. Fetch child by id, verify `parent_id = user.id` → 404 if not owner. Delete. Return 204.
   - Both routes: validate `id` param is UUID.

3. Update `src/lib/schemas/booking.ts`:
   - Add `child_id: z.string().uuid().optional()` to `BookingRequestSchema`
   - Add `childId: z.string().uuid().optional()` to `RecurringBookingSchema`

4. Update `src/app/api/direct-booking/create-intent/route.ts`:
   - Destructure `childId` from validated body (alongside existing fields)
   - Add `child_id: childId ?? null` to the bookings INSERT object
   - No other changes needed — `student_name` is still populated from `studentName`

5. Graft child selector into `src/components/profile/BookingCalendar.tsx`:
   - Add `childId: string | null` to form state (default `null`)
   - Add `children` state: `{ id: string; name: string; grade: string | null }[]` (default `[]`)
   - Add `childrenLoaded` state boolean (default `false`)
   - In a `useEffect` on mount: call `supabase.auth.getUser()`. If user exists, fetch `GET /api/parent/children`. Set `children` state + `childrenLoaded = true`.
   - In the form JSX (around line 706-720, the student name field):
     - If `childrenLoaded && children.length > 0`: render `<Select>` with children as options + 'Someone else (type name)' option. When a child is selected, set `form.name = child.name` and `form.childId = child.id`. When 'Someone else' selected, set `form.childId = null` and show the text `<Input>`.
     - If user logged in but no children: show existing text `<Input>` unchanged
     - If user not logged in: show existing text `<Input>` unchanged
   - Update `createPaymentIntent()` to include `childId: form.childId` in the POST body
   - Update `createRecurringIntent()` to include `childId: form.childId` in the POST body
   - Update `handleSubmit()` deferred path to include `childId: form.childId`

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| GET /api/parent/children | Set children=[], show text input | Set children=[], show text input | Set children=[], show text input |
| supabase.auth.getUser() | Treat as guest, show text input | Treat as guest, show text input | Treat as guest, show text input |

## Negative Tests

- **Malformed inputs**: POST /api/parent/children with empty name → 400; with name > 100 chars → 400; with missing body → 400
- **Error paths**: GET /api/parent/children without auth → 401; DELETE /api/parent/children/[id] with non-owner id → 404
- **Boundary conditions**: Parent with 0 children → text input shown; parent with 1 child → select shown with that child + 'Someone else'

## Must-Haves

- [ ] GET /api/parent/children returns only the authenticated parent's children
- [ ] POST /api/parent/children validates name and creates child
- [ ] PUT /api/parent/children/[id] verifies ownership before update
- [ ] DELETE /api/parent/children/[id] verifies ownership before delete
- [ ] BookingRequestSchema accepts optional child_id
- [ ] create-intent route passes child_id to booking INSERT
- [ ] BookingCalendar shows Select for logged-in parent with children
- [ ] BookingCalendar falls back to text Input for guests
- [ ] Selecting a child sets both form.name (child's name) and form.childId

## Verification

- `npx tsc --noEmit` passes
- `npx next build` succeeds
- Manual: API routes return correct responses (tested via curl or browser dev tools)

## Inputs

- ``src/lib/supabase/server.ts` — createClient for auth in API routes`
- ``src/lib/supabase/service.ts` — supabaseAdmin for mutations`
- ``src/lib/schemas/booking.ts` — existing BookingRequestSchema to extend`
- ``src/app/api/direct-booking/create-intent/route.ts` — existing booking creation to add child_id`
- ``src/components/profile/BookingCalendar.tsx` — 856-line booking form to graft child selector into`
- ``supabase/migrations/0017_children_and_parent_dashboard.sql` — children table schema (from T01)`

## Expected Output

- ``src/app/api/parent/children/route.ts` — GET + POST children API`
- ``src/app/api/parent/children/[id]/route.ts` — PUT + DELETE child API`
- ``src/lib/schemas/booking.ts` — updated with optional child_id`
- ``src/app/api/direct-booking/create-intent/route.ts` — updated to pass child_id to booking INSERT`
- ``src/components/profile/BookingCalendar.tsx` — updated with child selector`

## Verification

npx tsc --noEmit && npx next build
