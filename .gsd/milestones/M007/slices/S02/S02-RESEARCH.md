# S02 Research: Waitlist Dashboard + Notifications

**Written:** 2026-03-26
**Slice:** S02 — Waitlist Dashboard + Notifications
**Milestone:** M007 — Capacity & Pricing
**Status:** Ready to plan

---

## Summary

S02 is straightforward application of established patterns to known code. All infrastructure is already in place from S01: the `waitlist` table with RLS, `supabaseAdmin`, `src/lib/utils/capacity.ts` (including `getCapacityStatus()`), and `cancelSession` in `src/actions/bookings.ts` with its fire-and-forget email pattern. The slice has three distinct deliverables:

1. **Waitlist dashboard page** — `/dashboard/waitlist` RSC that lists parent emails + join dates and allows row deletion (server action). Follows the identical pattern as `/dashboard/students` page.
2. **WaitlistNotificationEmail** React Email component + `sendWaitlistNotificationEmail()` in `src/lib/email.ts`.
3. **`checkAndNotifyWaitlist(teacherId)`** utility + hook into `cancelSession` (fire-and-forget after DB update).

The only judgment call: `markSessionComplete` does NOT free capacity under the 90-day window model (completing a session keeps the student counted as active for 90 days), so `checkAndNotifyWaitlist` should hook only into `cancelSession`, not `markSessionComplete`. This was flagged in the milestone research and is confirmed by reading the capacity logic in `src/lib/utils/capacity.ts`.

The nav item question (where does "Waitlist" live in the sidebar?) is the only meaningful design choice. Two options: new nav item between Students and Settings, or fold into the Settings page as a sub-section. Given that the waitlist is a teacher operational tool (not account configuration), a dedicated nav page matches the pattern of `/dashboard/students`.

---

## Requirements This Slice Owns

- **WAIT-02** — Teacher sees waitlist in dashboard and can manage entries (view, remove)
- **WAIT-03** — Waitlisted parents auto-notified via email with direct booking link when capacity frees up

---

## Implementation Landscape

### What Exists (from S01)

| Asset | Location | What It Provides |
|---|---|---|
| `waitlist` table | migration 0011 | `id, teacher_id, parent_email, created_at, notified_at`, UNIQUE(teacher_id, parent_email), RLS with teacher SELECT+DELETE, anon INSERT |
| `supabaseAdmin` | `src/lib/supabase/service.ts` | Service-role client using `SUPABASE_SERVICE_SECRET_KEY` |
| `getCapacityStatus()` | `src/lib/utils/capacity.ts` | Async utility to recount active students after cancellation |
| `isAtCapacity()` | `src/lib/utils/capacity.ts` | Pure comparator (activeCount, limit) |
| `cancelSession` action | `src/actions/bookings.ts` | Where notification hook goes (after DB update, fire-and-forget) |
| 15 capacity unit tests | `tests/unit/capacity.test.ts` | Test patterns for new utility tests |
| `cancel-session.test.ts` | `src/__tests__/cancel-session.test.ts` | Test patterns for `cancelSession` mutation tests |
| Fire-and-forget pattern | `src/actions/bookings.ts` | `.catch(console.error)` for all email/SMS sends |

### What Does NOT Exist Yet

- `/dashboard/waitlist` route (page.tsx + server action for delete)
- `WaitlistDashboard` client component (or inline client delete action)
- `WaitlistNotificationEmail.tsx` in `src/emails/`
- `sendWaitlistNotificationEmail()` in `src/lib/email.ts`
- `checkAndNotifyWaitlist()` utility (can live in `src/lib/utils/capacity.ts` or a new `src/lib/utils/waitlist.ts`)
- Nav entry for `/dashboard/waitlist` in `src/lib/nav.ts`

---

## File-by-File Implementation Plan

### 1. `/dashboard/waitlist` page (new RSC)

**File:** `src/app/(dashboard)/dashboard/waitlist/page.tsx`

Pattern: identical to `students/page.tsx`. Auth check → teacher lookup → query `waitlist` table ordered by `created_at` ascending → render list with delete button.

```tsx
// Query waitlist for this teacher (uses createClient — teacher is authed)
const { data: entries } = await supabase
  .from('waitlist')
  .select('id, parent_email, created_at, notified_at')
  .eq('teacher_id', teacher.id)
  .order('created_at', { ascending: true })
```

The RLS `waitlist_teacher_select` policy gates this correctly — the teacher's session restricts results to their own entries.

**Deletion:** Use a server action (analogous to how `cancelSession` is passed to `ConfirmedSessionCard`). Two options:
- Inline server action in page.tsx (simple, fine for MVP)
- Separate `src/actions/waitlist.ts` file

