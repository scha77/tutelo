# S01: QR Code & Mini-Flyer — UAT

**Milestone:** M006
**Written:** 2026-03-25T12:48:29.772Z

## Preconditions

- Logged in as a teacher who has completed onboarding (has slug, full_name, subjects, hourly_rate)
- Use test account: soosup.cha+test@gmail.com / testing123
- App running at https://tutelo.app (or localhost:3000)

---

## Test Cases

### TC-01: Promote appears in dashboard navigation

**Steps:**
1. Log in and navigate to the dashboard
2. Observe the sidebar (desktop) and bottom nav (mobile)

**Expected:** "Promote" link with Megaphone icon appears in both sidebar and mobile bottom nav, positioned before "Settings"

---

### TC-02: /dashboard/promote page loads with QR code

**Steps:**
1. Navigate to `/dashboard/promote`

**Expected:**
- Page loads without error
- "Your QR Code" section is visible
- A QR code is rendered on screen
- The page text shows the teacher's tutelo.app/[slug] URL

---

### TC-03: QR code encodes correct URL

**Steps:**
1. On `/dashboard/promote`, scan the displayed QR code with a phone camera

**Expected:**
- QR scans successfully
- Camera app offers to open `https://tutelo.app/[teacher-slug]` (or the app's configured URL)
- Following the link opens the teacher's public profile page

---

### TC-04: High-res QR PNG download

**Steps:**
1. On `/dashboard/promote`, click "Download QR Code"

**Expected:**
- Browser downloads a PNG file named `tutelo-qr-[slug].png`
- File opens as a 512×512 pixel PNG
- The downloaded PNG scans correctly with a QR reader
- File is a valid PNG (not corrupted or zero-byte)

---

### TC-05: Flyer preview loads on promote page

**Steps:**
1. On `/dashboard/promote`, scroll to the flyer section

**Expected:**
- A loading skeleton appears briefly
- A portrait-format flyer image loads (3:4 aspect ratio)
- The flyer shows: "Tutelo" branding, teacher name, subject pill tags, hourly rate, a QR code, and "Scan to book a session" CTA

---

### TC-06: Flyer PNG download

**Steps:**
1. On `/dashboard/promote`, click "Download Flyer"

**Expected:**
- Browser downloads a PNG file
- File opens as a 1200×1600 pixel portrait image
- All flyer content is visible: name, subjects, rate, QR, CTA, profile URL
- QR code within the flyer scans to the teacher's profile URL

---

### TC-07: Flyer API route direct access

**Steps:**
1. In a browser tab, navigate to `/api/flyer/[teacher-slug]` (replace with actual slug)

**Expected:**
- Browser displays the flyer PNG directly (200 OK, Content-Type: image/png)
- Image shows correct teacher data

---

### TC-08: Flyer API 404 for unknown slug

**Steps:**
1. Navigate to `/api/flyer/definitely-not-a-real-slug-xyz`

**Expected:**
- API returns HTTP 404
- No server error or crash

---

### TC-09: Promote page unauthenticated redirect

**Steps:**
1. Log out
2. Navigate to `/dashboard/promote`

**Expected:**
- Redirected to `/login` (not a 500 or blank page)

---

## Edge Cases

- **Teacher with many subjects:** Flyer should display up to 5 subject pills and truncate gracefully
- **Teacher with long name:** Name should wrap or truncate within the flyer layout without overflow
- **Mobile viewport:** QR code and flyer preview should be responsive; download buttons should be tappable
- **Re-download:** Clicking "Download QR Code" or "Download Flyer" multiple times should each produce a valid file without error
