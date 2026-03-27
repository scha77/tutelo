# M007: 

## Vision
Teachers can cap their student load and offer variable pricing per session type. When at capacity, parents join a waitlist and get notified when a spot opens. Teachers who define session types (e.g. "SAT Prep $60 / 90 min") see parents charged the right price through Stripe. Teachers who never create session types continue working exactly as before.

## Slice Overview
| ID | Slice | Risk | Depends | Done | After this |
|----|-------|------|---------|------|------------|
| S01 | Capacity + Waitlist Signup | low | — | ✅ | Teacher sets capacity_limit=3 in dashboard settings. With 3 active students, their profile page shows 'Currently at capacity' with a waitlist signup form instead of the booking calendar. A parent enters their email and joins the waitlist. Teacher info and reviews remain visible. |
| S02 | Waitlist Dashboard + Notifications | low | S01 | ✅ | Teacher opens /dashboard/waitlist and sees parents who joined the waitlist (email, join date, notified status). Teacher can remove entries. When teacher cancels a confirmed booking that frees capacity below the limit, all unnotified waitlisted parents receive an email with a direct booking link. |
| S03 | Session Types + Variable Pricing | high | S01 | ⬜ | Teacher creates session types (e.g. 'SAT Prep $60 / 90 min', 'Homework Help $35 / 60 min') in dashboard settings. Parent visits profile, selects a session type, sees only slots where the locked duration fits, picks a time, and Stripe PaymentIntent is created for the flat session-type price. Teacher with no session types sees unchanged booking flow with subject selector and hourly_rate proration. |
