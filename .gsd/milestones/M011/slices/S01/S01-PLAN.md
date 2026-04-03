# S01: Teacher Profile Page Overhaul

**Goal:** Teacher's public /[slug] page looks premium — polished hero with better banner/avatar treatment, refined credentials bar with accent-colored subject chips, improved about section layout, elevated review cards with SVG stars and reviewer avatars, and cohesive social links footer. Parents get a strong first impression.
**Demo:** After this: After this: teacher's public /[slug] page looks premium — polished hero with better banner/avatar treatment, refined credentials bar, improved about section layout, elevated review cards, and cohesive social links footer. Parents get a strong first impression.

## Tasks
- [x] **T01: Upgraded HeroSection (taller banner, larger avatar, ring-inset depth, refined typography), AboutSection (accent-border heading, text-wrap pretty), and SocialLinks (pill-link styling, Tutelo attribution footer) for a premium first impression** — Upgrade the three simplest profile components in one pass. HeroSection gets a taller banner (h-44/h-64), larger avatar (h-24/h-28 with border-4 + shadow-lg), better overlap (-mt-12/-mt-14), refined name typography (text-2xl/text-3xl font-bold tracking-tight with text-wrap: balance), and a subtle ring-inset on the banner image for depth. AboutSection gets a refined heading treatment (small uppercase label or left accent border) and text-wrap: pretty on bio text. SocialLinks gets pill-link styling (rounded-full px-4 py-2 border hover:bg-muted transition-colors) and a subtle 'Powered by Tutelo' attribution footer. No logic changes, no new props needed, no tests to worry about for these three components.
  - Estimate: 45m
  - Files: src/components/profile/HeroSection.tsx, src/components/profile/AboutSection.tsx, src/app/[slug]/page.tsx
  - Verify: npx tsc --noEmit && npx vitest run --reporter=dot 2>&1 | tail -3
- [x] **T02: Restructured CredentialsBar from flat flex-wrap into a two-row layout with accent-colored subject chips, icon-paired meta items, verified badge pill, and right-aligned rate display with tabular-nums** — Restructure the flat credentials bar into a more intentional layout with accent-colored subject chips. Subject badges get inline styles using color-mix: `style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)' }}` — DO NOT use the Tailwind bg-accent utility (it conflicts with the teacher's accent color override on <main>). Grade level chips get a lighter treatment. Rate display gets font-semibold text-base with tabular-nums. Verified badge keeps emerald + CheckCircle but gets a subtle background pill. Consider a two-section layout: subjects+grades row, then meta items. The component reads accent color from the CSS variable, not a prop — this is the established pattern.
  - Estimate: 30m
  - Files: src/components/profile/CredentialsBar.tsx
  - Verify: npx tsc --noEmit && npx vitest run --reporter=dot 2>&1 | tail -3
- [ ] **T03: Upgrade ReviewsSection with SVG stars, elevated cards, and reviewer avatars — wire accentColor and verify all tests** — The ReviewsSection has the most constraints: 3 unit tests in src/__tests__/dashboard-reviews.test.ts that call ReviewsSection({ reviews }) directly and check JSON.stringify output for '4.7', '" review"', 'Review 0'...'Review 4'. The tests check serialized JSX structure, not rendered HTML.

Changes:
1. Replace unicode ★ with inline SVG stars in renderStars() — use <svg viewBox='0 0 20 20'> with <path> for a star shape, filled yellow-400 or gray-200. The tests don't directly assert on star characters (they check '4.7' and review text), so SVG replacement is safe.
2. Upgrade review cards from 'rounded-lg border p-4' to 'rounded-xl border bg-card shadow-sm p-5' for elevation.
3. Add reviewer initial avatar: small div with rounded-full, accent-colored background showing first letter of reviewer_name (or 'A' for Anonymous). This requires an accentColor prop.
4. Add text-wrap: pretty on review_text.
5. Upgrade aggregate rating header: SVG stars + rating number + count with better typography.
6. Add accentColor prop to ReviewsSection interface.
7. Wire accentColor in page.tsx: pass `accentColor={teacher.accent_color}` to the ReviewsSection component.
8. Run full verification: vitest (474 pass), tsc --noEmit (clean), next build (success).

CRITICAL: Do NOT rename or remove the `firstNameFromEmail` export — it is tested. Do NOT change the component's behavior of returning null for empty reviews or slicing to 5. The avg rating calculation and count display logic must produce identical string values.
  - Estimate: 45m
  - Files: src/components/profile/ReviewsSection.tsx, src/app/[slug]/page.tsx, src/__tests__/dashboard-reviews.test.ts
  - Verify: npx vitest run --reporter=dot 2>&1 | tail -3 && npx tsc --noEmit && npx next build 2>&1 | tail -5
