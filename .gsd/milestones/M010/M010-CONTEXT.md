# M010: Parent & Admin

**Gathered:** 2026-03-31
**Status:** Ready for planning

## Project Description

Tutelo is a live web app (tutelo.app) that gives K-12 classroom teachers a professional tutoring page with scheduling, payments, and booking. Nine milestones complete — teacher-side features are mature. M010 builds the parent side of the platform and adds operator visibility.

## Why This Milestone

The teacher experience is complete through M009. But the parent side is still guest-mode — parents book by entering email + student name as free text, with no account, no history, no saved cards, and no way to message their child's teacher. M010 transforms the parent experience from transactional guest visits into a persistent relationship with a login-required dashboard.

The admin dashboard addresses a growing operational blind spot — as the platform acquires teachers and processes bookings, the operator has no visibility into platform health without direct database queries.

Google SSO verification is bundled because the UI code already exists (LoginForm.tsx has the OAuth button wired) but has never been end-to-end verified.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Parent logs in, sees a dashboard with their children, booking history, saved card, and message threads
- Parent adds a child (name + grade level) and books a session selecting that child from a dropdown
- Parent's card is auto-saved on first Stripe booking; subsequent bookings use saved card with one click
- Teacher sends a message from their dashboard; parent sees it appear in real-time; email notification arrives
- Teacher or parent clicks "Continue with Google" and completes OAuth flow to the correct dashboard
- Teacher who signed in via Google can still verify their school email for the "Verified" badge
- Platform operator visits /admin, sees teacher count, booking volume, revenue, and recent activity

### Entry point / environment

- Entry point: https://tutelo.app (browser)
- Environment: Vercel production + Supabase hosted
- Live dependencies involved: Supabase Auth (Google OAuth provider), Supabase Realtime (messaging), Stripe API (saved cards), Resend (email notifications)

## Completion Class

- Contract complete means: unit tests pass for children CRUD, saved card flow, messaging, admin queries; tsc clean; build green
- Integration complete means: parent can log in, add child, book with saved card, and send/receive messages in real-time against live Supabase
- Operational complete means: Google OAuth flow works end-to-end; Realtime subscriptions stay connected; admin dashboard loads for allowlisted users and 404s for others

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- A parent can create an account, add a child, book a session with that child, and pay with a previously saved card — full round-trip
- Teacher and parent can exchange messages in real-time, and email notifications are delivered
- Google SSO works for both new signup and returning login, for both teacher and parent roles
- Admin dashboard shows accurate metrics and recent activity for an allowlisted user
- All existing booking flows (guest, direct, recurring) continue working unchanged

## Risks and Unknowns

- Supabase Realtime has not been used in this project before — subscription stability, RLS interaction, and reconnection behavior are unproven
- Parent dashboard is a new route group — must coexist with the teacher dashboard for dual-role users (someone who is both a teacher and a parent)
- Google OAuth provider may not be configured in the Supabase dashboard yet — configuration is external and untestable in unit tests
- Saved card reuse across teachers requires a parent-level Stripe Customer, which conflicts with the existing per-recurring-schedule Customer pattern from M009
- Booking form child selector must be backward compatible — existing bookings have free-text student_name, new bookings from logged-in parents get child_id FK

## Existing Codebase / Prior Art

- `src/components/auth/LoginForm.tsx` — Google SSO button already wired with `signInWithOAuth`
- `src/app/(auth)/callback/route.ts` — Auth callback route handles code exchange and teacher/onboarding redirect
- `src/app/(dashboard)/dashboard/layout.tsx` — Teacher dashboard layout with getUser() auth pattern
- `src/components/profile/BookingCalendar.tsx` — Booking form captures `form.name` as free-text "Student's name" (line 708)
- `src/app/api/direct-booking/create-recurring/route.ts` — Creates Stripe Customer per recurring schedule (not per parent)
- `src/lib/email.ts` — Resend email utilities with React Email templates
- `src/lib/supabase/server.ts` — Server-side Supabase client creation
- `src/lib/supabase/service.ts` — Admin Supabase client (service role)
- `supabase/migrations/0001_initial_schema.sql` — Bookings table schema with `student_name TEXT NOT NULL`

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions — it is an append-only register; read it during planning, append to it during execution.

## Relevant Requirements

- PARENT-04 — Multi-child management (M010/S01)
- PARENT-07 — Parent dashboard with booking history (M010/S01)
- PARENT-08 — Booking form child selector (M010/S01)
- AUTH-03 — Google SSO end-to-end (M010/S02)
- AUTH-04 — School email verification post-Google-login (M010/S02)
- PARENT-05 — Saved payment methods (M010/S03)
- PARENT-09 — Parent-level Stripe Customer (M010/S03)
- PARENT-06, MSG-01, MSG-02, MSG-03 — Messaging (M010/S04)
- ADMIN-01, ADMIN-02, ADMIN-04 — Admin dashboard (M010/S05)

## Scope

### In Scope

- Parent login-required dashboard at /parent route group
- Children table + CRUD + booking form child selector
- Parent-level Stripe Customer + single saved card
- Text-only messaging threads (one per teacher-parent relationship)
- Supabase Realtime for live message delivery
- Email notification on new message (Resend)
- Google SSO end-to-end verification
- School email verification works post-Google-login
- Read-only admin dashboard at /admin with env var gating
- Admin metrics: teacher count, active teachers, booking volume, revenue, conversion rates
- Admin activity feed: recent signups, bookings, completions

### Out of Scope / Non-Goals

- File/image attachments in messaging — text only
- Multiple saved cards per parent — single card only
- Admin moderation actions (ADMIN-03 — deferred)
- Push notifications (email only for M010)
- Parent mobile app — web dashboard only
- Per-child messaging threads — per-teacher-parent relationship only
- Migrating existing free-text student_name data to children FKs — old bookings stay as-is

## Technical Constraints

- Dashboard layout (teacher) uses `getUser()` not `getClaims()` — parent dashboard must follow same pattern
- Server actions are unreliable under dashboard layout POST re-renders (known Next.js 16 bug) — use API route handlers for mutations
- Anonymous mutations use API route + supabaseAdmin pattern (established in M007)
- Supabase Realtime requires enabling replication on the messages table via Supabase dashboard
- Stripe Customer for recurring schedules (per-schedule) stays as-is — parent-level Customer is additive

## Integration Points

- Supabase Auth — Google OAuth provider configuration
- Supabase Realtime — postgres_changes subscription on messages table
- Stripe — Customer creation per parent, SetupIntent for card saving, PaymentIntent with saved card
- Resend — New message notification email template

## Open Questions

- Does the auth callback route need updating to route parent-only users (no teacher row) to /parent instead of /onboarding? — Likely yes, need to check if parent has teacher row
- How to handle dual-role users (teacher + parent)? — Likely a role picker or sidebar that shows both dashboards
- Is the Supabase Google provider already configured? — Must verify at runtime; if not, configuration is a manual step
