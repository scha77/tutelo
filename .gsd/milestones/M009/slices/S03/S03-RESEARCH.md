# S03 Research: Cancellation & Dashboard Series UX

**Slice:** Cancellation & Dashboard Series UX  
**Milestone:** M009 — Recurring Sessions  
**Depends on:** S01 (schema, booking rows, recurring_schedule_id), S02 (payment_failed status, auto-charge cron)  
**Depth:** Targeted — well-understood Next.js/Supabase patterns, new UI surfaces but established templates throughout.

---

## Summary

S03 delivers two user-facing surfaces:

1. **Teacher dashboard** — sessions list augmented with a recurring series badge on recurring bookings; a "Cancel Series" action in addition to the existing single-session cancel.
2. **Parent self-service cancellation** — secure token-based page (`/manage/[token]`) where parents can cancel individual sessions or the entire remaining series via a link sent in email.

The codebase has extremely mature patterns for both surfaces. The token-based page follows the `review/[token]` RSC pattern exactly. The dashboard sessions page already has `ConfirmedSessionCard` + `cancelSession` action — S03 extends these minimally. A migration is needed to add a `cancel_token` column to `recurring_schedules`.

---

## Requirements Owned

- **RECUR-04** — Teacher and parent can cancel individual sessions or series
- **RECUR-08** — Parent self-service cancellation via secure link/page
- **RECUR-09** — Recurring sessions visible in dashboard with series badge

---

## Implementation Landscape

### 1. Database Migration (`0016_cancel_token.sql`)

The parent self-service page needs a secure, unguessable token stored on `recurring_schedules`. Pattern is identical to `school_email_verification_token` on teachers (migration 0010) and `token` on reviews (migration 0006):

```sql
ALTER TABLE recurring_schedules
  ADD COLUMN IF NOT EXISTS cancel_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS cancel_token_created_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_recurring_schedules_cancel_token
  ON recurring_schedules (cancel_token)
  WHERE cancel_token IS NOT NULL;
```

The token should be generated in `create-recurring/route.ts` using `randomBytes(32).toString('hex')` (same as `reviewToken` in `markSessionComplete`). The cancel_token is stored at schedule creation time and included in the confirmation email.

**Token generation decision:** Generate at recurring schedule creation time in `create-recurring/route.ts` and store on `recurring_schedules`. This avoids a separate token-generation endpoint and means the token is immediately available for the confirmation email link. Token does not expire (series could run for 6 months).

**RLS:** The `/manage/[token]` page uses `supabaseAdmin` (service role) to look up by token, same as `review/[token]/page.tsx`. No RLS policy needed for token lookup — supabaseAdmin bypasses RLS.

**Note:** S01 already created `recurring_schedules` without `cancel_token`. Migration 0016 adds it via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.

### 2. Cancellation Server Actions (`src/actions/bookings.ts` extension)

Two new server actions, following `cancelSession` patterns exactly:

**`cancelSingleRecurringSession(bookingId: string)`**
- Teacher-authenticated (same as existing `cancelSession`)
- Verify booking belongs to teacher + is in `confirmed` or `requested` status
- Must handle `is_recurring_first` booking specially: if the first booking is cancelled, its PI has `capture_method: 'manual'` and must be voided via `stripe.paymentIntents.cancel()`
- Non-first bookings that were charged by the cron also have a PI (`status: 'confirmed'`): must cancel via `stripe.paymentIntents.cancel()` 
- Non-first bookings still in `requested` status (not yet charged by cron): no PI to void
- `payment_failed` bookings: no PI to void (status already terminal)
- Update single booking `status: 'cancelled'`
- Send `sendCancellationEmail(bookingId)` fire-and-forget (existing function works as-is — no recurring-specific template needed for single cancellation)
- `revalidatePath('/dashboard/sessions')`

**`cancelRecurringSeries(scheduleId: string)`**
- Teacher-authenticated
- Fetch all non-cancelled future bookings for this `recurring_schedule_id`
- For each: void PI if present (same Stripe logic as above per-booking)
- Batch update: `status: 'cancelled'` for all future bookings (date >= today)
- Send a single series-level cancellation notification email (new template or reuse existing `CancellationEmail` with series context)
- `revalidatePath('/dashboard/sessions')`

**Important:** The existing `cancelSession` in `bookings.ts` is teacher-auth only and checks `.eq('status', 'confirmed')`. For recurring series, bookings can be in `requested` or `payment_failed` status too — the new actions need to handle all cancellable statuses: `['requested', 'confirmed', 'payment_failed']`.

**Parent token-based cancellation** (for `/manage/[token]`):
- No auth required — token is the authentication
- New API route or server action: look up `recurring_schedule_id` by token, verify token matches
- Same cancellation logic as teacher cancel but token-gated instead of session-gated
- Two endpoints needed: cancel-single (takes `bookingId` + token, verifies booking belongs to this schedule) and cancel-series (takes token)

