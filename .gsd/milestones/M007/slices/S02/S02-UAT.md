# S02: Waitlist Dashboard + Notifications — UAT

**Milestone:** M007
**Written:** 2026-03-27T02:05:25.192Z

## UAT: Waitlist Dashboard + Notifications (S02)

### Preconditions

1. Teacher account exists with completed onboarding (test account: soosup.cha+test@gmail.com / testing123)
2. S01 is deployed: `capacity_limit` column exists on `teachers`, `waitlist` table exists with columns `(id, teacher_id, parent_email, created_at, notified_at)`
3. At least 1 row exists in `waitlist` for the test teacher — insert directly in Supabase: `INSERT INTO waitlist (teacher_id, parent_email) VALUES ('<teacher_id>', 'test-parent@example.com')`
4. `NEXT_PUBLIC_APP_URL` is set to the live deployment URL
5. Resend API key is configured (emails go to Resend dashboard in dev mode)

---

### TC-01: Waitlist Nav Item Appears in Sidebar

**Steps:**
1. Log in as teacher
2. Navigate to `/dashboard`
3. Inspect sidebar navigation items

**Expected:** "Waitlist" nav item appears between "Students" and "Page" entries, with the list-ordered icon. Item is also visible in mobile bottom tab bar.

---

### TC-02: Waitlist Page — No Capacity Limit Set

**Steps:**
1. Ensure teacher has `capacity_limit = NULL` in DB
2. Navigate to `/dashboard/waitlist`

**Expected:** Page renders with heading "Waitlist". Body shows: "Set a capacity limit in [Settings link] to enable the waitlist feature." The Settings link navigates to `/dashboard/settings`.

---

### TC-03: Waitlist Page — Capacity Set, No Entries

**Steps:**
1. Set `capacity_limit = 3` for test teacher; ensure `waitlist` table has 0 rows for this teacher
2. Navigate to `/dashboard/waitlist`

**Expected:** Page shows "No one on your waitlist yet."

---

### TC-04: Waitlist Page — Entries Displayed Correctly

**Preconditions:** Insert 2 waitlist rows:
- Row A: `parent_email = 'alice@example.com'`, `created_at = NOW() - INTERVAL '2 days'`, `notified_at = NULL`
- Row B: `parent_email = 'bob@example.com'`, `created_at = NOW() - INTERVAL '1 day'`, `notified_at = NOW()`

**Steps:**
1. Navigate to `/dashboard/waitlist`

**Expected:**
- Row A shows: `alice@example.com`, join date approximately 2 days ago, grey "Pending" badge, red "Remove" button
- Row B shows: `bob@example.com`, join date approximately 1 day ago, green "Notified" badge, red "Remove" button
- Rows are ordered oldest-first (Alice above Bob)

---

### TC-05: Remove Waitlist Entry — Confirmation + Toast

**Steps:**
1. Navigate to `/dashboard/waitlist` (entries exist from TC-04)
2. Click "Remove" on the Alice row
3. Observe the confirmation dialog
4. Click "OK" to confirm

**Expected:**
- Browser native confirm dialog appears asking for confirmation
- After confirming: Alice's row disappears from the list
- Toast notification: "Removed from waitlist" (success) appears and auto-dismisses
- Page data refreshes (revalidatePath triggered) — Bob's row remains

**Edge case:** Click "Cancel" in the confirm dialog → row does NOT disappear, no toast shown

---

### TC-06: Remove Waitlist Entry — Pending State

**Steps:**
1. Navigate to `/dashboard/waitlist`
2. Click "Remove" and immediately observe the button state during the server action

**Expected:** "Remove" button shows a disabled/loading state while the server action is in flight (useTransition pending). Button re-enables after action completes.

---

### TC-07: Cross-Teacher Deletion Guard

**Steps:**
1. Create a waitlist entry for Teacher B (different teacher_id)
2. Authenticate as Teacher A
3. Attempt to call `removeWaitlistEntry('<teacher_b_entry_id>')` directly (via curl or test)

**Expected:** Server action returns `{ error: ... }` and does NOT delete the row. The `.eq('teacher_id', teacher.id)` guard prevents cross-teacher deletion.

---

### TC-08: Automatic Email Notification on Cancellation — Happy Path

**Preconditions:**
1. Teacher has `capacity_limit = 1`
2. Teacher has 1 confirmed booking (at capacity)
3. Teacher has 1 unnotified waitlist entry (`notified_at = NULL`)

**Steps:**
1. Teacher cancels the confirmed booking (via `/dashboard/sessions`)
2. Wait ~5 seconds for fire-and-forget pipeline to complete
3. Check Resend dashboard (or email inbox if using real email)

**Expected:**
- Booking is cancelled successfully (teacher sees confirmation)
- Email sent to `parent_email` with:
  - Subject: "A spot just opened up — book with [Teacher Name]"
  - CTA button: "Book a Session" linking to `https://tutelo.app/[teacher-slug]`
  - Footer mentions waitlist origin
- Waitlist entry in DB has `notified_at` stamped with current timestamp

---

### TC-09: Notification Not Sent When Still At Capacity

**Preconditions:**
1. Teacher has `capacity_limit = 2`
2. Teacher has 2 confirmed bookings (at capacity)
3. Teacher has 1 unnotified waitlist entry

**Steps:**
1. Teacher cancels 1 booking → teacher now has 1 active booking (capacity: 1/2, NOT at limit)

Wait — this frees capacity, so notification SHOULD fire. Adjust:

1. Teacher has `capacity_limit = 2`
2. Teacher has 2 confirmed bookings
3. Teacher cancels 1 booking → 1/2 active → capacity freed → notification fires ✅

**For "still at capacity" test:** Teacher has `capacity_limit = 2`, cancels 1 of 3 bookings (keeping 2 active = still at capacity):
- Notification should NOT be sent
- Waitlist entry `notified_at` remains NULL

---

### TC-10: Notification Not Sent When No Waitlist Entries

**Preconditions:**
1. Teacher has `capacity_limit = 1`, 1 confirmed booking
2. Waitlist table has 0 rows for this teacher

**Steps:**
1. Cancel the confirmed booking

**Expected:** Cancellation succeeds normally. No emails sent. No errors logged.

---

### TC-11: Partial Failure — Only Successful Sends Stamped

**Preconditions:** 2 unnotified waitlist entries. Simulate Resend failure for the first email (e.g., invalid email address or mocked Resend error).

**Expected:**
- First entry: email fails, `notified_at` remains NULL, per-entry error logged: `[waitlist] Failed to send notification`
- Second entry: email succeeds, `notified_at` stamped
- Cancellation flow is unaffected (fire-and-forget isolates failures)

---

### TC-12: WaitlistNotificationEmail Rendering

**Steps:**
1. Render `WaitlistNotificationEmail` with props `{ teacherName: "Jane Smith", bookingLink: "https://tutelo.app/jane-smith" }`
2. Inspect rendered HTML (React Email preview or test renderer)

**Expected:**
- Preview text present
- CTA button labeled "Book a Session" links to `https://tutelo.app/jane-smith`
- Teacher name "Jane Smith" appears in body
- Footer references waitlist
- Container styles match SessionCompleteEmail (same font, same layout structure)
