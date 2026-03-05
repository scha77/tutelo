# Phase 2: Booking Requests - Research

**Researched:** 2026-03-05
**Domain:** Booking form wiring, Supabase RPC atomic inserts, Resend email, Next.js Server Actions, dashboard state management
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Post-submit parent experience**
- Inline success state inside the BookingCalendar card — no route change, no redirect
- Success state shows: checkmark, date/time booked, subject, "We'll email [parent email] when confirmed"
- A "Book another time" link at the bottom lets parent reset the calendar if they want to rebook; success state otherwise persists until page reload
- Double-booking error (slot taken by DB constraint): show inline error message in the form — "This time slot was just booked. Please choose another." — with back button returning to calendar; no page change

**Booking form fields**
- Subject: dropdown populated from teacher's subjects array (passed as a new prop to BookingCalendar)
  - If teacher has only one subject: auto-select and hide the dropdown
- Student name label: "Student's name" (not "your child's name")
- Notes: keep existing single textarea, no new DB columns; update placeholder to be specific: guide parent to share grade level, what the student is struggling with, and goals for the first session
- Field order: Student's name → Subject (if visible) → Email → Notes (optional)

**Dashboard requests layout**
- "Requests" appears as the first item in the sidebar nav, above Page, Availability, Settings
- Badge count on sidebar item shows number of pending requests when > 0
- Each pending request card shows: student name, subject, requested date/time (in teacher's timezone), parent email, submitted-ago timestamp
- Accept and Decline are inline buttons on the card — no confirmation dialog, no reason required for Decline
- Accepting changes booking status to `pending`; Declining changes to `cancelled`
- Empty state: "No pending requests yet. Share your page to get bookings!" + copy-link button (copies teacher's tutelo.app/[slug] URL)

**"Money waiting" email + in-app notification**
- Every booking request triggers an email to the teacher if they have not yet connected Stripe — not just the first request
- Email tone: urgent + warm (not aggressive, not formal)
  - Subject: "A parent wants to book you — connect Stripe to confirm"
  - Body includes: teacher's first name, student name, subject, date/time, parent email; one CTA button: "Activate Payments →" (links to `/dashboard/connect-stripe` — Phase 3 will build the destination)
- If teacher HAS connected Stripe: send a standard booking notification email (NOTIF-01) without the Stripe CTA
- In-app notification: sticky warning banner at the top of the dashboard (not a separate notification system)
  - Shows when teacher has ≥1 pending request AND has not connected Stripe
  - Copy: "You have X pending request(s)! Connect Stripe to confirm them." with "Activate Payments →" CTA
  - Badge count on Requests sidebar item serves as secondary indicator

### Claude's Discretion
- Exact email template design / react-email layout
- Animation/transition for the inline success state in BookingCalendar
- Styling of the dashboard warning banner
- Loading states during accept/decline actions
- Exact wording of the notes textarea placeholder (keep the intent: grade level + struggles + goals)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BOOK-01 | Parent can submit a booking request (no payment) by selecting a time slot, entering student name, subject, optional note, and email — no parent account required | BookingCalendar.tsx `handleSubmit` stub wired to Server Action; Zod schema validates fields; subject dropdown added as new prop |
| BOOK-02 | Parent sees a pending confirmation screen after request submission | Inline success state in BookingCalendar (step = 'success') replaces toast; no route change |
| BOOK-03 | Booking has an explicit state machine: `requested → pending → confirmed → completed → cancelled` | Already enforced by DB CHECK constraint in 0001 migration; Phase 2 only transitions: `requested` (on creation) → `pending` (accept) / `cancelled` (decline) |
| BOOK-04 | Booking creation is atomic — double-booking is impossible (DB-level unique constraint + atomic function) | `supabase.rpc('create_booking', {...})` pattern; DB UNIQUE constraint `(teacher_id, booking_date, start_time)` already exists; Postgres function catches duplicate violation and returns structured error |
| BOOK-06 | Teacher can accept or decline booking requests from their dashboard | New `/dashboard/requests` page; Server Actions for accept/decline status transitions; RLS `bookings_teacher_update` policy already allows this |
| STRIPE-01 | Teacher is NOT required to connect Stripe to publish page or receive booking requests | Booking creation succeeds regardless of `stripe_charges_enabled`; teacher's Stripe connection status checked only for email branching |
| STRIPE-02 | Teacher receives "money waiting" notification (email + in-app) when booking request arrives, with direct CTA to connect Stripe | Resend + react-email; triggered server-side in Server Action after successful `rpc('create_booking')`; conditional on `stripe_charges_enabled = false`; in-app = sticky banner in dashboard layout |
| NOTIF-01 | Teacher receives email when a booking request is submitted | Same Resend trigger; two email templates: "money waiting" (no Stripe) vs. standard notification (Stripe connected) |
| DASH-02 | Teacher can view and action pending booking requests (accept / decline) | `/dashboard/requests` page; fetches bookings WHERE status = 'requested'; accept/decline Server Actions update status; revalidatePath invalidates cache |
</phase_requirements>

---

## Summary

Phase 2 wires the existing `BookingCalendar.tsx` stub into a real booking flow backed by Supabase and triggers email notifications via Resend. The existing database schema (migration `0001`) already has the `bookings` table, the state machine CHECK constraint, and the unique-slot constraint — no schema changes are needed for the core booking logic. What Phase 2 adds is: (1) the `create_booking` Postgres function (atomic insert + duplicate detection), (2) the Server Action that calls it and fires a Resend email, (3) the `/dashboard/requests` page with accept/decline actions, and (4) the Resend + react-email package install with two email templates.

The key architectural insight is that `BookingCalendar.tsx` is a client component that cannot call a Server Action directly by import — it must use `useTransition` + a passed-in callback prop, or call a `/api/bookings` route handler. Given the existing pattern in this codebase (Server Actions in `src/actions/`), the cleanest approach is to expose a `submitBookingRequest` Server Action and pass it to `BookingCalendar` as a prop from the Server Component page. This keeps the client component boundary clean.

Email delivery requires installing `resend` and `@react-email/components` (neither is currently in `package.json`). Resend's free tier (3,000 emails/month) is sufficient for MVP. The `RESEND_API_KEY` environment variable must be added to Vercel and `.env.local`.

**Primary recommendation:** Use Server Action (`src/actions/bookings.ts`) called via prop callback in `BookingCalendar`, atomic Postgres RPC for insert, Resend for email in the same action, and a simple Server Component dashboard page for requests.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/ssr` | ^0.9.0 (installed) | Server-side Supabase client in Server Actions and Route Handlers | Already in use; `createClient()` from `@/lib/supabase/server` |
| `zod` | ^4.3.6 (installed) | Schema validation for booking form inputs | Already used in `src/lib/schemas/onboarding.ts` and actions |
| `react-hook-form` | ^7.71.2 (installed) | Form state management in client component | Already used in onboarding; BUT BookingCalendar currently uses plain `useState` for form — can keep as-is or migrate; plain state is fine for this simple form |
| `resend` | latest (~4.x) | Email delivery via Resend API | Specified in project requirements; free tier = 3,000/mo |
| `@react-email/components` | latest (~0.0.x) | React-based email templates | Pairs with Resend; JSX email templates |
| `date-fns` + `date-fns-tz` | ^4.1.0 / ^3.2.0 (installed) | Date formatting in email + dashboard (teacher timezone) | Already installed; use `formatInTimeZone` for teacher-timezone display |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | ^0.577.0 (installed) | Icons on dashboard requests cards, success/error states | Installed; use `CheckCircle2`, `Clock`, `X`, `Bell` icons |
| `sonner` | ^2.0.7 (installed) | Toast fallback only — inline states are primary UX | Only for server-side errors that can't show inline |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Server Action + prop callback | Route Handler (`/api/bookings`) | Route Handler adds an HTTP round-trip; Server Action is simpler and consistent with project patterns |
| react-email + Resend | Nodemailer + SendGrid | Project specifies Resend; react-email gives JSX templates, easy to test with preview |
| Plain `useState` in BookingCalendar form | React Hook Form | RHF adds complexity for a 4-field form; plain state is already in place and sufficient |

**Installation:**
```bash
npm install resend @react-email/components
```

---

## Architecture Patterns

### Recommended Project Structure

New files added in Phase 2:
```
src/
├── actions/
│   └── bookings.ts               # submitBookingRequest, acceptBooking, declineBooking
├── lib/
│   └── schemas/
│       └── booking.ts            # BookingRequestSchema (Zod)
├── emails/
│   ├── MoneyWaitingEmail.tsx      # "money waiting" react-email template
│   └── BookingNotificationEmail.tsx  # standard booking notification template
├── app/
│   └── (dashboard)/
│       └── dashboard/
│           └── requests/
│               └── page.tsx      # /dashboard/requests — Server Component
└── components/
    └── dashboard/
        └── RequestCard.tsx       # Client component for accept/decline buttons
supabase/
└── migrations/
    └── 0003_create_booking_fn.sql # create_booking() Postgres function
```

Modified files:
```
src/components/profile/
└── BookingCalendar.tsx           # Add subjects prop, subject dropdown, success/error states
src/components/dashboard/
└── Sidebar.tsx                   # Add Requests nav item (first), badge count
src/app/(dashboard)/
└── dashboard/
    └── layout.tsx                # Add pending-request count query + Stripe banner
```

### Pattern 1: Atomic Booking via Postgres RPC

**What:** A Postgres function handles the insert, catches the unique-violation, and returns a typed result. The Server Action calls it via `supabase.rpc()`.

**When to use:** Any write that requires atomicity or must distinguish constraint violations from generic errors.

**Example:**
```sql
-- supabase/migrations/0003_create_booking_fn.sql
CREATE OR REPLACE FUNCTION create_booking(
  p_teacher_id   UUID,
  p_parent_email TEXT,
  p_student_name TEXT,
  p_subject      TEXT,
  p_booking_date DATE,
  p_start_time   TIME,
  p_end_time     TIME,
  p_notes        TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking_id UUID;
BEGIN
  INSERT INTO bookings (
    teacher_id, parent_email, student_name, subject,
    booking_date, start_time, end_time, notes, status
  ) VALUES (
    p_teacher_id, p_parent_email, p_student_name, p_subject,
    p_booking_date, p_start_time, p_end_time, p_notes, 'requested'
  )
  RETURNING id INTO v_booking_id;

  RETURN json_build_object('success', true, 'booking_id', v_booking_id);

EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object('success', false, 'error', 'slot_taken');
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
```

```typescript
// src/actions/bookings.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { BookingRequestSchema } from '@/lib/schemas/booking'
import { sendBookingEmail } from '@/lib/email'
import { revalidatePath } from 'next/cache'

export type BookingResult =
  | { success: true; bookingId: string }
  | { success: false; error: 'slot_taken' | 'validation' | 'server' }

export async function submitBookingRequest(
  formData: unknown
): Promise<BookingResult> {
  const parsed = BookingRequestSchema.safeParse(formData)
  if (!parsed.success) return { success: false, error: 'validation' }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('create_booking', {
    p_teacher_id:   parsed.data.teacherId,
    p_parent_email: parsed.data.email,
    p_student_name: parsed.data.studentName,
    p_subject:      parsed.data.subject,
    p_booking_date: parsed.data.bookingDate,
    p_start_time:   parsed.data.startTime,
    p_end_time:     parsed.data.endTime,
    p_notes:        parsed.data.notes ?? null,
  })

  if (error) return { success: false, error: 'server' }

  const result = data as { success: boolean; booking_id?: string; error?: string }
  if (!result.success) {
    return { success: false, error: result.error === 'slot_taken' ? 'slot_taken' : 'server' }
  }

  // Fire email — do not await to avoid blocking; use try/catch to not fail booking
  sendBookingEmail(parsed.data.teacherId, result.booking_id!, parsed.data).catch(console.error)

  revalidatePath('/[slug]', 'page')
  return { success: true, bookingId: result.booking_id! }
}
```

### Pattern 2: Passing Server Action to Client Component as Prop

**What:** Because `BookingCalendar` is `'use client'`, it cannot import a Server Action directly at the module level (that would cause a Next.js error if the file is not in a `'use server'` context). Instead, the parent Server Component page passes `submitBookingRequest` as a prop.

**When to use:** Any client component that needs to call a Server Action.

**Example:**
```typescript
// src/app/[slug]/page.tsx (Server Component — simplified)
import { submitBookingRequest } from '@/actions/bookings'
import { BookingCalendar } from '@/components/profile/BookingCalendar'

export default async function TeacherPage({ params }) {
  // ...fetch teacher data...
  return (
    <BookingCalendar
      slots={availability}
      teacherTimezone={teacher.timezone}
      teacherName={teacher.full_name}
      accentColor={teacher.accent_color}
      subjects={teacher.subjects}           // new prop
      teacherId={teacher.id}                // new prop
      submitAction={submitBookingRequest}   // Server Action as prop
    />
  )
}
```

```typescript
// BookingCalendar.tsx — new prop signature
interface BookingCalendarProps {
  slots: AvailabilitySlot[]
  teacherTimezone: string
  teacherName: string
  accentColor: string
  subjects: string[]                                        // NEW
  teacherId: string                                         // NEW
  submitAction: (data: unknown) => Promise<BookingResult>  // NEW
}
```

### Pattern 3: Resend Email in Server Action

**What:** Call Resend API from within a Server Action, after the booking insert succeeds.

**When to use:** Transactional email triggered by a data mutation.

**Example:**
```typescript
// src/lib/email.ts
import { Resend } from 'resend'
import { MoneyWaitingEmail } from '@/emails/MoneyWaitingEmail'
import { BookingNotificationEmail } from '@/emails/BookingNotificationEmail'
import { createClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendBookingEmail(
  teacherId: string,
  bookingId: string,
  bookingData: BookingFormData
) {
  const supabase = await createClient()
  const { data: teacher } = await supabase
    .from('teachers')
    .select('full_name, social_email, stripe_charges_enabled')
    .eq('id', teacherId)
    .single()

  if (!teacher?.social_email) return  // No email to send to

  const teacherEmail = teacher.social_email
  const teacherFirstName = teacher.full_name.split(' ')[0]

  if (!teacher.stripe_charges_enabled) {
    // "Money waiting" email
    await resend.emails.send({
      from: 'Tutelo <noreply@tutelo.app>',
      to: teacherEmail,
      subject: 'A parent wants to book you — connect Stripe to confirm',
      react: MoneyWaitingEmail({
        teacherFirstName,
        studentName: bookingData.studentName,
        subject: bookingData.subject,
        bookingDate: bookingData.bookingDate,
        startTime: bookingData.startTime,
        parentEmail: bookingData.email,
        connectStripeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/connect-stripe`,
      }),
    })
  } else {
    // Standard booking notification
    await resend.emails.send({
      from: 'Tutelo <noreply@tutelo.app>',
      to: teacherEmail,
      subject: `New booking request from ${bookingData.studentName}'s parent`,
      react: BookingNotificationEmail({
        teacherFirstName,
        studentName: bookingData.studentName,
        subject: bookingData.subject,
        bookingDate: bookingData.bookingDate,
        startTime: bookingData.startTime,
        parentEmail: bookingData.email,
        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/requests`,
      }),
    })
  }
}
```

### Pattern 4: Dashboard Requests Page (Server Component)

**What:** Fetch pending bookings server-side, render cards, pass accept/decline Server Actions to a client component for interactivity.

**When to use:** Dashboard pages that need server-fetched data with client-side mutation buttons.

**Example:**
```typescript
// src/app/(dashboard)/dashboard/requests/page.tsx
import { createClient } from '@/lib/supabase/server'
import { acceptBooking, declineBooking } from '@/actions/bookings'
import { RequestCard } from '@/components/dashboard/RequestCard'

export default async function RequestsPage() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  const { data: teacher } = await supabase
    .from('teachers')
    .select('id, slug, timezone')
    .eq('user_id', userId)
    .single()

  const { data: requests } = await supabase
    .from('bookings')
    .select('*')
    .eq('teacher_id', teacher.id)
    .eq('status', 'requested')
    .order('created_at', { ascending: false })

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Booking Requests</h1>
      {requests?.length === 0 ? (
        <EmptyState slug={teacher.slug} />
      ) : (
        <div className="space-y-4">
          {requests?.map((booking) => (
            <RequestCard
              key={booking.id}
              booking={booking}
              teacherTimezone={teacher.timezone}
              acceptAction={acceptBooking}
              declineAction={declineBooking}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

### Pattern 5: Dashboard Layout — Pending Count + Stripe Banner

**What:** The existing `DashboardLayout` fetches the teacher row on every render. Extend it to also fetch the pending booking count and pass the data to `Sidebar` + render the Stripe warning banner.

**When to use:** Data needed by both sidebar badge and top-of-page banner.

**Example:**
```typescript
// DashboardLayout additions (in layout.tsx)
const [{ data: teacher }, { count: pendingCount }] = await Promise.all([
  supabase
    .from('teachers')
    .select('id, full_name, slug, is_published, stripe_charges_enabled')
    .eq('user_id', userId)
    .maybeSingle(),
  supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('teacher_id', teacherId)
    .eq('status', 'requested'),
])

// Pass pendingCount to Sidebar; render banner in layout if conditions met
```

### Anti-Patterns to Avoid

- **Calling Server Action directly from `BookingCalendar` module scope:** Client components cannot import Server Actions from `'use server'` files at module scope. Pass the action as a prop from the parent Server Component.
- **Using `req.json()` in a booking API route:** Not applicable here (no Stripe webhooks in Phase 2), but don't build a route handler that reads body as JSON if you ever need raw bytes.
- **Awaiting `sendBookingEmail` inside the critical path:** If Resend is slow or fails, it should not delay the booking confirmation to the parent. Fire-and-forget with `.catch(console.error)`.
- **Relying on RLS alone for double-booking prevention:** RLS is row-level security, not transaction isolation. The DB UNIQUE constraint + Postgres function is what prevents race-condition double-bookings.
- **Checking `stripe_charges_enabled` client-side:** This is sensitive business logic. Always check it server-side in the Server Action or email utility.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic insert with constraint violation detection | Custom transaction + error parsing in JS | Postgres function via `supabase.rpc()` | Race conditions between read+write; DB handles atomicity natively |
| Email templating | HTML strings / string interpolation | `@react-email/components` | HTML email cross-client compatibility is a solved nightmare (Outlook, Gmail clip, image blocking) |
| Email delivery | SMTP server / nodemailer | Resend | Deliverability, DKIM/SPF, bounces — all managed by Resend |
| "Time since" formatting | Custom `Date.now()` arithmetic | `date-fns` `formatDistanceToNow()` | DST edge cases, locale handling |
| Timezone-aware date display | Manual UTC offset math | `formatInTimeZone(date, tz, format)` from `date-fns-tz` | Already installed and used throughout the project |
| Form validation | Manual `if (!field)` checks | Zod schema in `src/lib/schemas/booking.ts` | Consistent with all other schemas in project |

**Key insight:** The Postgres unique constraint + RPC pattern (already specified in the project's critical pitfalls) eliminates an entire class of race-condition double-booking bugs that would appear under concurrent load but never during solo testing.

---

## Common Pitfalls

### Pitfall 1: Importing Server Action Inside Client Component Module

**What goes wrong:** TypeScript build error or silent runtime failure — `'use server'` modules can only be imported by other Server Components or by passing the function as a prop.

**Why it happens:** Next.js App Router enforces a strict server/client boundary. `BookingCalendar.tsx` is `'use client'`.

**How to avoid:** In `/[slug]/page.tsx` (Server Component), import `submitBookingRequest` and pass it as `submitAction={submitBookingRequest}` prop to `<BookingCalendar>`. Declare the prop type as `(data: unknown) => Promise<BookingResult>`.

**Warning signs:** TypeScript error mentioning "Module is Server-only" or `cannot import Server Action from client boundary`.

### Pitfall 2: Double-Booking Under Concurrent Requests

**What goes wrong:** Two parents click "Request Session" on the same slot at the same millisecond. Both `INSERT` calls succeed because the duplicate check was done at the application layer.

**Why it happens:** Read-then-write patterns (check if slot free → insert) are not atomic.

**How to avoid:** The DB UNIQUE constraint `(teacher_id, booking_date, start_time)` already exists in migration `0001`. The Postgres `create_booking` function catches `unique_violation` and returns `{success: false, error: 'slot_taken'}`. The Server Action maps this to an inline error in the form.

**Warning signs:** Duplicate bookings in the DB despite the check.

### Pitfall 3: Email Sent to Wrong Address

**What goes wrong:** Teacher's email address is in `teachers.social_email` (set during onboarding under "contact links"). If a teacher didn't fill in their email, `social_email` is NULL — the email silently drops.

**Why it happens:** The schema has `social_email TEXT` without a NOT NULL constraint; it's optional in onboarding.

**How to avoid:** In `sendBookingEmail()`, check `if (!teacher?.social_email) return` (fail silently for MVP — teacher won't get the email, but the booking still succeeds). Log a warning. Consider adding email to onboarding as required in a future phase, or falling back to `auth.users.email` (requires a service-role query).

**Warning signs:** Teachers reporting they never got a notification.

### Pitfall 4: `bookings_anon_insert` RLS Policy is Too Permissive

**What goes wrong:** The current `WITH CHECK (true)` policy allows anyone to insert a booking for any teacher — including unpublished teachers or with a fake `teacher_id`.

**Why it happens:** Phase 1 deliberately set it to `true` with a note to tighten in Phase 2.

**How to avoid:** In migration `0003` (or a separate `0004_tighten_rls.sql`), replace the policy:
```sql
DROP POLICY IF EXISTS "bookings_anon_insert" ON bookings;
CREATE POLICY "bookings_anon_insert"
  ON bookings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = teacher_id
        AND teachers.is_published = TRUE
    )
  );
```
This prevents booking requests against draft/unpublished teacher pages.

**Warning signs:** Bookings appearing for unpublished teachers.

### Pitfall 5: `booking_date` Must Be a `DATE` String, Not ISO Timestamp

**What goes wrong:** The `BookingCalendar` builds `bookingDate` from a JavaScript `Date` object. If you serialize it with `.toISOString()` you get `"2026-03-15T00:00:00.000Z"` — but the DB column is `DATE`. Postgres will coerce it, but the time component can shift the date by one day depending on UTC offset.

**Why it happens:** `date.toISOString()` converts to UTC; if teacher is in UTC-5 and the local date is March 15 at 11pm, the ISO string becomes March 16.

**How to avoid:** Serialize `booking_date` using `format(selectedDate, 'yyyy-MM-dd')` from `date-fns`. This produces the local calendar date string with no timezone shifting.

**Warning signs:** Bookings appearing on the wrong date by 1 day.

### Pitfall 6: `start_time` Must Be in the Teacher's Timezone

**What goes wrong:** The time slots displayed in `BookingCalendar` are already converted to the visitor's timezone for display. If you pass the display time as the stored `start_time`, you store the visitor's local time, not the teacher's.

**Why it happens:** The `getSlotsForDate` function converts slot times to `visitorTimezone` for display purposes.

**How to avoid:** Store the `startRaw` value from the `TimeSlot` object (which is the original `HH:MM` from the DB in the teacher's timezone), not the `startDisplay`. The `TimeSlot` interface already has both fields. Pass `selectedSlot.startRaw` and `selectedSlot.endRaw` (if added) to the Server Action.

**Warning signs:** Teacher sees booking at 3pm but it was requested for 8pm.

### Pitfall 7: Sidebar Badge Count Stale After Accept/Decline

**What goes wrong:** Teacher accepts a request, but the sidebar badge still shows the old count.

**Why it happens:** The badge count is fetched in `DashboardLayout` which is a Server Component cached at the layout level.

**How to avoid:** Call `revalidatePath('/dashboard', 'layout')` in `acceptBooking` and `declineBooking` Server Actions. This invalidates the layout cache and re-fetches the count on next navigation.

**Warning signs:** Badge count doesn't decrement after actions.

---

## Code Examples

Verified patterns from existing codebase:

### Existing Server Action Pattern (from `src/actions/availability.ts`)
```typescript
'use server'
// Uses getClaims() not getSession() (project convention)
const { data: claimsData } = await supabase.auth.getClaims()
const userId = claimsData?.claims?.sub
if (!userId) return { error: 'Not authenticated' }
// Zod parse
const parsed = Schema.safeParse(input)
if (!parsed.success) return { error: parsed.error.issues[0]?.message }
// revalidatePath after mutation
revalidatePath('/dashboard/availability')
```

### Existing RLS Pattern — Teacher Lookup via `user_id`
```sql
-- Already used in bookings_teacher_read and bookings_teacher_update
EXISTS (
  SELECT 1 FROM teachers
  WHERE teachers.id = bookings.teacher_id
    AND teachers.user_id = auth.uid()
)
```

### Zod Schema for Booking Form (`src/lib/schemas/booking.ts`)
```typescript
import { z } from 'zod'

export const BookingRequestSchema = z.object({
  teacherId:   z.string().uuid(),
  studentName: z.string().min(1, 'Student name required').max(100),
  subject:     z.string().min(1, 'Subject required'),
  email:       z.string().email('Valid email required'),
  notes:       z.string().max(1000).optional(),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  startTime:   z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM'),
  endTime:     z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM'),
})

export type BookingRequestData = z.infer<typeof BookingRequestSchema>
```

### Inline Success State in BookingCalendar
```typescript
// Add 'success' step to the existing step type
const [step, setStep] = useState<'calendar' | 'form' | 'success' | 'error'>('calendar')
const [bookingResult, setBookingResult] = useState<{ date: string; time: string; subject: string; email: string } | null>(null)
const [errorMessage, setErrorMessage] = useState<string | null>(null)

// In handleSubmit:
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  setSubmitting(true)
  const result = await submitAction({
    teacherId,
    studentName: form.name,
    subject: form.subject,
    email: form.email,
    notes: form.notes,
    bookingDate: format(selectedDate!, 'yyyy-MM-dd'),
    startTime: selectedSlot!.startRaw,
    endTime: selectedSlot!.endRaw,
  })
  setSubmitting(false)
  if (result.success) {
    setBookingResult({
      date: format(selectedDate!, 'EEEE, MMMM d'),
      time: selectedSlot!.startDisplay,
      subject: form.subject,
      email: form.email,
    })
    setStep('success')
  } else if (result.error === 'slot_taken') {
    setErrorMessage('This time slot was just booked. Please choose another.')
    setStep('error')
  } else {
    setErrorMessage('Something went wrong. Please try again.')
    setStep('error')
  }
}
```

### Resend Email Send (minimal working example)
```typescript
// src/lib/email.ts
import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY)

// Usage:
await resend.emails.send({
  from: 'Tutelo <noreply@tutelo.app>',
  to: teacherEmail,
  subject: 'A parent wants to book you — connect Stripe to confirm',
  react: MoneyWaitingEmail({ ... }),
})
```

### react-email Component Structure
```typescript
// src/emails/MoneyWaitingEmail.tsx
import {
  Body, Button, Container, Head, Hr, Html,
  Preview, Section, Text
} from '@react-email/components'

interface MoneyWaitingEmailProps {
  teacherFirstName: string
  studentName: string
  subject: string
  bookingDate: string
  startTime: string
  parentEmail: string
  connectStripeUrl: string
}

export function MoneyWaitingEmail({
  teacherFirstName,
  studentName,
  subject,
  bookingDate,
  startTime,
  parentEmail,
  connectStripeUrl,
}: MoneyWaitingEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>A parent wants to book you — connect Stripe to confirm</Preview>
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f9fafb' }}>
        <Container style={{ maxWidth: '520px', margin: '40px auto', padding: '24px', background: '#fff', borderRadius: '8px' }}>
          <Text>Hi {teacherFirstName},</Text>
          <Text>
            <strong>{studentName}&apos;s parent</strong> just requested a {subject} session on{' '}
            <strong>{bookingDate} at {startTime}</strong>. Their email is {parentEmail}.
          </Text>
          <Text>Connect Stripe to confirm the booking and get paid.</Text>
          <Section style={{ textAlign: 'center', margin: '24px 0' }}>
            <Button
              href={connectStripeUrl}
              style={{ backgroundColor: '#3B82F6', color: '#fff', padding: '12px 24px', borderRadius: '6px', textDecoration: 'none', fontWeight: 600 }}
            >
              Activate Payments →
            </Button>
          </Section>
          <Hr />
          <Text style={{ fontSize: '12px', color: '#6b7280' }}>Tutelo · tutelo.app</Text>
        </Container>
      </Body>
    </Html>
  )
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | Late 2023 | Auth helpers deprecated; `@supabase/ssr` is the current package (already in use) |
| `getSession()` for server-side auth | `getClaims()` / `getUser()` | 2024 | `getSession()` is not secure server-side; project already uses `getClaims()` per decision log |
| Next.js `middleware.ts` as entry | `middleware.ts` imports `proxy.ts` | Next.js 16 | Project decision: `proxy.ts` pattern; `middleware.ts` must exist as Next.js entry point |
| Toast-based booking confirmation | Inline success state in card | Phase 2 decision | User tested; inline state is less disruptive for multi-booking scenarios |

**Deprecated/outdated (do not use):**
- `@supabase/auth-helpers-nextjs`: Removed from project — do not add back
- `getSession()` on server: Returns possibly stale session; `getClaims()` is the project standard
- `toast.success()` for booking confirmation: Replaced by inline success state per CONTEXT.md decision

---

## Existing Schema (No Changes Needed for Core Booking)

The `bookings` table from migration `0001` already has everything Phase 2 needs:

```sql
-- Already exists:
bookings (
  id                UUID PRIMARY KEY,
  teacher_id        UUID NOT NULL REFERENCES teachers(id),
  parent_id         UUID REFERENCES auth.users(id),  -- nullable for guest
  parent_email      TEXT NOT NULL,
  student_name      TEXT NOT NULL,
  subject           TEXT NOT NULL,
  booking_date      DATE NOT NULL,
  start_time        TIME NOT NULL,
  end_time          TIME NOT NULL,
  status            TEXT NOT NULL DEFAULT 'requested'
                    CHECK (status IN ('requested','pending','confirmed','completed','cancelled')),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT bookings_unique_slot UNIQUE (teacher_id, booking_date, start_time)
)
```

**What migration `0003` adds:**
1. The `create_booking()` Postgres function (atomic insert with duplicate detection)
2. Tightened `bookings_anon_insert` RLS policy (require `is_published = TRUE`)

**What does NOT need a migration:**
- No new columns needed (notes textarea reuses existing `notes` column per CONTEXT.md)
- No state machine changes (CHECK constraint already correct)
- No teacher table changes needed for Phase 2

---

## Environment Variables Required

```bash
# .env.local (add these)
RESEND_API_KEY=re_...
NEXT_PUBLIC_APP_URL=http://localhost:3000   # or https://tutelo.app in production

# Vercel dashboard — add same variables
```

---

## Open Questions

1. **Teacher email source for notifications**
   - What we know: `teachers.social_email` is an optional field set during page customization. Not guaranteed to be set.
   - What's unclear: Should we fall back to `auth.users.email` (the account email used to sign up)? This requires a service-role query since it's in `auth.users`, not a public table.
   - Recommendation: For MVP, use `social_email` with a silent-fail guard. Add a dashboard prompt: "Add your email in Settings to receive booking notifications." Phase 3 can enforce it.

2. **`NEXT_PUBLIC_APP_URL` not in codebase yet**
   - What we know: The email CTA link needs an absolute URL to `/dashboard/connect-stripe`.
   - What's unclear: Whether this env var exists in Vercel already.
   - Recommendation: Add `NEXT_PUBLIC_APP_URL` to `.env.local` and Vercel dashboard. Document in Wave 0 setup task.

3. **`endTime` not in `TimeSlot` interface**
   - What we know: `TimeSlot` has `slotId`, `startDisplay`, `endDisplay`, `startRaw`. There is no `endRaw` field.
   - What's unclear: The booking DB needs both `start_time` and `end_time`.
   - Recommendation: Add `endRaw: string` to the `TimeSlot` interface in `BookingCalendar.tsx`. Extract it the same way `startRaw` is extracted: `slot.end_time.slice(0, 5)`.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run tests/bookings/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BOOK-01 | Booking form Zod schema validates all fields | unit | `npx vitest run tests/bookings/booking-schema.test.ts` | ❌ Wave 0 |
| BOOK-01 | Subject auto-select when only 1 subject | unit | `npx vitest run tests/bookings/booking-calendar.test.tsx` | ❌ Wave 0 |
| BOOK-02 | Inline success state renders after successful submit | unit | `npx vitest run tests/bookings/booking-calendar.test.tsx` | ❌ Wave 0 |
| BOOK-03 | State machine: only valid transitions allowed | unit | `npx vitest run tests/bookings/state-machine.test.ts` | ❌ Wave 0 |
| BOOK-04 | `create_booking` Server Action returns `slot_taken` on duplicate | unit | `npx vitest run tests/bookings/booking-action.test.ts` | ❌ Wave 0 |
| BOOK-04 | Double-booking error shows inline error message | unit | `npx vitest run tests/bookings/booking-calendar.test.tsx` | ❌ Wave 0 |
| BOOK-06 | `acceptBooking` changes status from `requested` to `pending` | unit | `npx vitest run tests/bookings/booking-action.test.ts` | ❌ Wave 0 |
| BOOK-06 | `declineBooking` changes status from `requested` to `cancelled` | unit | `npx vitest run tests/bookings/booking-action.test.ts` | ❌ Wave 0 |
| STRIPE-02 | Email send called when `stripe_charges_enabled = false` | unit | `npx vitest run tests/bookings/email.test.ts` | ❌ Wave 0 |
| STRIPE-02 | Standard notification sent when `stripe_charges_enabled = true` | unit | `npx vitest run tests/bookings/email.test.ts` | ❌ Wave 0 |
| NOTIF-01 | Email is NOT sent when `social_email` is null | unit | `npx vitest run tests/bookings/email.test.ts` | ❌ Wave 0 |
| DASH-02 | Pending request count badge reflects actual DB count | unit | `npx vitest run tests/bookings/requests-page.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/bookings/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/bookings/booking-schema.test.ts` — covers BOOK-01 Zod schema
- [ ] `tests/bookings/booking-calendar.test.tsx` — covers BOOK-01 subject field, BOOK-02 success state, BOOK-04 error state
- [ ] `tests/bookings/booking-action.test.ts` — covers BOOK-04 slot_taken, BOOK-06 accept/decline
- [ ] `tests/bookings/email.test.ts` — covers STRIPE-02, NOTIF-01 email branching
- [ ] `tests/bookings/state-machine.test.ts` — covers BOOK-03 valid transitions
- [ ] `tests/bookings/requests-page.test.ts` — covers DASH-02 badge count
- [ ] No new framework install needed — Vitest already configured

---

## Sources

### Primary (HIGH confidence)
- Existing codebase — `src/components/profile/BookingCalendar.tsx` (direct read)
- Existing codebase — `supabase/migrations/0001_initial_schema.sql` (direct read, full schema)
- Existing codebase — `src/actions/availability.ts` (direct read, Server Action pattern)
- Existing codebase — `src/components/dashboard/Sidebar.tsx` (direct read)
- Existing codebase — `src/app/(dashboard)/dashboard/layout.tsx` (direct read)
- Existing codebase — `package.json` (direct read, all dependency versions)
- `.planning/phases/02-booking-requests/02-CONTEXT.md` (direct read, locked decisions)

### Secondary (MEDIUM confidence)
- `resend` npm package — standard Resend Node.js SDK `resend.emails.send({ react: ... })` API; verified against Resend documentation pattern
- `@react-email/components` — JSX email component API (`Body`, `Button`, `Container`, etc.); standard react-email usage pattern

### Tertiary (LOW confidence)
- None — all critical claims verified from codebase or official package APIs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified against installed `package.json`; resend/react-email are standard with well-known APIs
- Architecture: HIGH — patterns derived from existing codebase conventions (Server Actions in `src/actions/`, getClaims() pattern, Zod in schemas/)
- Pitfalls: HIGH — sourced from existing migration schema, project decision log, and Next.js App Router known constraints
- Database schema: HIGH — read directly from migration file; no assumptions

**Research date:** 2026-03-05
**Valid until:** 2026-06-01 (stable stack; Next.js 16 + Supabase SSR + Resend APIs are not changing rapidly)
