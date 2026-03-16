---
estimated_steps: 4
estimated_files: 3
---

# T02: Browser-verify mobile nav at 375px and fix layout issues

**Slice:** S03 — Mobile Dashboard & Responsive Polish
**Milestone:** M003

## Description

Start the dev server and verify the mobile dashboard navigation in a real browser at 375px viewport. Check that all 7 tabs are visible and tappable, the active state highlights correctly, the header shows the logo, content is not cut off by the fixed nav, and the desktop sidebar still works at 1280px. Fix any layout, spacing, overflow, or visual issues discovered during verification.

## Steps

1. **Start dev server and navigate to dashboard** — Run `npm run dev`, wait for ready. Navigate to `http://localhost:3000/dashboard` (may redirect to login — log in first if needed). Set viewport to 375×812 (iPhone SE/13 mini dimensions).

2. **Verify mobile layout at 375px** — Check:
   - Bottom nav bar is visible with all 7 tab icons
   - Active tab (Overview) is visually highlighted
   - Mobile header shows Tutelo logo and teacher name
   - Sidebar is NOT visible (hidden at mobile)
   - Page content is scrollable and not cut off behind the bottom nav
   - Stripe warning banner (if visible) doesn't break the layout
   - Click each of the 7 tabs and verify navigation works (URL changes, active state updates)
   - Pending badge visible on Requests tab if there are pending bookings
   - Sign out button is accessible and clickable

3. **Verify desktop layout at 1280px** — Set viewport to 1280×800:
   - Sidebar is visible with all nav items and labels
   - Bottom nav is NOT visible
   - Mobile header is NOT visible
   - Layout is identical to pre-S03 behavior

4. **Fix any issues** — If any layout problems are found (overflow, cut-off content, wrong spacing, animation glitches, touch target too small), fix them in the relevant component files and re-verify. Common fixes:
   - Bottom padding too small → increase `pb-16` to `pb-20`
   - Icons too cramped at 375px → reduce icon size from `h-4 w-4` to `h-5 w-5` (larger is better for touch targets)
   - Header overlapping content → ensure `pt-14 md:pt-0` is on the right element
   - Animation janky → adjust timing or remove if it looks bad

## Must-Haves

- [ ] All 7 tabs visible and tappable at 375px viewport
- [ ] Active tab visually highlighted on each dashboard page
- [ ] Header with Tutelo logo visible at 375px
- [ ] Content not hidden behind bottom nav (scrollable to bottom)
- [ ] Desktop sidebar unchanged at 1280px (no bottom nav, no mobile header)
- [ ] `npm run build` still passes after any fixes

## Verification

- Browser assertions at 375px viewport: bottom nav selector visible, header selector visible, sidebar selector NOT visible
- Browser assertions at 1280px viewport: sidebar selector visible, bottom nav NOT visible, header NOT visible
- Tab navigation works: click a tab, URL contains the expected path, active state updates
- `npm run build` passes

## Observability Impact

- Signals added/changed: None
- How a future agent inspects this: Set browser viewport to 375px and navigate to /dashboard — mobile nav should be immediately visible
- Failure state exposed: None — visual-only verification

## Inputs

- T01 output: `MobileBottomNav.tsx`, `MobileHeader.tsx`, updated `layout.tsx`
- Running dev server at localhost:3000
- Auth credentials for dashboard access (existing Supabase user)

## Expected Output

- Any bug-fix patches to T01's files (if issues found)
- Verified working mobile dashboard navigation at 375px
- Verified unchanged desktop dashboard at 1280px
- Clean `npm run build`