### 3. Dashboard Sessions Page Extension

**File:** `src/app/(dashboard)/dashboard/sessions/page.tsx`

Current query:
```ts
supabase.from('bookings').select('id, student_name, subject, booking_date, start_time, parent_email')
  .eq('teacher_id', teacher.id).eq('status', 'confirmed')
```

Changes needed:
- Add `recurring_schedule_id, is_recurring_first` to the select
- Include `payment_failed` in status filter (payment_failed bookings should still show in upcoming with a warning badge)
- Pass `recurringScheduleId` to `ConfirmedSessionCard` for series badge display

**`ConfirmedSessionCard` extension (`src/components/dashboard/ConfirmedSessionCard.tsx`):**

Currently a self-contained client component with `cancelSessionAction` prop. Changes:
- Add optional `recurringScheduleId?: string | null` prop
- When `recurringScheduleId` is set, render a "Recurring" badge (e.g., amber/blue pill alongside existing "Confirmed" badge)
- Add "Cancel Series" button that calls `cancelRecurringSeries(recurringScheduleId)`  
- Keep existing "Cancel Session" button for single-session cancel
- Add `cancelSeriesAction` prop (optional, only shown when `recurringScheduleId` present)

**Booking query must also include `payment_failed` status** to show those sessions with a distinctive badge so the teacher can see charge failures. The `ConfirmedSessionCard` should render a "Payment Failed" amber badge when status is `payment_failed`.

### 4. `/manage/[token]` Parent Self-Service Cancellation Page

**File:** `src/app/manage/[token]/page.tsx` (new RSC)

Pattern: identical to `src/app/review/[token]/page.tsx` — RSC shell resolves token, renders client form.

```
/manage/[token]/
  page.tsx         — RSC: look up schedule by cancel_token via supabaseAdmin
  CancelSeriesForm.tsx — client: cancel individual sessions or all remaining
```

The RSC:
1. Looks up `recurring_schedules` by `cancel_token` via `supabaseAdmin`
2. Fetches all future non-cancelled bookings for this schedule
3. If not found → "invalid link" error state
4. If all cancelled → "series already cancelled" state
5. Renders `CancelSeriesForm` with session list + cancel options

The client form (`CancelSeriesForm.tsx`):
- Shows list of upcoming sessions with checkboxes or individual cancel buttons
- "Cancel This Session" per row (calls cancel-single API)
- "Cancel All Remaining" button (calls cancel-series API)
- Confirm dialog before destructive action
- Success state after cancel

**API routes for token-gated cancellation** (no auth, token is the key):
- `POST /api/manage/cancel-session` — body: `{ bookingId, token }`, verifies booking belongs to schedule with that token, voids PI, sets cancelled
- `POST /api/manage/cancel-series` — body: `{ token }`, cancels all future bookings for schedule

### 5. Email Templates

**Include cancel link in existing `RecurringBookingConfirmationEmail`:**
- Add `manageUrl` prop: `https://tutelo.app/manage/{cancel_token}`
- Render as "Manage your series" link in the parent variant

**New `SeriesCancellationEmail` template** (for when teacher or parent cancels the series):
- Similar to `CancellationEmail.tsx` but shows all cancelled session dates
- Or: reuse `CancellationEmail` per-session and send one email total — simpler
- Decision: Send a single series summary email rather than N individual cancellation emails. New `RecurringCancellationEmail.tsx` following established dual-variant pattern (parent + teacher).

**`src/lib/email.ts`** additions:
- `sendSeriesCancellationEmail({ scheduleId, cancelledByTeacher })` — fetches schedule + bookings internally, sends parent + teacher emails

### 6. `create-recurring/route.ts` Modification

Add token generation + storage:
```ts
const cancelToken = randomBytes(32).toString('hex')
// In the recurring_schedules insert:
{ ..., cancel_token: cancelToken }
// Pass to email:
manageUrl: `${appUrl}/manage/${cancelToken}`
```

The `RecurringBookingConfirmationEmail` gets a new optional `manageUrl` prop for the parent variant.

---