**Recommendation:** A thin `removeWaitlistEntry(entryId: string)` server action in a new `src/actions/waitlist.ts`. Follows the same pattern as `cancelSession`: auth → teacher lookup → delete `.eq('id', entryId).eq('teacher_id', teacher.id)` + `revalidatePath('/dashboard/waitlist')`. The teacher_id guard prevents cross-teacher deletion.

**Client component for delete:** The page is an RSC, but the delete button needs interactivity. Two patterns in codebase:
1. Pass server action as prop to a client `WaitlistDashboard` component (analogous to `ConfirmedSessionCard` receiving `cancelSessionAction`)
2. Use a `<form action={serverAction}>` in the RSC directly

Pattern 2 (`<form action>` with `useTransition` in a client component wrapper) is cleaner. The `RequestCard` and `ConfirmedSessionCard` both receive server actions as props — use that same pattern with a `WaitlistEntryRow` client component that handles the delete confirmation + pending state.

### 2. Nav entry

**File:** `src/lib/nav.ts`

Add a `Waitlist` nav item. The nav is consumed by `Sidebar` (desktop) and `MobileBottomNav` (mobile). Current nav has 8 items; mobile uses ~53px per tab at 375px — already tight. Adding a 9th item would push tabs to ~47px, which is below comfortable thumb target size.

**Options:**
- Add between Students and Settings: most logical placement
- Only show in nav when teacher has capacity_limit enabled: conditional nav items are not a pattern in this codebase (all items always visible) — adds complexity for minimal UX gain

**Recommendation:** Add as a standard nav item between Students and Settings. Use `Users` or a `ListOrdered` icon from `lucide-react`. Mobile tab bar will be slightly tighter but functional. The alternative (folding into Settings page) would bury operational data inside configuration.

**Icon:** `Clock` is already used by `AtCapacitySection`. Good candidates: `ListOrdered`, `UserClock`, or `Users2` from lucide-react. Check availability: lucide-react v0.577.0 should have `ListOrdered`.

### 3. `WaitlistNotificationEmail.tsx`

**File:** `src/emails/WaitlistNotificationEmail.tsx`

Follow the `SessionCompleteEmail` pattern exactly: React Email, same container styling (`maxWidth: 520px`, `#ffffff` bg, `#e5e7eb` border), `Button` component from `@react-email/components` for the CTA.

Props:
```tsx
interface WaitlistNotificationEmailProps {
  teacherName: string
  bookingLink: string  // https://tutelo.app/[slug]
}
```

No `parentEmail` prop needed — the email is sent TO the parent, so the "To" address is already set at the Resend call site. The `parentEmail` prop was discussed in M007 research as informational only (for unsubscribe context) but is unnecessary overhead at MVP.

Content:
- Subject: `A spot just opened up — book with [teacherName]`
- Body: "Good news! A tutoring slot has opened up with [teacherName]. Click below to book your session — spots fill up fast."
- CTA button: "Book a Session" → `bookingLink`
- Footer: "You're receiving this because you joined the waitlist for [teacherName] on Tutelo. Reply to this email if you'd like to be removed."

### 4. `sendWaitlistNotificationEmail()` in `src/lib/email.ts`

**Pattern:** Follows `sendCancellationEmail()` exactly. Uses `supabaseAdmin` (no user session in the notification call path). Fetches `teachers(full_name, slug)` from the entry's `teacher_id` context. Sends one email per recipient — Resend handles each `send()` call individually.

```ts
export async function sendWaitlistNotificationEmail(
  parentEmail: string,
  teacherName: string,
  teacherSlug: string
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tutelo.app'
  await resend.emails.send({
    from: 'Tutelo <noreply@tutelo.app>',
    to: parentEmail,
    subject: `A spot just opened up — book with ${teacherName}`,
    react: WaitlistNotificationEmail({
      teacherName,
      bookingLink: `${appUrl}/${teacherSlug}`,
    }),
  })
}
```

**Note:** The function signature takes `parentEmail` + `teacherName` + `teacherSlug` as flat strings — not a waitlist entry ID. This avoids a supabaseAdmin lookup inside the email function itself (the caller already has this data from the `checkAndNotifyWaitlist` query).

### 5. `checkAndNotifyWaitlist()` utility

**File:** `src/lib/utils/waitlist.ts` (new) — or could extend `capacity.ts`, but separating keeps capacity.ts focused on counting logic.

```ts
export async function checkAndNotifyWaitlist(teacherId: string): Promise<void>
```

