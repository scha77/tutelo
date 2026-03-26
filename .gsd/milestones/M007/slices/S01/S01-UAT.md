# S01: Capacity Limits + Waitlist Signup — UAT

**Milestone:** M007
**Written:** 2026-03-26T02:27:37.550Z

## UAT Script — S01: Capacity Limits + Waitlist Signup

### Preconditions

- Local dev server running (`npm run dev`)
- Test teacher account exists with a published profile (e.g., `/test-teacher`)
- Supabase: migration 0011 applied (capacity_limit, waitlist, session_types tables exist)
- Teacher has at least one confirmed booking with a student name (for student count display)
- Supabase Studio accessible for direct table inspection

---

### TC-01: Teacher sets a capacity limit in dashboard settings

**Steps:**
1. Log in as a teacher → navigate to `/dashboard/settings`
2. Scroll to the "Student Capacity" (or Capacity Settings) section
3. Confirm: checkbox "Limit the number of active students" is unchecked by default
4. Check the checkbox → number input appears (default value: 10)
5. Change value to `3`
6. Click "Save" → toast confirmation appears

**Expected:**
- Checkbox toggle shows/hides number input
- Active student count is displayed alongside the input
- Toast confirms save
- Supabase Studio → teachers row shows `capacity_limit = 3`

---

### TC-02: Teacher profile shows booking calendar when NOT at capacity

**Setup:** Teacher has `capacity_limit = 5` and fewer than 5 active students (confirmed/completed bookings in last 90 days with distinct names)

**Steps:**
1. Navigate to the teacher's public profile (`/[slug]`)
2. Observe the booking section

**Expected:**
- Booking calendar renders normally
- No "at capacity" message visible
- "Book Now" CTA (if present) is visible

---

### TC-03: Teacher profile shows at-capacity state when AT capacity

**Setup:** Teacher has `capacity_limit = 1` and at least 1 distinct student with a confirmed/completed booking in last 90 days

**Steps:**
1. Navigate to the teacher's public profile (`/[slug]`)
2. Observe the booking section

**Expected:**
- Booking calendar is NOT visible
- "Currently at capacity" message appears with the teacher's first name
- Waitlist email signup form is visible (email input + submit button)
- "Book Now" CTA (scroll link) is NOT visible
- Teacher info, photo, bio, etc. remain visible as normal

---

### TC-04: Parent successfully joins waitlist

**Setup:** Teacher profile is at capacity (TC-03 setup)

**Steps:**
1. On the at-capacity profile page, enter a valid email in the waitlist form (e.g., `parent@example.com`)
2. Click the submit button

**Expected:**
- Submission button shows loading state during request
- Success state appears: "You're on the list!" (or equivalent confirmation)
- Supabase Studio → waitlist table shows a new row with: `teacher_id` matching the teacher, `parent_email = 'parent@example.com'`, `created_at` populated, `notified_at = null`

---

### TC-05: Duplicate waitlist signup shows friendly message

**Setup:** `parent@example.com` is already on the teacher's waitlist

**Steps:**
1. On the same at-capacity profile, enter `parent@example.com` again
2. Click submit

**Expected:**
- Form shows a distinct "already on waitlist" state (e.g., blue/info message, not an error)
- No new row is inserted in the waitlist table

---

### TC-06: Invalid email shows client-side validation error

**Steps:**
1. On the at-capacity profile, enter `notanemail` in the waitlist form
2. Click submit (or attempt to submit)

**Expected:**
- Form shows validation error (invalid email format)
- No network request is made (client-side validation fires first)

---

### TC-07: Teacher with no capacity limit sees unchanged profile

**Setup:** Teacher has `capacity_limit = null` (unlimited)

**Steps:**
1. Navigate to the teacher's public profile

**Expected:**
- Booking calendar visible
- No at-capacity section, no waitlist form
- No capacity-related DB query fired (short-circuit when limit is null)

---

### TC-08: Teacher clears capacity limit in settings

**Steps:**
1. Log in as a teacher who has `capacity_limit = 3`
2. Navigate to `/dashboard/settings` → Capacity Settings
3. Uncheck the "Limit the number of active students" checkbox
4. Click "Save"

**Expected:**
- Toast confirms save
- Supabase Studio → teachers row shows `capacity_limit = null`
- Teacher's public profile now shows booking calendar (not at-capacity state) regardless of active student count

---

### TC-09: Active student count displays correctly in settings

**Setup:** Teacher has 2 confirmed/completed bookings with distinct student names in last 90 days

**Steps:**
1. Navigate to `/dashboard/settings` → Capacity Settings section

**Expected:**
- Active student count shown is `2` (or matches actual distinct student count)

---

### Edge Cases

- **TC-10 (zero students):** Teacher has `capacity_limit = 3` and 0 active students → profile shows booking calendar normally
- **TC-11 (limit = 1, 1 student):** Teacher with `capacity_limit = 1` and exactly 1 active student → at-capacity state shown
- **TC-12 (limit = 1, student from >90 days ago):** Old booking outside 90-day window should NOT count as active → profile may show booking calendar
- **TC-13 (whitespace/uppercase email):** Enter ` PARENT@EXAMPLE.COM ` in waitlist form → should be trimmed and lowercased before insert, unique constraint respects canonical form

