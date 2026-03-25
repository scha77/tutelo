---
depends_on: [M006]
---

# M007: Capacity & Pricing

**Gathered:** 2026-03-25
**Status:** Draft — needs dedicated discussion before planning

## Project Description

Tutelo needs capacity management and variable pricing. Side-hustling teachers may only have room for 3 students — they need a way to cap bookings without removing their link. Some teachers want to charge differently for different session types (e.g., SAT Prep vs General Math). This milestone adds both.

## Why This Milestone

Capacity limits prevent teacher burnout and parent frustration (no more booking into an empty calendar). Variable pricing unlocks higher revenue per teacher and more accurate pricing for specialized sessions. Both touch the booking flow, so they're natural to build together.

## Key Decisions from Discussion

- **Capacity model:** max active students OR max weekly sessions — teacher chooses which limit type to set. Nullable (null = unlimited).
- **Waitlist:** Full waitlist with parent email collection and auto-notification when capacity frees up. New `waitlist` table.
- **Pricing model:** Separate `session_types` table (not per-subject pricing). More flexible — handles "SAT Prep $45" vs "Homework Help $35" within the same subject.
- **Backward compatibility:** Teachers without session types continue using single `hourly_rate`. No breaking changes.
- **Admin:** Read-only admin dashboard — no moderation powers yet.

## Provisional Scope

### In Scope
- `capacity_limit` column on teachers table (nullable integer)
- Capacity type selector (max students or max weekly sessions)
- Profile page "at capacity" state replacing booking calendar
- Waitlist table and parent email collection form
- Teacher waitlist management in dashboard
- Auto-notification email when capacity frees up
- `session_types` table with label, price, duration_minutes, sort_order
- Dashboard UI for managing session types
- Booking form session type selector with dynamic pricing
- Payment intent using session-type price
- Backward compatibility: hourly_rate fallback

### Out of Scope
- Group session pricing
- Dynamic/surge pricing
- Waitlist priority ordering (FIFO is sufficient)

## Relevant Requirements
- CAP-01, CAP-02, WAIT-01, WAIT-02, WAIT-03, SESS-01, SESS-02, SESS-03, SESS-04

## Open Questions
- Should capacity count "active students" (unique student_name with confirmed/completed bookings) or "active booking slots" (confirmed bookings in the future)?
- Should the waitlist notification email include a direct booking link or just alert the parent?