Logic:
1. Fetch `capacity_limit` from `teachers` via `supabaseAdmin` — if null, return early (no cap, no notification needed)
2. Call `getCapacityStatus(supabaseAdmin, teacherId, capacity_limit)` — if NOT at capacity
3. If capacity freed: fetch `waitlist` entries where `teacher_id = teacherId AND notified_at IS NULL` via `supabaseAdmin`
4. If no unnotified entries: return
5. Fetch teacher `slug` (needed for booking link) — already has `capacity_limit` from step 1, extend select to include `slug, full_name`
6. Send `sendWaitlistNotificationEmail()` for each entry (await each send — small lists at MVP scale, no parallelism needed)
7. Stamp `notified_at = NOW()` on each notified entry via `supabaseAdmin`

**Why `supabaseAdmin` throughout:** `checkAndNotifyWaitlist` is called from `cancelSession` which is a server action with a user session, but the waitlist notify logic needs to update `notified_at` — which is NOT covered by RLS (`waitlist_teacher_select` and `waitlist_teacher_delete` exist, but no UPDATE policy). Service role is required for `notified_at` stamping.

**Step 7 detail — batch update:** After collecting all notified entry IDs, do a single `supabaseAdmin.from('waitlist').update({ notified_at: new Date().toISOString() }).in('id', notifiedIds)` rather than N individual updates.

**Error handling:** Wrap entire function in try/catch with `console.error('[waitlist] checkAndNotifyWaitlist failed', { teacher_id: teacherId, error })`. Individual send failures inside the loop should be caught per-entry to avoid one bad email address blocking all others.

### 6. Hook into `cancelSession`

**File:** `src/actions/bookings.ts`

Add after the existing `sendSmsCancellation` fire-and-forget (line ~185):

```ts
// Fire waitlist notifications if teacher has capacity and a slot just freed
const { checkAndNotifyWaitlist } = await import('@/lib/utils/waitlist')
checkAndNotifyWaitlist(teacher.id).catch(console.error)
```

The dynamic import matches the pattern used for all other fire-and-forget calls (`sendCancellationEmail`, `sendSmsCancellation`). `teacher.id` is already in scope.

**Why NOT `markSessionComplete`:** Completing a session does NOT free capacity. The active student count uses `status IN ('confirmed', 'completed') AND booking_date >= 90 days ago`. A completed booking still counts the student as active for 90 days. Triggering `checkAndNotifyWaitlist` on `markSessionComplete` would always find the same or higher active count — the notification would never fire (no-op). Confirmed in the capacity utility: the query includes `completed` status deliberately. Only `cancelSession` (changing `confirmed` → `cancelled`) actually reduces the active student count.

---

## Key Constraints

### `notified_at` needs UPDATE RLS or service role

The migration 0011 has no `UPDATE` policy on `waitlist`. The service-role `supabaseAdmin` bypasses RLS — that's the path. Do NOT add an UPDATE RLS policy (no use case for teacher-facing update; notified_at is system-stamped only).

### `getCapacityStatus` takes `supabase: SupabaseClient` — must use `supabaseAdmin`

The `getCapacityStatus` signature is `(supabase: SupabaseClient, teacherId, capacityLimit)`. In `checkAndNotifyWaitlist`, pass `supabaseAdmin` directly (it satisfies `SupabaseClient`). This works identically to how `sendCancellationEmail` uses `supabaseAdmin`.

### Nav item count and mobile tab bar

The mobile `MobileBottomNav` currently has 8 items (7 nav + 1 sign-out). Adding a Waitlist nav item brings it to 9 items (8 nav + sign-out). The mobile tab uses icon-only layout — no labels visible (per `sr-only` pattern in the component). At 375px, this is ~41px per tab — still acceptable. The Waitlist item could also be shown only when `capacity_limit` is set, but this requires passing teacher data into the nav (currently nav items are static constants). Simpler to show always.

### Test patterns already established

- `cancel-session.test.ts` in `src/__tests__/` uses `vi.hoisted()` + `vi.mock()` + `buildMockClient()` helper — the pattern for testing `cancelSession` mutations
- `tests/unit/capacity.test.ts` uses `makeMockSupabase()` helper — the pattern for testing utilities with mocked Supabase
- New unit tests for `checkAndNotifyWaitlist` should live in `tests/unit/waitlist-notify.test.ts`
- New tests for `removeWaitlistEntry` should extend `src/__tests__/` (integration-style with server action mocking)

---

## Natural Task Seams

