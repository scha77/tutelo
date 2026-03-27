# S01: Capacity + Waitlist Signup — UAT

**Milestone:** M007
**Written:** 2026-03-27T01:55:54.641Z

## UAT Script: S01 — Capacity + Waitlist Signup

**Environment:** Local dev (`npm run dev`) or staging.tutelo.app  
**Preconditions:**
- Supabase migration 0011 applied (`capacity_limit` column on teachers, `waitlist` table exists)
- Test teacher account available (soosup.cha+test@gmail.com / testing123)
- Teacher has at least some bookings OR can manually set capacity_limit via Supabase dashboard to trigger at-capacity state

---

### TC-01: Dashboard Settings — Capacity Field Renders

**Steps:**
1. Log in as test teacher
2. Navigate to `/dashboard/settings`
3. Scroll to the "Capacity Limit" card

**Expected:** Card shows with title "Capacity Limit", descriptive subtitle about waitlist behavior, a checkbox toggle labeled "Limit the number of active students", and active student count display. If teacher has no limit set, checkbox is unchecked.

---

### TC-02: Enable Capacity Limit and Save

**Steps:**
1. On `/dashboard/settings`, click the "Limit the number of active students" checkbox (enables it)
2. A number input appears; set value to 3
3. Click Save

**Expected:** Toast shows "Capacity settings saved!". Refreshing the page shows the checkbox checked with value 3.

---

### TC-03: Clear Capacity Limit (Set to Unlimited)

**Steps:**
1. On `/dashboard/settings` with capacity enabled (from TC-02)
2. Uncheck the "Limit the number of active students" checkbox
3. Click Save

**Expected:** Toast shows "Capacity settings saved!". Refreshing shows the checkbox unchecked (unlimited). Teacher profile shows the booking calendar (not at-capacity state).

---

### TC-04: Invalid Capacity Value Rejected

**Steps:**
1. Enable capacity toggle
2. Clear the number input or enter 0
3. Click Save

**Expected:** Toast shows "Capacity must be between 1 and 100". No DB update occurs.

---

### TC-05: Teacher Profile — Under Capacity Shows Booking Calendar

**Preconditions:** Teacher capacity_limit is null OR active student count < capacity_limit

**Steps:**
1. Navigate to teacher profile page (e.g., `/test-teacher`)

**Expected:** "Book a Session" section shows the booking calendar. No at-capacity message or waitlist form visible. BookNowCTA ("Book Now") button visible in hero section.

---

### TC-06: Teacher Profile — At Capacity Shows Waitlist Form

**Preconditions:** Set teacher capacity_limit = 1 AND teacher has ≥1 active student (confirmed/completed booking in last 90 days), OR set capacity_limit = 0 in DB directly

**Steps:**
1. Navigate to teacher profile page

**Expected:**
- "Book a Session" section shows "Currently at capacity" with Clock icon
- Teacher's first name appears in the message ("Jane is currently at full capacity.")
- "Leave your email" prompt visible
- WaitlistForm with email input and "Notify Me" button rendered
- BookNowCTA button NOT visible in hero section
- HeroSection (name, photo, rating) visible ✓
- CredentialsBar (subjects, school, verified badge) visible ✓
- AboutSection visible ✓
- ReviewsSection visible ✓

---

### TC-07: Waitlist Signup — Valid Email

**Preconditions:** Teacher profile at capacity (TC-06 preconditions)

**Steps:**
1. On at-capacity profile page, enter a valid email: `parent@example.com`
2. Click "Notify Me"

**Expected:**
- Loader spinner shows briefly during submission
- Success state appears: "You're on the list! We'll email you when a spot opens up." (green box with checkmark)
- No error messages

---

### TC-08: Waitlist Signup — Duplicate Email

**Steps:**
1. Repeat TC-07 with the same email `parent@example.com` on the same teacher's profile

**Expected:** Friendly message appears: "You're already on the waitlist. We'll notify you when a spot opens." (blue box, not red error)

---

### TC-09: Waitlist Signup — Invalid Email Format

**Steps:**
1. On at-capacity profile page, type `notanemail` in the email field
2. Attempt to click "Notify Me"

**Expected:** Submit button remains disabled (client-side validation). The button only enables when the email passes the `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` regex.

---

### TC-10: Waitlist Signup — Empty Email

**Steps:**
1. On at-capacity profile page, leave email input empty
2. Click "Notify Me"

**Expected:** Submit button is disabled (empty email fails client-side validation). No API request sent.

---

### TC-11: Waitlist Entry Persists in DB

**Steps:**
1. Complete TC-07
2. Open Supabase table editor → `waitlist` table
3. Filter by teacher_id

**Expected:**
- Row exists with correct teacher_id, parent_email (lowercased, trimmed), created_at timestamp, notified_at = NULL

---

### TC-12: API Route Direct Validation — Missing teacherId

**Steps:**
```bash
curl -X POST http://localhost:3000/api/waitlist \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

**Expected:** HTTP 400 with `{"error": "teacherId is required"}`

---

### TC-13: API Route Direct Validation — Invalid Email

**Steps:**
```bash
curl -X POST http://localhost:3000/api/waitlist \
  -H "Content-Type: application/json" \
  -d '{"teacherId": "some-uuid", "email": "bademail"}'
```

**Expected:** HTTP 400 with `{"error": "Invalid email format"}`

---

### TC-14: Capacity Check Error — Safe Default

**Preconditions:** Simulate DB failure for capacity check (or test via code inspection — on error, `atCapacity` defaults to false)

**Expected:** Profile renders booking calendar (not at-capacity state). A console.error log appears with `[capacity] Query failed on profile page` and teacher_id context (no PII).

---

### TC-15: Teacher Info Always Visible at Capacity

**Preconditions:** Teacher at capacity (TC-06 state)

**Steps:**
1. On at-capacity profile page, scroll through the full page

**Expected (all must be visible):**
- Hero section: teacher name, photo, star rating, location
- Credentials bar: subjects, school, verified badge (if applicable)
- About section: bio text
- Reviews section: parent reviews
- Social/contact links

**NOT visible:**
- BookingCalendar slots
- BookNowCTA "Book Now" sticky/floating button

---

### Edge Cases

**TC-16: Null capacity_limit (unlimited)**  
Set teacher capacity_limit = NULL in DB. Visit profile. Booking calendar renders regardless of how many active students exist.

**TC-17: Capacity exactly at limit**  
Set capacity_limit = 3. Ensure exactly 3 distinct student_names in bookings (confirmed/completed, last 90 days). Profile shows at-capacity state.

**TC-18: Capacity one under limit**  
Set capacity_limit = 3. Ensure exactly 2 distinct students. Profile shows booking calendar.

**TC-19: Email with leading/trailing spaces**  
Submit ` parent@example.com ` (with spaces). API should trim before insert. Row in DB has trimmed email `parent@example.com`.

**TC-20: Email stored as lowercase**  
Submit `PARENT@EXAMPLE.COM`. DB row should contain `parent@example.com` (lowercased).