## Key Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/0016_cancel_token.sql` | Create | Add `cancel_token` + index to `recurring_schedules` |
| `src/app/api/direct-booking/create-recurring/route.ts` | Modify | Generate + store `cancel_token`, pass `manageUrl` to email |
| `src/emails/RecurringBookingConfirmationEmail.tsx` | Modify | Add `manageUrl` optional prop for parent manage link |
| `src/emails/RecurringCancellationEmail.tsx` | Create | Dual-variant email for series cancellation (parent + teacher) |
| `src/lib/email.ts` | Modify | Add `sendRecurringCancellationEmail` |
| `src/actions/bookings.ts` | Modify | Add `cancelSingleRecurringSession` + `cancelRecurringSeries` (teacher-gated) |
| `src/app/api/manage/cancel-session/route.ts` | Create | Token-gated single-session cancel (parent self-service) |
| `src/app/api/manage/cancel-series/route.ts` | Create | Token-gated series cancel (parent self-service) |
| `src/app/manage/[token]/page.tsx` | Create | RSC shell for parent manage page |
| `src/app/manage/[token]/CancelSeriesForm.tsx` | Create | Client form for manage page |
| `src/app/(dashboard)/dashboard/sessions/page.tsx` | Modify | Add recurring_schedule_id + payment_failed to query |
| `src/components/dashboard/ConfirmedSessionCard.tsx` | Modify | Add series badge + Cancel Series button |
| `src/__tests__/cancel-recurring.test.ts` | Create | Unit tests for new server actions |
| `src/__tests__/manage-cancel.test.ts` | Create | Unit tests for token-gated API routes |

---

## Natural Task Seams

S03 divides cleanly into three independent units:

**T01 — Foundation: Migration + Token in create-recurring + Email link**
- `0016_cancel_token.sql` (ALTER TABLE recurring_schedules ADD COLUMN cancel_token)
- Modify `create-recurring/route.ts` to generate + store cancel_token
- Add `manageUrl` prop to `RecurringBookingConfirmationEmail` 
- This unblocks T02 and T03 in parallel — T02 needs the token column, T03 needs the dashboard query

**T02 — Teacher Dashboard: Sessions page + ConfirmedSessionCard + cancelRecurringSeries**
- Extend sessions page query (add recurring_schedule_id, payment_failed status)
- Add series badge + "Cancel Series" button to `ConfirmedSessionCard`
- Add `cancelSingleRecurringSession` + `cancelRecurringSeries` server actions to `bookings.ts`
- New `RecurringCancellationEmail` + `sendRecurringCancellationEmail` 
- Unit tests for new server actions

**T03 — Parent Self-Service: /manage/[token] page + token-gated API routes**
- New `src/app/manage/[token]/page.tsx` RSC + `CancelSeriesForm.tsx` client
- New `POST /api/manage/cancel-session` + `POST /api/manage/cancel-series` routes
- Unit tests for API routes

---

## Critical Implementation Notes

### Cancellable Statuses
The existing `cancelSession` only handles `confirmed` bookings. Recurring sessions can also be in `requested` (not yet charged by cron) or `payment_failed` (cron failed). New cancel actions must handle all three:
- `confirmed` → void PI + mark cancelled
- `requested` → mark cancelled (no PI to void if `is_recurring_first=false` and cron hasn't run; if `is_recurring_first=true`, may have a PI)
- `payment_failed` → mark cancelled (no active PI)

**Safe guard:** Check `stripe_payment_intent` is not null before calling `stripe.paymentIntents.cancel()` — same pattern as existing `cancelSession`.

### is_recurring_first Special Case
The first booking (`is_recurring_first=true`) has a PI in `capture_method:'manual'` state (authorized but not captured). Cancelling it voids the authorization exactly like any other single booking — no special treatment needed beyond what `cancelSession` already does.

### Series Cancel Scope
"Cancel remaining series" should only cancel bookings with `booking_date >= TODAY`. Past/completed sessions should remain as-is. Filter: `.gte('booking_date', todayStr).in('status', ['requested','confirmed','payment_failed'])`.

### Token Security
Use `randomBytes(32).toString('hex')` → 64-char hex string. No expiry needed (the series has a finite lifetime). The token is effectively the parent's credentials for this series — include it only in the parent confirmation email, not the teacher email.

### Mock Pattern for Tests
All new route tests must include `vi.mock('@/lib/email', ...)` to prevent Resend constructor error on import. Follow the `vi.hoisted` pattern established in `create-recurring.test.ts` and `recurring-charges.test.ts`.

### `/manage` Route Conflict
There's no existing `/manage` route in the app. The `review/[token]` page is at `/review/[token]` — `/manage/[token]` is a safe, independent route. No conflicts with existing routing.

---

## Verification Strategy

```bash
# Unit tests
npx vitest run cancel-recurring manage-cancel --reporter=verbose

# Type check
npx tsc --noEmit

# Build (verifies route manifest includes /manage/[token] and /api/manage/*)
npm run build
```

Tests needed:
- `cancel-recurring.test.ts`: `cancelSingleRecurringSession` (auth, ownership, various statuses, stripe void, email); `cancelRecurringSeries` (auth, future-only filter, partial cancels, email)
- `manage-cancel.test.ts`: token lookup (valid, invalid, expired/all-cancelled), single-session cancel (bad token, success), series cancel (bad token, success)

---

## Skills Discovered

No new skills to install — this slice uses Next.js App Router, Supabase, Stripe, and React Email patterns already established in S01/S02.
