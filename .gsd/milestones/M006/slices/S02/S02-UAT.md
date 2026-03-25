# S02: Copy-Paste Swipe File — UAT

**Milestone:** M006
**Written:** 2026-03-25T19:14:18.831Z

## Preconditions

- Teacher account exists and is logged in
- Teacher has at least `full_name` and `slug` set (minimum required fields)
- Navigate to `/dashboard/promote`
- Test with two teacher profiles: one with all fields populated (name, subjects, rate, school, city, state, bio, headline, grade levels), one with only required fields (name + slug only)

---

## Test Cases

### TC-01: Swipe file section is visible on promote page

1. Log in as a teacher and navigate to `/dashboard/promote`
2. Scroll past the QR code and mini-flyer sections
**Expected:** A section titled "Announcement Templates" is visible with the subtitle "Pre-written copy — click to copy, then paste into your email or social media."

---

### TC-02: All 4 template cards are rendered

1. On `/dashboard/promote`, inspect the swipe file section
**Expected:** Exactly 4 cards are rendered with titles:
- Email Signature
- Newsletter Blurb
- Social Media Post
- Back-to-School Handout

---

### TC-03: Templates interpolate teacher data (all fields present)

1. Use a teacher with: name="Jane Smith", subjects=["Math", "SAT Prep"], hourly_rate=65, city="Chicago", state="IL", school="Lincoln High"
2. Navigate to `/dashboard/promote` and inspect each card's text content
**Expected:**
- Email Signature card includes "Jane Smith", "Math and SAT Prep", "$65/hr", "Chicago, IL", tutelo.com/[slug] URL
- Newsletter Blurb mentions teacher name, subjects, rate
- Social Media Post includes teacher name, subjects, URL
- Back-to-School Handout includes teacher name, school, subjects, rate
- None of the cards show the literal strings "null" or "undefined"

---

### TC-04: Templates gracefully omit null fields (minimal profile)

1. Use a teacher with only `full_name` and `slug` set; all other fields null/empty
2. Navigate to `/dashboard/promote` and read each card
**Expected:**
- All 4 cards render without errors
- No card shows "null", "undefined", or empty label lines like "Rate: " or "Location: "
- Subject references fall back to "various subjects" or are omitted cleanly
- Rate references are omitted entirely when null

---

### TC-05: Copy button copies correct text

1. On the Email Signature card, click the copy button (clipboard icon)
2. Open a text editor or email client and paste (Ctrl/Cmd+V)
**Expected:** The full interpolated template text is pasted, including line breaks preserved correctly

---

### TC-06: Copy button shows "Copied!" confirmation

1. Click the copy button on any template card
**Expected:** Within 100ms, the button changes to show a checkmark and "Copied!" text
2. Wait 2 seconds without interacting
**Expected:** Button resets to the original copy icon state

---

### TC-07: Copy button works on multiple cards sequentially

1. Click copy on the Email Signature card → wait for reset (2s)
2. Click copy on the Newsletter Blurb card
**Expected:** Each copy is independent; pasting after step 2 yields the Newsletter Blurb content, not the Email Signature content

---

### TC-08: Stagger entrance animation plays on page load

1. Navigate away from `/dashboard/promote` then return
**Expected:** The 4 template cards animate in sequentially (staggered fade/slide), not all at once — consistent with the AnimatedList pattern used elsewhere in the dashboard

---

### TC-09: Page builds with no regressions

**Automated:** `npm run build` exits 0 with all 26 pages generated — no TypeScript errors, no missing module errors related to `SwipeFileSection`, `SwipeFileCard`, or `templates`.

---

### TC-10: Unit test suite passes

**Automated:** `npx vitest run tests/unit/templates.test.ts` exits 0, 59/59 tests pass, covering helper functions, template collection shape, per-template rendering with full and minimal data, and the 4×5 null-leak parametric matrix.