**T01 — Notification infrastructure** (email + utility)
- `src/emails/WaitlistNotificationEmail.tsx` — React Email component
- `src/lib/email.ts` — add `sendWaitlistNotificationEmail()` export
- `src/lib/utils/waitlist.ts` — `checkAndNotifyWaitlist()` utility
- `tests/unit/waitlist-notify.test.ts` — unit tests for `checkAndNotifyWaitlist`
- Verify: `npx vitest run tests/unit/waitlist-notify.test.ts` passes

**T02 — `cancelSession` hook + integration**
- `src/actions/bookings.ts` — add fire-and-forget `checkAndNotifyWaitlist` call after SMS
- Update `src/__tests__/cancel-session.test.ts` — add test asserting `checkAndNotifyWaitlist` is called on happy path
- Verify: full cancel-session test suite still passes; `tsc --noEmit` clean

**T03 — Waitlist dashboard page + nav**
- `src/lib/nav.ts` — add Waitlist nav item
- `src/actions/waitlist.ts` — `removeWaitlistEntry(entryId)` server action
- `src/components/dashboard/WaitlistEntryRow.tsx` — client component with delete button (useTransition + toast pattern)
- `src/app/(dashboard)/dashboard/waitlist/page.tsx` — RSC page
- Verify: `npm run build` passes with `/dashboard/waitlist` in route manifest; page renders in dev

**Build order dependency:** T01 must complete before T02 (T02 imports `checkAndNotifyWaitlist` from T01's utility file). T03 is independent of T01/T02 — can be built in parallel or after.

---

## Verification Strategy

1. `npx vitest run tests/unit/waitlist-notify.test.ts` — utility unit tests pass
2. `npx vitest run src/__tests__/cancel-session.test.ts` — cancel-session tests still pass + new assertion passes
3. `npx tsc --noEmit` — exits 0, no type errors
4. `npm run build` — exits 0, `/dashboard/waitlist` present in route manifest
5. Manual smoke: teacher dashboard shows Waitlist nav item; `/dashboard/waitlist` page renders empty state (no data needed in test env)

---

## Forward Intelligence

- **`supabaseAdmin` env var name is `SUPABASE_SERVICE_SECRET_KEY`** (NOT `SERVICE_ROLE_KEY`) — confirmed in `src/lib/supabase/service.ts`. Any new code referencing this must use the same key name.
- **`getCapacityStatus` counts `confirmed` + `completed` bookings** — completing a session does NOT free capacity. Only `cancelSession` is the correct hook point for `checkAndNotifyWaitlist`.
- **`notified_at` batch-update via `.in('id', ids)`** after sending all emails — more efficient than N individual updates, and avoids partial-notification state if some emails fail (consider: stamp only successful sends, or stamp all at end; recommend stamp at end in a batch for simplicity).
- **Dynamic import pattern for fire-and-forget** — `const { checkAndNotifyWaitlist } = await import('@/lib/utils/waitlist')` matches the exact pattern used for `sendCancellationEmail` and `sendSmsCancellation` in `cancelSession`. Do not use a static import (all other fire-and-forget email/SMS calls use dynamic imports).
- **`revalidatePath('/dashboard/waitlist')`** needed in `removeWaitlistEntry` action — same pattern as `revalidatePath('/dashboard/sessions')` in `cancelSession`.
- **Email send is `await` (not fire-and-forget) inside `checkAndNotifyWaitlist`** — unlike the booking notification emails, the waitlist notification is itself already inside a fire-and-forget wrapper (`checkAndNotifyWaitlist(...).catch(console.error)`). So individual `sendWaitlistNotificationEmail()` calls within the loop can be awaited without blocking the user-facing response.
- **Lucide icon for Waitlist nav:** `ListOrdered` is available in lucide-react v0.577.0. `Clock` is already used in `AtCapacitySection` but not imported in nav.ts — still usable if preferred. `ListOrdered` is more semantically correct (an ordered waitlist).
- **`teacher.id` vs `teacher.user_id` in capacity query:** `getCapacityStatus` takes `teacherId` which is `teachers.id` (UUID), not `user_id`. In `cancelSession`, the in-scope `teacher.id` is already the correct UUID — no translation needed.
- **Waitlist page empty state:** When teacher has capacity_limit=null or waitlist is empty, show a contextual empty state. If `capacity_limit` is null, explain the feature is tied to capacity settings. If capacity_limit is set but no waitlist entries, show "No one on your waitlist yet."
- **The `cancel-session.test.ts` uses `vi.resetModules()` + re-applies all mocks in `beforeEach`** — any new mock for `checkAndNotifyWaitlist` must be added to both the top-level `vi.mock()` and the `beforeEach` re-application block.
