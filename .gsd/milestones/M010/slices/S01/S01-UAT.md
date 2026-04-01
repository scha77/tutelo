# S01: Parent Dashboard & Multi-Child — UAT

**Milestone:** M010
**Written:** 2026-04-01T13:09:45.930Z

## S01 UAT: Parent Dashboard & Multi-Child

### Preconditions
- Supabase migration 0017 applied (`children` table, `child_id` on `bookings`)
- Test accounts: one parent-only user (no teacher row), one teacher user, one dual-role user (both teacher + parent)
- App running locally (`npm run dev`) or against staging

---

### TC-01: Parent-Only User Login → Redirects to /parent

**Given:** A user with no teacher row signs in (email/password)
**Steps:**
1. Navigate to `/login`
2. Enter parent-only credentials and submit
**Expected:** Redirected to `/parent` (not `/onboarding`, not `/dashboard`)

---

### TC-02: Teacher User Login → Redirects to /dashboard

**Given:** A user with a teacher row signs in
**Steps:**
1. Navigate to `/login`
2. Enter teacher credentials and submit
**Expected:** Redirected to `/dashboard` (unchanged behavior)

---

### TC-03: OAuth Callback Routes Parent Correctly

**Given:** A parent-only user completes Google or email magic-link auth
**Steps:**
1. Trigger auth flow that hits `/auth/callback`
2. No teacher row exists for the user
**Expected:** Final redirect lands on `/parent`, not `/onboarding`

---

### TC-04: Login Page Redirects Authenticated Parent

**Given:** A parent-only user is already authenticated (valid session cookie)
**Steps:**
1. Navigate to `/login`
**Expected:** Immediately redirected to `/parent` (no login form shown)

---

### TC-05: /account Redirects to /parent/bookings

**Steps:**
1. Navigate to `/account`
**Expected:** Redirected to `/parent/bookings`

---

### TC-06: Unauthenticated Access to /parent → Redirected to Login

**Given:** No session cookie
**Steps:**
1. Navigate to `/parent`
**Expected:** Redirected to `/login?redirect=/parent`

---

### TC-07: Parent Dashboard Overview Page Renders

**Given:** Authenticated parent user
**Steps:**
1. Navigate to `/parent`
**Expected:**
- Page renders without error
- Sidebar shows "Overview", "My Children", "My Bookings" nav items
- Stats cards visible (children count, upcoming sessions, past sessions)
- Sign out button present

---

### TC-08: Dual-Role User Sees Cross-Link to Teacher Dashboard

**Given:** User has both a teacher row and is authenticated as a parent
**Steps:**
1. Navigate to `/parent`
**Expected:**
- ParentSidebar shows "Go to Teacher Dashboard" link pointing to `/dashboard`
- All parent nav items also present

---

### TC-09: Add a Child — Happy Path

**Given:** Authenticated parent on `/parent/children`
**Steps:**
1. Click "Add Child" button
2. Enter name "Emma" and grade "3rd Grade"
3. Click "Save" / submit
**Expected:**
- New child card appears with name "Emma" and grade "3rd Grade"
- Children count badge in sidebar increments

---

### TC-10: Add Child — Validation (Empty Name)

**Given:** Add Child form is open
**Steps:**
1. Submit form with empty name field
**Expected:** Validation error shown; no child created

---

### TC-11: Add Child — Validation (Name Too Long)

**Given:** Add Child form is open
**Steps:**
1. Enter a name longer than 100 characters and submit
**Expected:** Validation error shown; no child created (mirrors API-level Zod validation)

---

### TC-12: Edit a Child

**Given:** At least one child exists on `/parent/children`
**Steps:**
1. Click "Edit" on child card
2. Change name to "Emma Jane" and grade to "4th Grade"
3. Save
**Expected:** Card updates in-place with new name and grade

---

### TC-13: Delete a Child — With Confirmation

