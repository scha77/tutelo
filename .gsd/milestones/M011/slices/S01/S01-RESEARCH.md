# S01 Research: Teacher Profile Page Overhaul

**Gathered:** 2026-04-03
**Depth:** Targeted — known technology, well-understood patterns, code fully explored

---

## Requirements Targeted

- **UI-01** — Teacher profile page visual overhaul (primary owner)
- **UI-08** — Never looks like a generic template (constraint, all slices)
- **UI-09** — Never feels clunky or confusing (constraint, all slices)
- **PAGE-07** — Teacher's accent color still personalizes the page (validated, must preserve)

---

## Summary

The profile page at `/[slug]` is a **Next.js RSC page** that composes 6 profile components:
`HeroSection`, `CredentialsBar`, `AboutSection`, `BookingCalendar`, `ReviewsSection`, and a local `SocialLinks` function. Each is wrapped in `AnimatedProfile` (fade-slide-up on scroll). The `BookNowCTA` adds a sticky mobile "Book Now" bar.

The existing design is **functional MVP**: default shadcn Badge/border/padding treatments, low-information visual hierarchy, flat credential bar, plain review cards with unicode `★` characters, and a hero that's `h-40` banner + `h-20` avatar — smaller than what premium profiles show.

**All visual changes in this slice are purely CSS/JSX — no logic changes, no new API routes, no DB changes.** The booking calendar and its logic are S02 scope; this slice does not touch `BookingCalendar.tsx`.

---

## Implementation Landscape

### File inventory for S01

| File | Current state | S01 change |
|------|---------------|------------|
| `src/components/profile/HeroSection.tsx` | h-40 banner, h-20 avatar, plain name/headline | Upgrade: taller banner, larger avatar, better name/location layout, optional school display |
| `src/components/profile/CredentialsBar.tsx` | Flat flex row with secondary/outline badges + dots | Upgrade: richer layout, accent-colored subject chips, visual separation |
| `src/components/profile/AboutSection.tsx` | h2 + plain `<p>` in muted-foreground | Upgrade: better section heading treatment, potentially pull in school/years more prominently |
| `src/components/profile/ReviewsSection.tsx` | Unicode `★`, plain `rounded-lg border p-4` cards | Upgrade: proper SVG stars, card elevation, reviewer avatar initials, better layout |
| `src/app/[slug]/page.tsx` — `SocialLinks` function | Center-aligned, flat muted text links | Upgrade: better link pill treatment with hover states |
| `src/app/[slug]/page.tsx` — page layout/composition | No max-width consistency, bare `<main>` | Optional: add a subtle Tutelo attribution footer (powered by badge) |

### Files NOT touched by S01

- `BookingCalendar.tsx` — S02 scope only
- `BookNowCTA.tsx` — already works well, no change needed
- `AnimatedProfile.tsx` — animation wrapper is fine as-is
- `AvailabilityGrid.tsx` — not currently used on profile page (calendar is used instead)
- `AtCapacitySection.tsx`, `WaitlistForm.tsx` — functional, not priority for S01
- `page.tsx` data fetching logic — no changes needed

---

## Component-Level Design Targets

### HeroSection
**Current problems:**
- `h-40 md:h-56` banner is short; LinkedIn/Cal.com use ~180-240px
- Avatar is `h-20 w-20` — modest for a conversion page
- `-mt-10` overlap is tight; feels compressed
- Name is `text-2xl` with no location/school in hero
- Social links are in a separate section at the bottom — first-fold data is sparse

**Target design:**
- Banner: `h-44 md:h-64` (taller, more presence)
- Avatar: `h-24 w-24 md:h-28 md:w-28`, `border-4 border-background shadow-lg`
- `-mt-12 md:-mt-14` overlap
- Below avatar: name `text-2xl md:text-3xl font-bold tracking-tight`, then headline in muted, then school + location inline with icon on same row
- Add `text-wrap: balance` to name and headline
- Apply `-webkit-font-smoothing: antialiased` (already set on body via root layout, confirmed in `globals.css` `@layer base`)

