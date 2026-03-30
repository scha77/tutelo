# S03: Session Types + Variable Pricing — UAT

**Milestone:** M007
**Written:** 2026-03-30T18:46:26.065Z

## UAT: S03 — Session Types + Variable Pricing

### Preconditions
- Teacher test account logged in at `/dashboard/settings`
- Stripe connected (or deferred flow for non-Stripe path)
- No session types exist for the teacher initially
- Browser dev tools open for network inspection

---

### Test 1: Dashboard shows session type management UI
**Steps:**
1. Navigate to `/dashboard/settings`
2. Scroll to the "Session Types" section (between Capacity Settings and School Email Verification)

**Expected:** `SessionTypeManager` component renders with an empty state and an "Add session type" button. No session types listed.

---

### Test 2: Create a session type
**Steps:**
1. In SessionTypeManager, click "Add session type"
2. Fill in: Label = "SAT Prep", Price = "60", Duration = "90"
3. Click Save

**Expected:**
- New session type row appears: "SAT Prep · $60 · 90 min"
- Row persists on page refresh (stored in `session_types` table)

---

### Test 3: Create a second session type
**Steps:**
1. Add another: Label = "Homework Help", Price = "35", Duration = "60"
2. Click Save

**Expected:** Both types now listed. Teacher has 2 session types.

---

### Test 4: Edit a session type
**Steps:**
1. Click edit on "SAT Prep"
2. Change price to "65"
3. Save

**Expected:** Row updates to show $65. DB row reflects new price.

---

### Test 5: Delete a session type
**Steps:**
1. Click delete on "Homework Help"
2. Confirm deletion if prompted

**Expected:** "Homework Help" row removed. One session type remains.

---

### Test 6: Profile page — session type selector replaces calendar (session types exist)
**Steps:**
1. Open teacher's public profile page (`/[slug]`)
2. Observe the booking section

**Expected:**
- A "Choose a session type" panel appears instead of the calendar grid
- "SAT Prep" card shows label, "$65", and "90 min"
- No calendar is visible yet
- Subject dropdown is NOT visible

---

### Test 7: Select a session type → calendar appears with duration-filtered slots
**Steps:**
1. Click the "SAT Prep" card
2. Observe the calendar

**Expected:**
- Calendar grid appears
- "← Change session type (SAT Prep)" link visible above calendar
- Only time slots where a 90-minute session fits within the teacher's availability windows are shown (slots that would end outside the availability window are absent)

---

### Test 8: Price displayed in form header after slot selection
**Steps:**
1. Click a time slot in the calendar
2. Observe the booking form header

**Expected:** Form header shows something like "Mon, Apr 14 · 3:30 PM · $65 · SAT Prep"

---

### Test 9: Change session type link works
**Steps:**
1. With SAT Prep selected and calendar visible, click "← Change session type (SAT Prep)"

**Expected:** Session type picker panel reappears; calendar grid hidden; no session type selected.

---

### Test 10: Stripe PaymentIntent uses flat session-type price
**Steps:**
1. Select "SAT Prep" ($65), pick a slot, fill booking form, click "Book session"
2. In Network tab, inspect the POST to `/api/direct-booking/create-intent`

**Expected:**
- Request body includes `sessionTypeId` matching the SAT Prep session type ID
- Response `amount` in Stripe PI = 6500 (cents = $65.00)
- NOT computed from hourly_rate × duration

---

### Test 11: Session type ID in PaymentIntent metadata
**Steps:**
1. After booking completes, check Stripe test dashboard for the created PaymentIntent

**Expected:** PI metadata includes `session_type_id` = the SAT Prep session type UUID

---

### Test 12: Wrong-teacher session type rejected (security check)
**Steps:**
1. Using API client, POST to `/api/direct-booking/create-intent` with a valid `teacherId` but a `sessionTypeId` belonging to a different teacher

**Expected:** HTTP 400 response with error message indicating invalid session type

---

### Test 13: Backward compatibility — teacher with no session types
**Steps:**
1. Create a second teacher account with no session types
2. Open their public profile page

**Expected:**
- No session type picker panel; calendar grid shows immediately
- Subject dropdown IS visible (when multiple subjects exist)
- Booking proceeds with hourly_rate proration as before

---

### Test 14: Backward compatibility — create-intent fallback path
**Steps:**
1. POST to `/api/direct-booking/create-intent` with no `sessionTypeId` (or sessionTypeId: null)
2. Verify with a 30-min slot at a $60/hr teacher

**Expected:** PI amount = 3000 cents ($30 = $60/hr × 0.5 hr proration); not $60 flat

---

### Test 15: Deferred path (non-Stripe teacher) includes session_type_id
**Steps:**
1. Use a teacher with no Stripe connection
2. Book using a session type (deferred booking flow)

**Expected:** The `submitAction` data object includes `session_type_id` matching the selected session type ID

---

### Test 16: handleBookAnother resets session type selection
**Steps:**
1. Complete a booking with SAT Prep session type
2. On confirmation screen, click "Book another session"

**Expected:** Session type picker panel reappears (no session type pre-selected); calendar grid not visible

---

### Edge Cases

**EC-1: Session type with no duration set**
- Steps: Create session type "General Help" with price $40 and no duration
- Expected: Card shows "$40" with no duration text; calendar shows all available slots (default 30-min duration filter)

**EC-2: Session type price with cents (e.g. $35.50)**
- Steps: Create session type with price = "35.50"
- Expected: PI amount = 3550 cents; no floating-point rounding error

**EC-3: Only one session type defined**
- Steps: Leave only one session type in settings
- Expected: Profile still shows the picker panel (even with one option) before showing calendar; teacher cannot skip the selection

**EC-4: Teacher ownership server action security**
- Steps: Attempt to call updateSessionType or deleteSessionType with an ID belonging to a different teacher (requires API manipulation)
- Expected: Action returns error; no DB mutation occurs
