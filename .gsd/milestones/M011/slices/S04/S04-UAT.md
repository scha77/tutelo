# S04: Dashboard Polish — UAT

**Milestone:** M011
**Written:** 2026-04-03T18:02:09.412Z

## UAT: S04 — Dashboard Polish

### Test 1: Teacher Dashboard — Page Headers
1. Log in as a teacher
2. Visit each of the 11 dashboard pages
3. **Verify:** Every page has a bold heading with a descriptive subtitle below it
4. **Verify:** Typography is consistent (2xl bold tracking-tight heading, sm muted subtitle)

### Test 2: Teacher Dashboard — Card Elevation
1. Visit Overview, Sessions, Students, Waitlist pages
2. **Verify:** List item cards have rounded corners (rounded-xl) and subtle shadow
3. **Verify:** Hovering over cards shows a slightly stronger shadow

### Test 3: Teacher Dashboard — StatsBar Icons
1. Visit Overview page
2. **Verify:** Each stat card has an icon inside a tinted colored pill (light primary background)
3. **Verify:** Star ratings use clean SVG stars (not Unicode text characters)

### Test 4: Teacher Dashboard — Empty States
1. Visit Requests, Waitlist, or Overview with no data
2. **Verify:** Empty states show a centered icon above the "no data" message

### Test 5: Parent Dashboard — Stat Cards
1. Log in as a parent, visit /parent
2. **Verify:** Each stat card (Children, Upcoming Sessions, Past Sessions) has the icon inside a tinted pill container

### Test 6: Parent Dashboard — Children
1. Visit /parent/children with at least one child
2. **Verify:** Each child card shows an avatar circle with the child's initial letter
3. **Verify:** Cards have rounded corners and shadow treatment

### Test 7: Parent Dashboard — Messages
1. Visit /parent/messages with at least one conversation
2. **Verify:** Each conversation row shows an avatar circle with the teacher's initial
3. **Verify:** Hovering shows enhanced shadow effect

### Test 8: Parent Dashboard — Payment
1. Visit /parent/payment with a saved card
2. **Verify:** Credit card icon is inside a tinted primary-colored container (not grey muted)
3. **Verify:** Card display has rounded-xl corners