### CredentialsBar
**Current problems:**
- All items in one long flex-wrap row — no visual grouping
- Generic `secondary` and `outline` badge variants — no accent color
- Separator dots are just unicode `·` characters
- Rate buried at end without prominence

**Target design:**
- Use accent color for subject chips: `style={{ backgroundColor: \`${accentColor}15\`, color: accentColor }}`
- Grade level chips: slightly different treatment (lighter, smaller)
- Verified badge: keep emerald + CheckCircle, potentially add subtle background pill
- Rate: make it more prominent — `font-semibold text-base` or separate stat treatment
- Consider two-row layout: subjects+grades row, then meta row (location, experience, rate)

### AboutSection
**Current problems:**
- Section heading is plain `text-xl font-semibold` — no visual distinction
- Bio text is `text-muted-foreground leading-relaxed` — correct but nothing elevating it
- School field is in the bio data but not surfaced separately

**Target design:**
- Section heading: small uppercase label treatment (`text-xs font-semibold tracking-wider uppercase text-muted-foreground/60`) above the bio, consistent with TeacherMockSection pattern
- Or: keep h2 but add a subtle left accent border (`border-l-4 pl-4 border-accent`)
- `text-wrap: pretty` on bio text to prevent orphans

### ReviewsSection
**Current problems:**
- Unicode `★` characters for stars — unprofessional
- Review cards: `rounded-lg border p-4` — default shadcn pattern
- No reviewer avatar or initial indicator
- Aggregate rating header is plain `text-xl font-semibold {avg} ★`

**Target design:**
- Replace unicode stars with `<svg>` filled/empty stars using `fill` attribute
  - **Important:** `firstNameFromEmail` and the component are tested; the star rendering helper `renderStars` is NOT directly tested (tests check JSX structure via stringify). SVG stars will work as a drop-in replacement.
- Review cards: more elevated — `rounded-xl border bg-card shadow-sm` or subtle shadow
- Add reviewer initial avatar: small `div` with `rounded-full` and accent-colored background (first letter of reviewer_name)
- Better aggregate section: star SVGs + rating number + count, possibly with a visual bar showing distribution (optional)
- `text-wrap: pretty` on review text

### SocialLinks (in page.tsx)
**Current problems:**
- Plain flat links centered — nothing drawing attention
- No visual container

**Target design:**
- Subtle pill-link treatment: `rounded-full px-4 py-2 border border-muted hover:bg-muted transition-colors` or similar
- Add a tiny branded footer: "Powered by Tutelo" in muted text at page bottom (builds brand awareness as shared links are a key growth vector)

---

## Key Design Patterns to Apply

From the `make-interfaces-feel-better` skill:
1. **Concentric border radius** — ensure avatar border radius, card inner radii, and badge radii are consistent
2. **Shadows over borders** — review cards should use `shadow-sm` layered with reduced border opacity
3. **Scale on press** — `BookNowCTA` button already has `microPress` (`scale(0.97)`); social links and review hover states should be smooth
4. **Text wrapping** — `text-wrap: balance` on name/headline (h1/h2), `text-wrap: pretty` on bio/review text
5. **Tabular numbers** — apply `font-variant-numeric: tabular-nums` to the rate display and review aggregate
6. **Stagger split animations** — already done via `AnimatedProfile` wrappers; no changes needed
7. **Image outlines** — add subtle `1px ring-inset` to avatar and banner images for depth

From the `frontend-design` skill:
- Use **accent color system** already in place via `--accent` CSS variable on `<main>` — all tinted elements should use `color-mix(in srgb, var(--accent) X%, transparent)` pattern (already used in AvailabilityGrid, can be adopted in CredentialsBar)
- The **TeacherMockSection** in the landing page is the best internal design reference — it already shows the premium pattern for credentials pills, section headers, and layout

