# S01: Teacher Profile Page Overhaul — UAT

**Milestone:** M011
**Written:** 2026-04-03T15:50:34.429Z

## UAT: Teacher Profile Page Overhaul (M011/S01)

### Preconditions
- A teacher account exists with: full name, photo, banner image, accent color set, subjects/grades filled, years experience set, city/state set, verified status, hourly rate set, and at least 3 reviews.
- A second teacher exists with **no** social links, no banner image, no photo, and no reviews (edge-case profile).
- Test at both mobile (375px) and desktop (1280px) viewport widths.

---

### TC-01: Hero Banner Height and Avatar Overlap

**Given:** Navigate to `/[slug]` for a teacher with a banner image.

**Steps:**
1. Load the teacher profile page.
2. Observe the banner image height.
3. Observe the avatar position relative to the banner bottom.

**Expected:**
- Mobile: banner is approximately 176px tall (h-44).
- Desktop: banner is approximately 256px tall (h-64).
- Avatar overlaps the banner by ~48px (mobile) / ~56px (desktop) — noticeably below the banner edge.
- Avatar has a visible white/background-colored border ring and a drop shadow.
- Avatar initials show correctly if no photo is set (teacher 2).

---

### TC-02: Hero Banner Depth Effects

**Given:** Teacher profile page with banner image.

**Steps:**
1. Inspect the banner area visually.

**Expected:**
- A subtle gradient overlay darkens the bottom edge of the banner (improves text readability on light banners).
- A faint inset ring outlines the banner for depth.
- No visual clipping or white edge artifacts.

---

### TC-03: Hero Typography and Name Layout

**Given:** Teacher profile page.

**Steps:**
1. Read the teacher's name and headline below the avatar.

**Expected:**
- Name renders in bold with tight letter-spacing (tracking-tight).
- Mobile: ~24px font size; Desktop: ~30px font size.
- Long names wrap cleanly without truncation (textWrap: balance).
- Headline text renders below the name in muted color.

---

### TC-04: CredentialsBar — Subject Chips Accent Color

**Given:** Teacher has subjects set and a non-default accent color (e.g., purple or teal).

**Steps:**
1. Observe the subject chips in the credentials bar.

**Expected:**
- Subject chips have a tinted background matching the teacher's accent color (15% opacity, not the default app accent).
- Subject chip text is the teacher's accent color (not black/gray).
- A different teacher with a different accent color shows chips in their color.
- Grade-level chips are styled differently — lighter, muted border, no accent tint.

---

### TC-05: CredentialsBar — Two-Row Layout

**Given:** Teacher has subjects, grade levels, years experience, location, verified status, and hourly rate.

**Steps:**
1. Observe the credentials bar.

**Expected:**
- Row 1: subject chips + grade chips in a flex-wrap row.
- Row 2: verified badge (emerald background, CheckCircle icon), years experience (Clock icon), location (MapPin icon), hourly rate (DollarSign icon, pushed to the right).
- Rate displays in tabular-nums (monospace digit width) — e.g., "$65/hr".
- Verified badge shows as a green pill (not just a plain checkmark).

---

### TC-06: CredentialsBar — Empty State

**Given:** Teacher 2 (no subjects, no grades, no experience, no location, no rate, not verified).

**Steps:**
1. Load teacher 2's profile page.

**Expected:**
- CredentialsBar does not render at all (returns null).
- No empty container or whitespace artifact.

---

### TC-07: AboutSection Heading Treatment

**Given:** Any teacher profile page.

**Steps:**
1. Observe the "About" section heading.

**Expected:**
- Heading reads "ABOUT" in small uppercase with wide letter-spacing.
- A visible left border (4px, accent-colored) precedes the heading.
- Bio text wraps in a readable, justified-friendly style (textWrap: pretty).

---

### TC-08: ReviewsSection — SVG Stars

**Given:** Teacher with reviews (mix of 4-star and 5-star).

**Steps:**
1. Inspect the star icons in the aggregate header and individual review cards.

**Expected:**
- Stars are SVG elements (not text characters ★ or ☆).
- Filled stars are yellow (text-yellow-400).
- Empty stars are light gray (text-gray-200).
- Aggregate header shows correct average (e.g., "4.7") with star count.

---

### TC-09: ReviewsSection — Elevated Review Cards

**Given:** Teacher with reviews.

**Steps:**
1. Observe each review card.
2. Hover over a review card.

**Expected:**
- Cards have rounded-xl corners (more rounded than before).
- Cards have a subtle shadow at rest.
- On hover, shadow deepens slightly (hover:shadow-md).
- Cards have visible separation from each other.

---

### TC-10: ReviewsSection — Reviewer Avatar

**Given:** Teacher with reviews from reviewers with known names.

**Steps:**
1. Observe the reviewer area on each review card.

**Expected:**
- Each review shows a small circular avatar with the reviewer's first initial.
- Avatar background color matches the teacher's accent color.
- Anonymous reviews show "A" initial.
- Reviewer name appears next to the avatar.

---

### TC-11: ReviewsSection — Teacher with No Reviews

**Given:** Teacher 2 (no reviews).

**Steps:**
1. Load teacher 2's profile page.

**Expected:**
- ReviewsSection does not render (returns null).
- No empty "Reviews" section header or whitespace artifact.

---

### TC-12: SocialLinks — Pill-Link Styling

**Given:** Teacher with Instagram, email, and website set.

**Steps:**
1. Scroll to the bottom of the profile page.
2. Observe the social links.
3. Hover over a social link.

**Expected:**
- Each social link renders as a pill (rounded-full, with border and padding).
- On hover: background changes to a muted tint, smooth transition.
- Links are correctly labeled (e.g., "Instagram", teacher's email address, website URL or domain).

---

### TC-13: SocialLinks — Attribution Footer Always Present

**Given:** Teacher 2 (no social links set).

**Steps:**
1. Load teacher 2's profile page and scroll to the bottom.

**Expected:**
- "Powered by Tutelo" (or similar attribution text) appears at the bottom even though no social links exist.
- The SocialLinks area does not disappear entirely.

---

### TC-14: Accent Color Consistency Across All Components

**Given:** Teacher with accent color set to a distinct, non-default color.

**Steps:**
1. Load the profile page.
2. Observe accent color expression in: subject chips (CredentialsBar), reviewer avatars (ReviewsSection), any other accent-colored elements.

**Expected:**
- All accent-colored elements use the same hue — the teacher's specific accent color.
- Components do NOT show the default app accent color (#3b4d3e green) if the teacher has a different color set.

---

### TC-15: Full Test Suite Integrity

**Steps:**
1. Run `npx vitest run --reporter=dot` in the project root.

**Expected:**
- 474 tests pass, 0 failures.
- Exit code 0.

---

### TC-16: TypeScript Type Check

**Steps:**
1. Run `npx tsc --noEmit` in the project root.

**Expected:**
- No type errors.
- Exit code 0.

