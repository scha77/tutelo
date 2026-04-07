# S04: Asset & Bundle Audit — UAT

**Milestone:** M012
**Written:** 2026-04-07T06:43:22.383Z

## UAT: Asset & Bundle Audit

### Preconditions
- Project builds successfully with `npm run build`
- Access to dashboard routes via local dev server or deployed preview

---

### TC-01: MobileBottomNav More Panel Opens with CSS Transition
**Steps:**
1. Open `/dashboard` on a mobile viewport (< 768px)
2. Tap the "More" tab in the bottom navigation bar
3. Observe the More panel appearance

**Expected:**
- Backdrop fades in with opacity transition (~200ms)
- Panel slides up from bottom with translateY transition (~300ms)
- All menu links (Settings, Promote, Students, Waitlist, Sign Out) are visible and tappable

---

### TC-02: MobileBottomNav More Panel Closes with CSS Transition
**Steps:**
1. With the More panel open (from TC-01), tap the backdrop area or the "More" tab again
2. Observe the panel dismissal

**Expected:**
- Panel slides down (translateY back to 100%) with transition — NOT instant disappear
- Backdrop fades out (opacity → 0) with transition
- After transition completes, panel is not interactive (pointer-events-none)

---

### TC-03: Bottom Nav Bar Entrance Animation
**Steps:**
1. Navigate to `/dashboard` on a mobile viewport
2. Observe the bottom navigation bar appearance on page load

**Expected:**
- Nav bar animates in with a fade-slide-up entrance animation
- Four primary tabs (Dashboard, Requests, Sessions, More) visible with labels

---

### TC-04: ParentMobileNav Entrance Animation
**Steps:**
1. Log in as a parent user and navigate to `/parent` on mobile viewport
2. Observe the bottom navigation bar

**Expected:**
- Nav bar renders with entrance animation
- All 5 tabs visible with text labels

---

### TC-05: RequestCard Hover/Press Feedback
**Steps:**
1. Navigate to `/dashboard/requests` with pending booking requests
2. Hover over a RequestCard action button (Accept/Decline)
3. Click and hold the button

**Expected:**
- On hover: button scales to 1.02× with smooth transition
- On active press: button scales to 0.97× with smooth transition
- No AnimatedButton wrapper used (verify via React DevTools — no AnimatedButton component in tree)

---

### TC-06: ConfirmedSessionCard Hover/Press Feedback
**Steps:**
1. Navigate to `/dashboard/sessions` with confirmed sessions
2. Hover and click action buttons on a session card

**Expected:**
- Same scale transitions as TC-05 (hover: 1.02×, active: 0.97×)
- CSS transition-based, not motion-based

---

### TC-07: SwipeFileCard Press Interaction
**Steps:**
1. Navigate to `/dashboard/promote`
2. Interact with a swipe file card's copy button

**Expected:**
- Button has hover:scale and active:scale CSS transitions
- No motion import in component (plain `<button>` element)

---

### TC-08: QRCodeCard Entrance Animation
**Steps:**
1. Navigate to `/dashboard/promote`
2. Observe the QR code card rendering

**Expected:**
- Card enters with animate-list-item CSS animation (fade + slide up)
- Download button has hover/active scale transitions
- QR code renders correctly and download still produces PNG

---

### TC-09: FlyerPreview Entrance Animation
**Steps:**
1. Navigate to `/dashboard/promote`
2. Observe the flyer preview card rendering

**Expected:**
- Card enters with animate-list-item CSS animation
- Download link has hover/active scale transitions
- Flyer download still works (binary Blob URL pattern)

---

### TC-10: SwipeFileSection Stagger Animation
**Steps:**
1. Navigate to `/dashboard/promote`
2. Observe the swipe file cards section

**Expected:**
- Cards stagger in sequence using CSS animate-list/animate-list-item pattern
- Each card appears with slight delay after the previous one
- No motion staggerContainer/staggerItem used

---

### TC-11: PageTransition.tsx Deleted
**Steps:**
1. Check filesystem: `ls src/components/shared/PageTransition.tsx`

**Expected:**
- File does not exist (deleted)
- No imports referencing PageTransition anywhere in codebase

---

### TC-12: AnimatedButton Preserved for Landing Pages
**Steps:**
1. Check filesystem: `ls src/components/shared/AnimatedButton.tsx`
2. Check landing page imports: `grep -r "AnimatedButton" src/components/landing/`

**Expected:**
- AnimatedButton.tsx exists and is unchanged
- Landing page components still import and use it
- motion library still available for landing/profile/onboarding routes

---

### TC-13: Build Output Clean
**Steps:**
1. Run `npm run build`
2. Inspect output

**Expected:**
- Build succeeds with 0 errors
- All dashboard routes (ƒ Dynamic) compile
- All 72+ static pages generated
- No motion-related warnings or errors

---

### TC-14: HeroSection Uses next/image
**Steps:**
1. Inspect `src/components/profile/HeroSection.tsx`

**Expected:**
- Component imports from `next/image`
- Banner and avatar rendered via `<Image>` component (not raw `<img>`)

---

### Edge Cases

### TC-15: More Panel Rapid Toggle
**Steps:**
1. On mobile, rapidly tap "More" tab 5+ times in quick succession

**Expected:**
- Panel transitions correctly without visual glitches
- No stuck states (panel always ends in correct open/closed state)
- CSS transitions handle interruption gracefully (mid-transition re-toggle works)

### TC-16: More Panel Links Navigate Correctly
**Steps:**
1. Open the More panel
2. Tap each link: Settings, Promote, Students, Waitlist
3. Tap Sign Out

**Expected:**
- Each link navigates to the correct page
- Sign out clears the session and redirects to login
- Active indicator shows correctly on the current page's tab
