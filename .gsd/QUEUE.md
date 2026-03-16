# Queued Milestones

<!-- Items here are future milestone ideas, not yet planned. They'll be picked up after the current milestone completes or when explicitly scheduled. -->

## Variable Pricing by Session Type

**Added:** 2026-03-11
**Requested by:** User
**Priority:** TBD (after M004 or M005)

**Problem:** Currently teachers have a single `hourly_rate` on the `teachers` table. Some teachers want to charge differently based on session type — e.g. $35 for a general session, $45 for test prep, $50 for college essay review.

**Desired behavior:**
- Default: single price point (most teachers just have one rate) — no UX change needed
- Optional: teacher can define per-subject or per-session-type pricing that overrides the default rate
- The booking flow should surface the correct price based on what the parent selects
- Must be clear and easy for the teacher to set up (not overwhelming)

**Current state:**
- `teachers.hourly_rate` — single integer column (min 10, max 500)
- Onboarding wizard step 2 collects `hourly_rate` via a number input
- Payment intent creation uses `teacher.hourly_rate` to compute amount
- Booking form has a subject selector (when teacher has multiple subjects)

**Design considerations:**
- Could be per-subject pricing (subjects already exist as `text[]` on teacher) or a separate "session types" concept
- Per-subject is simpler but less flexible (what if a teacher charges differently for "SAT Prep" vs "ACT Prep" but both are under "Math"?)
- A separate `session_types` table with `(id, teacher_id, label, price, sort_order)` is more flexible
- Default rate should still work as fallback — if no session types defined, use `hourly_rate`
- Booking calendar needs to show price next to session type selector
- Stripe payment intent amount must use the correct session-type price

**Rough scope:**
- New `session_types` table or pricing on subjects
- Dashboard settings UI for managing session types + prices
- Booking form integration (select session type → price adjusts)
- Payment intent uses session-type price instead of flat hourly_rate
- Migration: existing teachers keep working with single hourly_rate as default