**Given:** At least one child exists
**Steps:**
1. Click "Delete" on child card
2. Confirmation dialog appears → confirm
**Expected:** Child card removed; no other children affected

---

### TC-14: Delete Child — Cancel Does Not Delete

**Steps:**
1. Click "Delete" on child card
2. Confirmation dialog appears → cancel
**Expected:** Child card remains unchanged

---

### TC-15: Unauthorized Child Access Returns 404

**Given:** Parent A has child with id=X
**Steps:**
1. Parent B sends `PUT /api/parent/children/X` with their session
**Expected:** 404 response (not 401, not 200); parent B cannot modify parent A's child

---

### TC-16: GET /api/parent/children Without Auth Returns 401

**Steps:**
1. Send `GET /api/parent/children` with no session cookie
**Expected:** 401 JSON response

---

### TC-17: Parent Bookings Page — Upcoming/Past Split

**Given:** Parent has at least one upcoming and one past booking
**Steps:**
1. Navigate to `/parent/bookings`
**Expected:**
- "Upcoming Sessions" section with future bookings
- "Past Sessions" section with historical bookings
- Each booking shows teacher name, date, time, status

---

### TC-18: Bookings Page Shows Child Name When child_id Present

**Given:** A booking has `child_id` linked to child "Emma"
**Steps:**
1. Navigate to `/parent/bookings`
**Expected:** Booking row shows "Emma" (not free-text student_name)

---

### TC-19: BookingCalendar Shows Child Selector for Logged-In Parent with Children

**Given:** Authenticated parent with at least one child saved; viewing a teacher's profile
**Steps:**
1. Navigate to `/[teacher-slug]` booking calendar
2. Advance to the student name step
**Expected:** `<Select>` dropdown visible with child names as options, plus "Someone else (type name)" option at bottom

---

### TC-20: Selecting a Child Sets Name and childId in Form

**Steps:**
1. Open the child selector on BookingCalendar
2. Select child "Emma" from dropdown
**Expected:**
- Student name field (if visible) shows "Emma"
- Booking submission payload includes `child_id` matching Emma's ID

---

### TC-21: "Someone Else" Option Shows Text Input

**Steps:**
1. Open child selector, select "Someone else (type name)"
**Expected:**
- Text input appears for free-form name entry
- `child_id` is cleared (null) in form state

---

### TC-22: Unauthenticated User (Guest) Sees Text Input, Not Child Selector

**Given:** No session cookie; viewing a teacher's booking calendar
**Steps:**
1. Navigate to `/[teacher-slug]`
2. Advance to student name step
**Expected:** Text input shown (no Select dropdown); no fetch to `/api/parent/children`

---

### TC-23: Logged-In Parent with Zero Children Sees Text Input

**Given:** Authenticated parent with no children saved
**Steps:**
1. Navigate to `/[teacher-slug]` booking calendar
2. Advance to student name step
**Expected:** Text input shown (Select dropdown not rendered)

---

### TC-24: Booking Submission Includes child_id When Child Selected

**Steps:**
1. As authenticated parent with children, select a child in BookingCalendar
2. Complete booking flow (direct or recurring)
**Expected:** POST body to `/api/direct-booking/create-intent` or `/api/direct-booking/create-recurring` includes `childId` field matching selected child's ID

---

### TC-25: Full Suite Regression

**Steps:**
1. `npx vitest run`
**Expected:** 419 tests pass, 0 fail

---

### Edge Cases

- **Mobile viewport (375px):** ParentMobileNav bottom tabs visible; sidebar hidden. All 3 pages accessible via tabs.
- **Mid-booking child fetch failure:** If `/api/parent/children` returns 500, BookingCalendar silently falls back to text input — booking flow not blocked.
- **Dual-role user on /parent/children:** Can manage children as a parent; "Go to Teacher Dashboard" link in sidebar navigates to /dashboard without data loss.
- **Child with no grade:** Adding a child with only name (no grade) succeeds; grade displays as empty/dash on card.
