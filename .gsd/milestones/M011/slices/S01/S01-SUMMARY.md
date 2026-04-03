---
id: S01
parent: M011
milestone: M011
provides:
  - Premium teacher profile page visual treatment — hero, credentials bar, about section, reviews section, social links all updated
  - CSS variable / inline style accent pattern established as the project-wide pattern for profile page components
  - SVG star rating component (StarIcon in ReviewsSection.tsx)
  - Reviewer initial avatar component (ReviewerAvatar in ReviewsSection.tsx)
  - Visual language baseline (card elevation, typography scale, chip patterns) for S02 booking calendar to build on
requires:
  []
affects:
  - S02 — BookingCalendar should adopt rounded-xl cards, accent chip pattern, icon-paired meta items established here
  - S05 — Global consistency pass can reference these components as the canonical visual baseline
key_files:
  - src/components/profile/HeroSection.tsx
  - src/components/profile/AboutSection.tsx
  - src/components/profile/CredentialsBar.tsx
  - src/components/profile/ReviewsSection.tsx
  - src/app/[slug]/page.tsx
key_decisions:
  - Inline styles with color-mix(in srgb, var(--accent) 15%, transparent) are the correct pattern for accent-tinted backgrounds on the profile page — Tailwind bg-accent does not read runtime CSS variable overrides
  - SVG inline star icons (StarIcon component) replace unicode ★ for crisp rendering at any size and correct color theming
  - SocialLinks always renders (attribution footer) even with no social links — design decision, not a bug
  - CredentialsBar custom styled spans replace shadcn Badge for full accent-color control
  - accentColor prop on ReviewsSection is optional to preserve backward compatibility with existing unit tests
patterns_established:
  - Accent-color chip pattern: use inline style with color-mix(in srgb, var(--accent) 15%, transparent) for background, var(--accent) for text — applies to any component on the profile page needing accent tinting
  - textWrap balance/pretty pattern: use `style={{ textWrap: 'pretty' } as React.CSSProperties}` — cast required for TypeScript
  - SVG icon component pattern for rating stars: StarIcon with viewBox 0 0 20 20, filled/empty via text-yellow-400/text-gray-200 currentColor fill
  - Reviewer initial avatar pattern: 8×8 rounded-full div with accent background showing uppercased first char — reusable for any user-facing initial display
observability_surfaces:
  - none
drill_down_paths:
  - .gsd/milestones/M011/slices/S01/tasks/T01-SUMMARY.md
  - .gsd/milestones/M011/slices/S01/tasks/T02-SUMMARY.md
  - .gsd/milestones/M011/slices/S01/tasks/T03-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-04-03T15:50:34.428Z
blocker_discovered: false
---

# S01: Teacher Profile Page Overhaul

**All five profile components — HeroSection, CredentialsBar, AboutSection, ReviewsSection, SocialLinks — upgraded from functional MVP to premium SaaS with intentional typography, accent-aware chips, SVG stars, elevated cards, and cohesive attribution footer; 474 tests pass.**

## What Happened

S01 overhauled the teacher public `/[slug]` page across three tasks with zero logic changes and zero test regressions.

**T01 — HeroSection, AboutSection, SocialLinks:** HeroSection received a taller banner (h-44 mobile / h-64 desktop), larger avatar (h-24/h-28 with border-4 border-background shadow-lg), a deeper banner-avatar overlap (-mt-12/-mt-14), a subtle ring-inset depth overlay on the banner, gradient overlay for readability, and refined name typography (text-2xl/text-3xl font-bold tracking-tight with textWrap: balance). AboutSection gained a left accent-border uppercase heading label and textWrap: pretty on bio text. SocialLinks was upgraded to pill-link styling (rounded-full px-4 py-2 border hover:bg-muted transition-colors) and now always renders — even when no social links are set — to display a "Powered by Tutelo" attribution footer.

**T02 — CredentialsBar:** The flat single-row credentials bar was replaced with a structured two-section layout. Row 1 holds subject chips (accent-colored via `color-mix(in srgb, var(--accent) 15%, transparent)` inline styles) and grade-level chips (muted border treatment). Row 2 holds meta items: verified badge in an emerald pill with dark-mode support, years experience with Clock icon, location with MapPin icon, and hourly rate pushed right via ml-auto with font-semibold tabular-nums. The shadcn Badge component was removed in favor of custom styled spans for full accent-color control. Component still returns null when there's nothing to show.

