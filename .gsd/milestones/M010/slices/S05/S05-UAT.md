# S05: Admin Dashboard — UAT

**Milestone:** M010
**Written:** 2026-04-01T14:36:36.685Z

# S05 Admin Dashboard — UAT Script

## Preconditions

- App running locally (`npm run dev`)
- A Supabase user account exists; its UUID is known
- `.env.local` is accessible for setting `ADMIN_USER_IDS`
- At least one teacher row and one completed booking row exist in the DB (for non-zero metrics)

---

## TC-01: Unauthenticated user cannot access /admin

**Given:** No active session (signed out or fresh incognito tab)
**Steps:**
1. Navigate directly to `/admin`

**Expected:** Redirected to `/login` (not a 404, not an empty page)

---

## TC-02: Authenticated non-admin user gets 404 at /admin

**Given:** A valid user session exists whose user ID is NOT in `ADMIN_USER_IDS`
**Steps:**
1. Sign in as any non-admin user (e.g., a teacher or parent account)
2. Navigate directly to `/admin`

**Expected:** Next.js 404 "Page not found" response — not a redirect to login, not a 403, not any content from the admin page

---

## TC-03: ADMIN_USER_IDS empty string → 404

**Given:** `ADMIN_USER_IDS=""` in `.env.local` (or env var set to empty string)
**Steps:**
1. Sign in as any authenticated user
2. Navigate to `/admin`

**Expected:** 404 — empty allowlist is treated as "no admins configured"

---

## TC-04: ADMIN_USER_IDS undefined → 404

**Given:** `ADMIN_USER_IDS` env var is not set at all
**Steps:**
1. Sign in as any authenticated user
2. Navigate to `/admin`

**Expected:** 404 — missing env var is treated as "no admins configured"

---

## TC-05: Admin user can access /admin and sees the dashboard

**Given:** `ADMIN_USER_IDS=<your-user-uuid>` in `.env.local`
**Steps:**
1. Sign in as the admin user whose UUID is in `ADMIN_USER_IDS`
2. Navigate to `/admin`

**Expected:**
- Page renders without redirect or 404
- Header shows "Admin Dashboard" title and "Operator" badge
- Header shows the signed-in user's email address
- "Sign out" button is visible

---

## TC-06: Stat cards display 6 platform metrics

**Given:** TC-05 preconditions met (admin signed in at /admin)
**Steps:**
1. Inspect the "Platform Metrics" section

**Expected:** Six stat cards visible:
- **Total Teachers** — numeric count of all teacher rows
- **Stripe Active** — count of teachers with `stripe_charges_enabled=true`
- **Published** — count of teachers with `is_published=true`
- **Total Bookings** — count of all booking rows
- **Completed** — count of bookings with `status='completed'`
- **Revenue** — USD currency string (e.g., "$1,250.00") summed from `amount_cents` on completed bookings

**Edge case:** If no completed bookings exist, Revenue shows "$0.00" (not an error or null)

---

## TC-07: Activity feed shows recent events with type badges

**Given:** TC-05 preconditions met, at least one teacher signup + one booking + one completed session in DB
**Steps:**
1. Scroll to the "Recent Activity" section

**Expected:**
- Up to 15 events displayed in a timeline list
- Each event has a colored type badge: green "Signup", blue "Booking", purple "Completed"
- Each event has a description (e.g., "Jane Doe signed up as a teacher", "Alice booked a session (confirmed)")
- Each event has a relative timestamp (e.g., "5m ago", "2d ago", "Mar 15")
- Events are sorted with most recent first

---

## TC-08: Empty activity feed graceful state

**Given:** DB has no teacher signups, bookings, or completions
**Steps:**
1. Admin navigates to `/admin`

**Expected:** Activity section shows "No activity yet." — not an error, not an empty list with no message

---

## TC-09: Sign-out works from admin header

**Given:** TC-05 preconditions met (admin signed in at /admin)
**Steps:**
1. Click the "Sign out" button in the header

**Expected:**
- Session is destroyed
- Redirected to `/login` (standard signOut server action behavior)

---

## TC-10: Non-admin cannot access /admin even with a valid session (whitespace in env var)

**Given:** `ADMIN_USER_IDS=" <admin-uuid> , <other-uuid> "` (whitespace around IDs)
**Steps:**
1. Sign in as the admin user
2. Navigate to `/admin`

**Expected:** Page renders successfully — whitespace in `ADMIN_USER_IDS` is trimmed; the admin ID is still matched correctly

---

## TC-11: TypeScript build is clean (regression check)

**Steps:**
1. Run `npx tsc --noEmit` in the project root

**Expected:** Exit code 0, no type errors

---

## TC-12: Full test suite passes (regression check)

**Steps:**
1. Run `npx vitest run`

**Expected:** 474 tests pass, 0 failures (including 9 admin-dashboard tests)
