# Phase 5: Dashboard + Reviews - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

A teacher can see their full business at a glance: upcoming sessions, all-time earnings, and a student list. Completed sessions trigger a review prompt email to the parent; parents submit reviews via a token-based URL; reviews appear on the teacher's public profile. Mark Complete (triggering payment capture) was built in Phase 3 and lives on the requests page — Phase 5 reorganizes where sessions are displayed and wires the review flow end-to-end.

</domain>

<decisions>
## Implementation Decisions

### Dashboard home structure

- Dashboard home (`/dashboard`) becomes a real overview screen — replaces the current redirect to `/dashboard/page`
- Stats bar at top: **Total Earned** (all-time from completed sessions) | **Upcoming** (count of confirmed sessions) | **Students** (unique student count)
- Upcoming sessions section: show next **3** confirmed sessions, then a "View all sessions →" link to `/dashboard/sessions`
- Latest reviews section: show **1–2** most recent reviews with star rating + excerpt, then a "View profile →" link to the public page
- No month-scoped breakdowns for MVP — all-time totals only

### Session history (`/dashboard/sessions`)

- New dedicated route: `/dashboard/sessions` added to sidebar nav
- Confirmed sessions **move here** from `/dashboard/requests` — requests page becomes pending-only (cleaner separation)
- Two sections on the sessions page:
  - **Upcoming** — confirmed sessions, sorted by date ascending, with Mark Complete button (reuses `ConfirmedSessionCard`)
  - **Past** — completed sessions, sorted by date descending
- Per completed session row: student name, subject, date, amount earned, review status (`★★★★★` or `No review yet`)

### Student list (`/dashboard/students`)

- Separate route `/dashboard/students` with its own sidebar nav item
- A "student" = unique (student_name, parent_email) pairing — grouped across sessions
- Per student row: student name, subject(s) they've done, sessions completed count
- No contact/message actions for MVP — read-only list

### Review submission flow

- Parent receives review prompt email (REVIEW-03) after teacher marks session complete — `SessionCompleteEmail.tsx` already exists; wire review link into it
- Review link: `/review/[token]` — token-based, **no login required**
- Token stored in `reviews` table (or a `review_tokens` table), invalidated on submission, no expiry for MVP (parent may wait weeks to click)
- Review form: **1–5 star rating** (required) + **optional text** field — matches REVIEW-01 exactly
- After submit: inline success state on the same page ("Thanks! Your review has been posted.") — no redirect, token invalidated to prevent duplicate submission

### Review display on public profile (`/[slug]`)

- Reviews section renders **only when at least 1 review exists** — hidden entirely for teachers with no reviews (no empty state)
- Header: aggregate rating + count — e.g., `4.9 ★ (12 reviews)`
- Show **5 most recent** reviews — no pagination, no "load more" for MVP
- Per review card: star rating, optional text body, reviewer first name + date (e.g., `Sarah K. · March 2026`)
- Parent privacy: first name only (extracted from parent_email or stored on submission)

### Claude's Discretion

- Exact layout and styling of the dashboard home stats bar (cards, grid, colors)
- Empty states for sessions page (no upcoming, no past) and students page (no students yet)
- Sidebar nav ordering for new items (Sessions, Students)
- `review_tokens` table structure vs embedding token on `reviews` row
- How to extract reviewer first name (from parent_email prefix, or ask on review form)
- Mobile layout for the `/review/[token]` form page

</decisions>

<specifics>
## Specific Ideas

- The dashboard home overview mockup from discussion: stats bar (Total Earned / Upcoming / Students), then upcoming sessions (3 shown), then latest reviews (1–2 shown) — all linking to their respective detail pages
- Sessions page layout exactly matches the discussion mockup: Upcoming section with Mark Complete buttons, Past section with per-row amount + review status
- Reviews on the public profile should feel like Airbnb/Etsy — aggregate star rating up top, individual cards below with name and date

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets

- `ConfirmedSessionCard.tsx` (`src/components/dashboard/ConfirmedSessionCard.tsx`): Already renders confirmed session with student name, subject, date/time in teacher timezone, and Mark Complete button. Reuse on `/dashboard/sessions` Upcoming section unchanged.
- `SessionCompleteEmail.tsx` (`src/emails/`): Already exists from Phase 3 (NOTIF-06). Phase 5 adds review link (`/review/[token]`) to this template.
- `SessionReminderEmail.tsx` (`src/emails/`): Exists — unrelated to Phase 5 but shows email template pattern.
- `RequestCard.tsx` (`src/components/dashboard/RequestCard.tsx`): Pattern for action cards. Sessions page Past section will be a simpler read-only variant.
- `Sidebar.tsx` (`src/components/dashboard/Sidebar.tsx`): Add Sessions and Students nav items here.
- Dashboard layout (`src/app/(dashboard)/dashboard/layout.tsx`): Wraps all dashboard pages — new routes automatically get sidebar.

### Established Patterns

- No confirmation dialogs on single actions (Phase 2/3) — Mark Complete stays one-click
- RSC shell with client islands — sessions page and dashboard home are RSC; `ConfirmedSessionCard` is already a client component
- `supabase.auth.getClaims()` pattern (not `getSession()`) — see existing `requests/page.tsx`
- Server Actions for mutations (mark complete already wired via `markSessionComplete` in `@/actions/bookings`)
- `formatInTimeZone` from date-fns-tz for all date display in teacher timezone
- Tailwind v4 CSS-first — no `tailwind.config.js`, use `@theme` and CSS variables

### Integration Points

- `/dashboard` — replace redirect with real overview page (RSC); queries: upcoming sessions count, total earnings sum, student count, 2 most recent reviews
- `/dashboard/sessions` — new route; Upcoming section reuses `ConfirmedSessionCard`; Past section queries `status = 'completed'` bookings joined with reviews
- `/dashboard/requests` — remove Confirmed section (moves to `/dashboard/sessions`); keep pending-only
- `/dashboard/students` — new route; query: group bookings by (student_name, parent_email), aggregate session count and subjects
- `/review/[token]` — new public (unprotected) route; reads token → gets booking/teacher info; Server Action to submit review and invalidate token
- `SessionCompleteEmail.tsx` — add `reviewUrl` prop; caller passes `/review/[token]` (token generated at mark-complete time)
- `bookings` table — already has `status = 'completed'` and `stripe_payment_intent`; review token can be stored on `reviews` table or a new `review_tokens` table
- `reviews` table — already exists from Phase 1 schema (`01-03`); verify columns: `booking_id`, `teacher_id`, `rating`, `review_text`, `reviewer_name`, `created_at` + add `token` and `token_used_at` columns

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-dashboard-reviews*
*Context gathered: 2026-03-10*
