# M007 Discussion Log

## Exchange — 2026-03-25T20:08:29.349Z

### Capacity

How should "at capacity" be counted? The draft left this open. I'd lean toward counting unique active students (distinct student_name with a confirmed or completed booking in the last 90 days) over counting future booking slots — it better matches how a teacher thinks about their practice ('I have room for 5 kids').

- **Unique active students (Recommended)** — Teacher says 'I can handle 5 students' — system counts distinct student_name values with recent confirmed/completed bookings.
- **Future confirmed bookings** — Teacher says 'I can handle 10 sessions/week' — system counts confirmed bookings in the upcoming 7-day window.
- **Let teacher pick either** — Dashboard toggle between the two modes — more flexible but more complex UI and enforcement logic.

**Selected:** Unique active students (Recommended)

### Waitlist Email

When a spot opens and a waitlisted parent gets emailed — should the email include a direct booking link to that teacher's page, or just a 'a spot opened' alert?

- **Direct booking link (Recommended)** — Email includes tutelo.app/[slug] link. Parent clicks and books immediately. Reduces friction.
- **Alert only, no link** — Just tells them a spot opened. They'd need to find the teacher page themselves. Safer if teacher wants to vet first.

**Selected:** Direct booking link (Recommended)

### Session Durations

When a teacher creates a session type (e.g. 'SAT Prep $60'), should the duration be locked to that session type (e.g. always 90 min for SAT Prep), or should the parent still pick their own time slot length from available windows like today?

- **Locked per session type (Recommended)** — Teacher sets 'SAT Prep = 90 min, $60'. Parent picks a start time, duration is automatic. Cleaner pricing math.
- **Parent still picks duration** — Session type only sets the rate, parent chooses slot length. Current computeSessionAmount pro-rates by duration.
- **Optional per type** — Teacher can set a fixed duration on the session type OR leave it null (parent picks). Most flexible, most complex.

**Selected:** Locked per session type (Recommended)

---
## Exchange — 2026-03-25T20:46:21.682Z

### Capacity UI

When a teacher is at capacity, what should the parent see on the profile page? I'd lean toward hiding the calendar entirely and showing a clear 'Currently at capacity' message with the waitlist signup form below it — showing available slots you can't book feels frustrating.

- **Hide calendar, show waitlist (Recommended)** — Profile page replaces booking calendar with waitlist signup form. Teacher's info/reviews still visible. Clean hard stop.
- **Calendar visible, booking disabled** — Calendar stays visible (parent can see schedule) but 'Book' button is replaced with 'Join Waitlist'. More transparent.

**Selected:** Hide calendar, show waitlist (Recommended)

### Session Price

Since we're locking durations to session types — should session type pricing be a flat per-session price (e.g. 'SAT Prep: $60 per session') or an hourly rate that gets multiplied by the fixed duration? I'd lean flat per-session — it's what the parent sees, no mental math needed, and it's simpler for the teacher to set.

- **Flat per-session price (Recommended)** — Teacher enters a flat dollar amount per session type ($45 for SAT Prep, $35 for Homework Help). No hourly math.
- **Hourly rate per type** — Teacher enters an hourly rate per type, system calculates based on duration. Consistent with current model but confusing when durations are fixed.

**Selected:** Flat per-session price (Recommended)

### Waitlist Scope

When capacity frees up, should ALL waitlisted parents get notified simultaneously (first to book wins), or should it notify them one at a time in FIFO order? I'd lean toward notifying all at once — FIFO requires timeout logic and delays the fill rate.

- **Notify all, first-come-first-served (Recommended)** — When a spot opens, ALL waitlisted parents get the email. First to book gets the spot. Fair and simple.
- **Notify one at a time (FIFO)** — Only the first parent in the queue gets notified. If they don't book in X hours, next person gets notified. Fair but slower.

**Selected:** Notify all, first-come-first-served (Recommended)

---
## Exchange — 2026-03-25T20:47:57.872Z

### Active Window

For counting 'active students' against the capacity limit — what recency window makes a student 'active'? I'd lean 90 days — roughly a school quarter. A student who hasn't had a booking in 90 days is probably not coming back regularly.

- **90 days (Recommended)** — Student who had a booking in the last 90 days counts as active. Covers a typical school quarter.
- **60 days** — Tighter window. Students who haven't booked in 2 months fall off.
- **120 days** — Matches academic semester. More forgiving for summer breaks.

**Selected:** 90 days (Recommended)

### Default Price

When a teacher creates their first session type, should the existing hourly_rate be auto-converted into a 'General Session' type, or should hourly_rate stay as the permanent fallback for teachers who never set up session types? I'd lean toward keeping hourly_rate as-is — zero migration pain, and the booking flow already knows how to use it.

- **Keep hourly_rate as-is (Recommended)** — hourly_rate stays forever. Teachers who never create session types keep working exactly as today. Zero migration risk.
- **Auto-convert to session type** — When teacher creates their first session type, prompt them to move their hourly_rate into a 'General Session' type. Cleaner data model but adds migration UX.

**Selected:** Keep hourly_rate as-is (Recommended)

### Capacity Trigger

When should the system re-check capacity and trigger waitlist notifications? The two events that can free capacity are: booking cancellation (student drops) and time passing (90-day window expires). I'd lean toward checking on cancellation + session completion events, since those are the natural moments capacity changes.

- **Cancellation + completion events (Recommended)** — After booking cancellation + session completion. Both change student/booking counts. Cron not needed — these are the only events.
- **Cancellation only** — Only on cancellation. Session completion doesn't change active student count (they stay active).
- **Nightly cron** — Run a nightly cron that recalculates and sends any pending notifications. More reliable but delayed.

**Selected:** Cancellation + completion events (Recommended)

---
## Exchange — 2026-03-25T20:48:26.934Z

### Depth Check

Did I capture the depth right? Anything missing or off before I write the M007 context file?

- **Yes, you got it (Recommended)** — The depth summary accurately captures the decisions and I'm ready for the context file.
- **Not quite — let me clarify** — Something is off or missing — I want to clarify before you write.

**Selected:** Yes, you got it (Recommended)

---
