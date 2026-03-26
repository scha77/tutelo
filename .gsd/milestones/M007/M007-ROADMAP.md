# M007: M007: Capacity & Pricing

**Vision:** Teachers can limit how many active students they accept and create differentiated session types with custom pricing. Parents see "at capacity" states with waitlist signup, or select session types with accurate prices during booking. Both pricing paths (session-type flat price and hourly_rate proration) coexist with zero regression for existing teachers.

## Success Criteria

- Teacher with capacity_limit=3 and 3 active students → profile shows 'at capacity' + waitlist form; parent joins waitlist, booking cancelled → all waitlisted parents receive email with booking link
- Teacher with 2 session types → parent selects 'SAT Prep $60 / 90 min', books a 90-min slot → Stripe PaymentIntent created for $60 (not computed from hourly_rate × duration)
- Teacher with no session types and no capacity limit → booking flow works identically to pre-M007 (subject selector, hourly_rate proration, no capacity check)
- Migration 0011 applies cleanly with no destructive changes to existing tables
- All new RLS policies enforce correct access: anonymous waitlist insert, teacher-gated writes on session_types and capacity_limit, public reads on session_types

## Slices

- [x] **S01: Capacity Limits + Waitlist Signup** `risk:low-medium` `depends:[]`
  > After this: Teacher sets capacity_limit=3 in dashboard settings. With 3 active students, their profile page shows 'Currently at capacity' with teacher info still visible and a waitlist email signup form replacing the booking calendar. A parent enters their email and sees a confirmation. Teachers without a capacity limit see no changes.

- [ ] **S02: Waitlist Dashboard + Notifications** `risk:low` `depends:[S01]`
  > After this: Teacher views their waitlist in the dashboard — sees parent emails and join dates, can remove entries. Teacher cancels a confirmed booking that was keeping them at capacity. System re-checks active student count, finds capacity freed, and sends a notification email to all unnotified waitlisted parents with a direct booking link to the teacher's profile.

- [ ] **S03: Session Types + Variable Pricing** `risk:high` `depends:[S01]`
  > After this: Teacher creates session types in dashboard settings (e.g. 'SAT Prep $60 / 90 min', 'Homework Help $35 / 60 min'). Parent visits teacher profile, sees session type selector as the first booking step. Selects 'SAT Prep' — calendar shows only slots where 90 minutes fits within availability. Parent books a slot and Stripe PaymentIntent is created for $60 (not computed from hourly_rate). A teacher with no session types sees the unchanged booking flow: subject selector, hourly_rate proration.

## Boundary Map

```
Browser (Parent) ──→ [slug]/page.tsx (RSC) ──→ Supabase (capacity check + session types read)
                  │                              │
                  │  at capacity? ──→ AtCapacitySection ──→ waitlist INSERT (anon RLS)
                  │  not at capacity? ──→ BookingCalendar (session type selector → slot filter → form)
                  │                              │
                  ▼                              ▼
              create-intent/route.ts ──→ Supabase (session_type lookup) ──→ Stripe (PaymentIntent)
                                              │
Dashboard (Teacher) ──→ settings/page.tsx ──→ Supabase (capacity_limit UPDATE, session_types CRUD)
                     ──→ waitlist view ──→ Supabase (waitlist SELECT/DELETE)
                                              │
cancelSession() ──→ checkAndNotifyWaitlist() ──→ Supabase (recount students) ──→ Resend (email blast)
```