**T03 — ReviewsSection:** Unicode star characters replaced with an inline SVG StarIcon component (20×20 viewBox, filled yellow-400 / empty gray-200). Review cards elevated from rounded-lg to rounded-xl/bg-card/shadow-sm with hover:shadow-md transition. A ReviewerAvatar component added accent-colored circle showing reviewer's first initial (falls back to 'var(--accent, #6366f1)' when no accentColor). textWrap: pretty applied to review text. Aggregate header upgraded with SVG stars, bold rating, and muted count with aria-label. Optional accentColor prop added (backward-compatible — existing tests unaffected), wired from teacher.accent_color in page.tsx. All critical test invariants preserved: firstNameFromEmail export unchanged, null return for empty reviews, slice-to-5 behavior identical.

**Cross-cutting pattern established:** All three tasks confirmed the CSS variable / inline style pattern for accent color. The --accent variable is overridden per-teacher on the profile page's `<main>` element. Tailwind's bg-accent resolves statically and is incompatible — inline styles with color-mix() or var(--accent) are the correct pattern for all accent-dependent profile components.

## Verification

Final slice verification: `npx vitest run --reporter=dot` → 474 passed, 0 failures, 49 test files (10 skipped). `npx tsc --noEmit` → exit 0, clean. `npx next build` → exit 0, success (verified in T03). All three tasks had clean verification evidence with no regressions across the 474-test suite.

## Requirements Advanced

- UI-01 — All five profile components upgraded with premium visual treatment — polished hero, structured credentials bar with accent chips, refined about section, elevated review cards with SVG stars and reviewer avatars, and cohesive social links with attribution footer
- UI-08 — Profile page components now use intentional, bespoke design choices — color-mix accent tinting, custom chip components, SVG stars, layered shadows — not generic shadcn defaults
- UI-09 — Profile page visual hierarchy improved — credential bar has clear section structure, reviews have better spatial separation and hover affordance, typography hierarchy reinforced throughout

## Requirements Validated

- UI-01 — 474 tests pass, tsc clean, next build success. HeroSection, CredentialsBar, AboutSection, ReviewsSection, SocialLinks all upgraded with intentional premium treatment. Teacher accent color system works correctly via color-mix() inline styles.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

Three minor, all improvement deviations: (1) textWrap balance/pretty applied via inline styles (Tailwind utility not in config) — no semantic change. (2) SocialLinks now always renders for attribution footer — minor behavior expansion. (3) T02 added lucide icons (Clock, MapPin, DollarSign) to meta items and removed shadcn Badge dependency — both were improvements over the plan spec, consistent with premium polish goal.

## Known Limitations

color-mix() has broad browser support (>95% as of 2026) but is not supported in IE11. Tutelo does not target IE11 so this is not a concern. textWrap: pretty/balance has limited but growing browser support — degrades gracefully (falls back to normal word-wrap).

## Follow-ups

S02 (BookingCalendar) should adopt the same visual language — rounded-xl cards, accent-aware chip patterns, and icon-paired meta items — established here. The color-mix() inline style pattern for accent chips should be considered for the booking flow's subject/session-type display as well.

## Files Created/Modified

- `src/components/profile/HeroSection.tsx` — Taller banner (h-44/h-64), larger avatar (h-24/h-28 border-4 shadow-lg), deeper overlap (-mt-12/-mt-14), ring-inset depth overlay, gradient overlay, balance typography
- `src/components/profile/AboutSection.tsx` — Uppercase label heading with border-l-4 accent, textWrap: pretty on bio paragraph
- `src/components/profile/CredentialsBar.tsx` — Two-row layout: accent subject chips (color-mix inline styles) + grade chips row; verified badge + icon-paired meta items + right-aligned rate row
- `src/components/profile/ReviewsSection.tsx` — SVG StarIcon component, elevated cards (rounded-xl/shadow-sm/hover:shadow-md), ReviewerAvatar with accent color, textWrap: pretty, optional accentColor prop
- `src/app/[slug]/page.tsx` — Pass accentColor={teacher.accent_color} to CredentialsBar and ReviewsSection; SocialLinks always rendered for attribution