---

## Constraints and Risk Notes

### Test constraints
- `ReviewsSection` has direct unit tests in `src/__tests__/dashboard-reviews.test.ts` (lines ~290–340) that:
  - Call `ReviewsSection({ reviews: [] })` and expect `null`
  - Call `ReviewsSection({ reviews })` and check JSON.stringify for `"4.7"`, `'" review"'` strings
  - Check that only 5 reviews are rendered (items 0-4 present, 5-6 absent)
  - These tests check **serialized JSX structure**, not rendered HTML — SVG star nodes are safe as long as the outer structure (section → header → list) is preserved
- `firstNameFromEmail` is exported from `ReviewsSection.tsx` and tested — **must not be removed or renamed**
- No tests for `HeroSection`, `CredentialsBar`, `AboutSection`, or `SocialLinks`

### Accent color preservation
- The `--accent` CSS variable is set on `<main>` in `page.tsx`: `style={{ '--accent': teacher.accent_color } as React.CSSProperties}`
- This is the correct pattern (D042 scope decision). All components that use accent color read from `var(--accent)` or receive `accentColor` prop
- `CredentialsBar` currently does NOT use accent color for subject badges — this is the upgrade
- `ReviewsSection` does not receive `accentColor` prop currently — it would need to be added if reviewer avatars use accent color. **Option A:** add accentColor prop. **Option B:** use a fixed brand color for reviewer avatars. Option A is cleaner and more personalized.

### No accent color conflict with Tailwind
- `globals.css` has `--accent: oklch(0.97 0 0)` (near-white) as the default Tailwind accent token
- The teacher accent color overrides this on `<main>` with inline `--accent: #hexcolor`
- This means `bg-accent` (Tailwind utility) within the profile page will render as the teacher's color — **verify this is intentional or avoid `bg-accent` Tailwind utility in profile components**; instead use `style={{ backgroundColor: \`color-mix(in srgb, var(--accent) 15%, transparent)\` }}`

### Photo/banner edge cases
- Banner: if `banner_url` is null, shows `backgroundColor: teacher.accent_color` — solid color. This is correct behavior.
- Avatar: if `photo_url` is null, shows initials with `backgroundColor: teacher.accent_color` — correct.
- Both should continue working after resize.

### BookNowCTA
- Already has a sticky mobile bar with safe-area-inset handling and desktop inline CTA
- Already uses `var(--accent)` correctly
- The bottom spacer `calc(4rem + env(safe-area-inset-bottom))` should be verified to still account for the taller hero

---

## Implementation Order

1. **Task 1: HeroSection upgrade** — most visible, highest impact, no tests to worry about
2. **Task 2: CredentialsBar upgrade** — add accent color chips, restructure layout
3. **Task 3: ReviewsSection upgrade** — SVG stars, card elevation, reviewer avatars (add accentColor prop)
4. **Task 4: AboutSection + SocialLinks upgrade** — section heading treatment, link pill styling, optional Tutelo attribution
5. **Task 5: Wire and verify** — update `page.tsx` to pass `accentColor` to ReviewsSection, run tests, visual check

---

## Verification

- `npx vitest run` — must stay at 474 passing
- `npx tsc --noEmit` — must stay clean
- `next build` — must succeed
- Visual: profile page must feel premium, not templated; banner/avatar hero has strong presence; credentials clearly readable; reviews polished; social links inviting

---

## Skills Discovered

- **`make-interfaces-feel-better`** — installed, applied above (border radius, shadows, text-wrap, tabular-nums, scale on press, stagger enter)
- **`frontend-design`** — installed, applied above (accent color system, TeacherMockSection reference pattern)
- **`react-best-practices`** — installed; confirm RSC vs client boundary (HeroSection/CredentialsBar/AboutSection are pure RSC, ReviewsSection is RSC, no client state needed — keep this boundary)
