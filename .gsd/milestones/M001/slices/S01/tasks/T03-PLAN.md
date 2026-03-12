# T03: 01-foundation 03

**Slice:** S01 — **Milestone:** M001

## Description

Create the complete Phase 1 database schema: teachers, availability, bookings (state machine stub), and reviews (stub) tables — with all RLS policies, indexes, timestamptz enforcement, IANA timezone column, booking unique constraint, and Supabase Storage bucket configuration.

Purpose: Every subsequent plan (onboarding wizard, public profile page, dashboard) reads and writes to this schema. Getting it right now prevents destructive migrations later.

Output: A single SQL migration file (0001_initial_schema.sql) that can be applied via `supabase db push` or directly in the Supabase SQL editor, plus a Supabase Storage public bucket for profile images.

## Must-Haves

- [ ] "All tables exist: teachers, availability, bookings, reviews"
- [ ] "RLS is enabled on every table with correct policies"
- [ ] "teachers.timezone is TEXT NOT NULL (IANA timezone)"
- [ ] "All timestamp columns use TIMESTAMPTZ (never bare TIMESTAMP or TIME)"
- [ ] "bookings has UNIQUE constraint on (teacher_id, booking_date, start_time)"
- [ ] "teachers has UNIQUE constraint on slug"
- [ ] "Supabase Storage bucket 'profile-images' exists as public bucket"
- [ ] "Booking status CHECK constraint enforces valid state machine values"

## Files

- `supabase/migrations/0001_initial_schema.sql`
