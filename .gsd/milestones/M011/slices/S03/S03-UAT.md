# S03: Mobile Navigation Overhaul — UAT

**Milestone:** M011
**Written:** 2026-04-03T16:25:33.559Z

## Preconditions
- App running locally or on staging
- Teacher test account with completed onboarding (email: soosup.cha+test@gmail.com)
- Parent test account (any logged-in parent)
- Browser devtools set to mobile viewport (375px or 390px width) OR tested on a real mobile device
- At least one pending booking request exists in the teacher account (to test Requests badge)

---

## TC-01 — Teacher mobile nav shows exactly 5 labeled tabs

**Steps:**
1. Log in as teacher and navigate to `/dashboard`
2. Open devtools and set viewport to 375px width
3. Look at the bottom navigation bar

**Expected:**
- 5 tabs are visible: Overview, Requests, Sessions, Availability, More
- Each tab shows an icon AND a text label below it (labels must NOT be hidden/sr-only)
- Labels use small text (~10px) and are legible
- The nav bar does not show all 11 dashboard items

---

## TC-02 — Active state indicator on primary tabs

**Steps:**
1. At 375px viewport, navigate to `/dashboard` (Overview)
2. Observe the Overview tab
3. Navigate to `/dashboard/sessions`
4. Observe the Sessions tab

**Expected:**
- Active tab shows a small dot indicator above the icon
- Active tab text is in foreground color (not muted)
- Inactive tabs show muted-foreground text
- Dot and text color update as you navigate between tabs

---

## TC-03 — Pending badge on Requests tab

**Precondition:** A pending booking request exists for the teacher account.

**Steps:**
1. At 375px viewport, navigate to `/dashboard/requests`
2. Observe the Requests tab icon

**Expected:**
- A small green pulsing dot appears on the top-right of the Requests icon
- Dot is absent if there are no pending requests

---

## TC-04 — More tab opens the More panel

**Steps:**
1. At 375px viewport, on any primary-tab page
2. Tap the "More" tab (Ellipsis icon + "More" label)

**Expected:**
- A dark backdrop overlay appears behind the panel
- A bottom sheet slides up from below the nav bar with a spring/ease-out animation (~300ms)
- A drag handle bar is visible at the top of the panel
- 7 items are listed: Students, Waitlist, Page, Promote, Analytics, Messages, Settings
- Each item shows: icon (left), label (bold), description (muted smaller text below label)
- A "Sign Out" button appears below a horizontal divider

---

## TC-05 — More panel item descriptions are correct

**Steps:**
1. Open the More panel
2. Read each item's description

**Expected:**
- Students: "Manage your enrolled students"
- Waitlist: "View parents waiting for availability"
- Page: "Edit your public profile page"
- Promote: "Flyers, QR codes, and share links"
- Analytics: "Traffic and booking stats"
- Messages: "Chat with parents"
- Settings: "Account, rate, and preferences"

---

## TC-06 — More panel navigates and closes

**Steps:**
1. Open the More panel
2. Tap "Analytics"

**Expected:**
- Panel dismisses (slides back down)
- Browser navigates to `/dashboard/analytics`
- More tab shows active indicator dot (because current path is a more-menu item)
- More tab text is in foreground color (not muted)

---

## TC-07 — Backdrop tap dismisses More panel without navigating

**Steps:**
1. Open the More panel
2. Tap the dark backdrop area (outside the panel)

**Expected:**
- Panel slides back down
- No navigation occurs — current page stays the same
- More tab returns to inactive/muted state

---

## TC-08 — More tab active when current path is a more-menu item

**Steps:**
1. Navigate directly to `/dashboard/settings` (e.g., from sidebar or URL bar)
2. At 375px viewport, observe the bottom nav

**Expected:**
- More tab shows active indicator dot
- More tab text is in foreground color
- No primary tab shows as active (none of Overview/Requests/Sessions/Availability match /settings)

---

## TC-09 — Sign Out in More panel uses server action

**Steps:**
1. Open the More panel
2. Tap "Sign Out"

**Expected:**
- User is signed out
- Browser redirects to `/login` or landing page
- Session is destroyed (refreshing does not restore the dashboard)

---

## TC-10 — More panel does not appear on desktop

**Steps:**
1. Set viewport to 768px or wider (or test on desktop browser)
2. Navigate to `/dashboard`

**Expected:**
- The mobile bottom nav bar is NOT visible (hidden via `md:hidden`)
- The desktop sidebar is shown instead
- More panel cannot be triggered

---

## TC-11 — Parent mobile nav shows 5 labeled tabs

**Steps:**
1. Log in as a parent account
2. At 375px viewport, navigate to `/parent`
3. Observe the bottom navigation bar

**Expected:**
- 5 navigation tabs are visible with visible text labels (NOT sr-only)
- A "Sign out" tab with visible label is present
- No More menu (parent nav fits all items in the bar directly)
- Active state indicator dot appears on the current page tab

---

## TC-12 — Parent Sign Out tab uses server action

**Steps:**
1. At 375px viewport as parent, tap "Sign out" in the bottom nav

**Expected:**
- User is signed out
- Browser redirects to `/login` or landing page
- Session is destroyed

---

## Edge Cases

**EC-01 — More panel on very short viewport (iPhone SE / 375×667):** Panel should not overflow the screen; all 7 items + Sign Out should be reachable without scrolling. If the panel is too tall for the viewport, ensure it is scrollable.

**EC-02 — Toggling More tab twice:** Tap More once to open → tap More again to close. Panel should dismiss without navigating.

**EC-03 — Navigating from More panel to a primary-tab destination:** Tap More → tap "Students" → navigate to /dashboard/students → primary tabs should NOT show any active dot (Students is not in primaryNavItems) and More tab should show active dot.
