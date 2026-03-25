---
id: S02
parent: M006
milestone: M006
provides:
  - src/lib/templates.ts — Template definitions and interpolation logic with TeacherTemplateData type (S03 can import if needed)
  - src/components/dashboard/SwipeFileCard.tsx — Template card with copy-to-clipboard (reusable for any text copying need)
  - Copy-to-clipboard pattern with 2s Copied! micro-interaction using navigator.clipboard + execCommand fallback
  - Server page + client section split pattern for stagger animation in server component pages
requires:
  - slice: S01
    provides: src/app/(dashboard)/dashboard/promote/page.tsx — promote page shell that S02 extended with SwipeFileSection
affects:
  - S03
key_files:
  - src/lib/templates.ts
  - tests/unit/templates.test.ts
  - src/components/dashboard/SwipeFileCard.tsx
  - src/app/(dashboard)/dashboard/promote/SwipeFileSection.tsx
  - src/app/(dashboard)/dashboard/promote/page.tsx
key_decisions:
  - Separated SwipeFileSection into a dedicated 'use client' component to keep promote/page.tsx as a pure server component while enabling stagger animations — server components cannot import motion client variants
  - Used textarea (not input) for clipboard execCommand fallback since template content is multi-line
  - 5 test fixtures (full, minimal, empty-arrays, single-subject, two-subjects) × 4 templates = 20-test parametric null-leak matrix to guarantee no template ever outputs raw 'null' or 'undefined' strings
  - Google SSO and school email verification kept decoupled by design — auth provider email ≠ verified school email (decision D003)
patterns_established:
  - Server page + client section split for stagger animation: keep the async page as a server component, extract animated lists into a sibling 'use client' component that receives serializable props
  - Cross-cutting null-leak parametric tests: for any data-interpolation module, test all templates × all fixture combinations asserting absence of 'null'/'undefined' strings — catches entire classes of formatting bugs in one sweep
  - Template rendering pattern: pure functions in src/lib/templates.ts, no React deps, allowing unit testing without component mounting
observability_surfaces:
  - none
drill_down_paths:
  - .gsd/milestones/M006/slices/S02/tasks/T01-SUMMARY.md
  - .gsd/milestones/M006/slices/S02/tasks/T02-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-03-25T19:14:18.830Z
blocker_discovered: false
---

# S02: Copy-Paste Swipe File

**Four interpolated announcement templates with one-click copy live on the promote page, backed by 59 unit tests and a clean build.**

## What Happened

S02 delivered the "swipe file" section of the promote page in two focused tasks. T01 found that `src/lib/templates.ts` was already implemented with 4 templates (Email Signature, Newsletter Blurb, Social Media Post, Back-to-School Handout), `TeacherTemplateData` type, and helper functions for formatting subjects, rates, location, and grade levels. The task focused entirely on comprehensive test coverage — 59 Vitest tests organized into helper-function tests, template collection tests, per-template rendering tests, and a cross-cutting null-leak parametric suite (4 templates × 5 fixtures = 20 tests) that asserts no rendered output ever contains "null", "undefined", or empty label lines. Five fixtures cover the full data spectrum: all fields present, all optionals null, empty arrays, single subject, and two subjects.\n\nT02 built the UI layer in three files. `SwipeFileCard.tsx` renders a single template card with navigator.clipboard copy + execCommand textarea fallback (textarea required because template content is multi-line), "Copied!" state with 2-second reset, and `microPress` animation on the copy button. `SwipeFileSection.tsx` is a `'use client'` wrapper that handles stagger animation using `staggerContainer`/`staggerItem` from `@/lib/animation` — this separation was necessary because the promote page is a server component (async Supabase auth) but stagger animations require motion client imports. The server-side `promote/page.tsx` had its `.select()` query expanded to include `school, bio, headline, grade_levels, city, state`, builds a `TeacherTemplateData` object with null coalescing, and renders `SwipeFileSection` below the existing QR code and flyer sections.\n\nAll slice verification passed: 59/59 unit tests, zero TypeScript errors, and a clean `npm run build` producing all 26 pages.

## Verification

1. `npx vitest run tests/unit/templates.test.ts` — 59/59 tests pass (exit 0, 11ms test duration)\n2. `npx tsc --noEmit` — zero type errors (exit 0)\n3. `npm run build` — compiled successfully, 26 static/dynamic pages generated (exit 0)

## Requirements Advanced

- SWIPE-01 — 4 templates implemented, interpolating teacher name/subjects/rate/location/URL; promote page renders all 4 cards
- SWIPE-02 — SwipeFileCard copy button implemented with navigator.clipboard + fallback, Copied! state resets after 2s

## Requirements Validated

- SWIPE-01 — 59 unit tests pass covering all interpolation edge cases including null fields, empty arrays, and all-fields-present; npm run build passes
- SWIPE-02 — SwipeFileCard implements clipboard copy with 2s Copied! feedback; microPress animation applied; build passes; pattern mirrors existing CopyLinkButton

## New Requirements Surfaced

- AUTH-03 — Teacher or parent can sign in with Google SSO (unmapped, future milestone)
- AUTH-04 — Teacher can verify school affiliation via .edu email OTP after Google login (unmapped, future milestone)

## Requirements Invalidated or Re-scoped

None.

## Deviations

- `SwipeFileSection.tsx` was created as a separate client component instead of inlining stagger logic into the server component page. Plan implied a single file boundary; the separation was necessary for server/client component constraints.\n- Expanded select fields are `school, bio, headline, grade_levels, city, state` rather than plan's `social_email, social_website, social_instagram` — used the actual fields that `TeacherTemplateData` needs.\n- Used `templates` export name (not `TEMPLATES`) matching the actual implementation in `src/lib/templates.ts`.

## Known Limitations

None. All 4 templates render correctly across all null/empty edge cases as proven by the test suite.

## Follow-ups

AUTH-03 and AUTH-04 added to requirements backlog: Google SSO login and school email verification post-Google-login. These are unmapped pending future milestone planning.

## Files Created/Modified

- `src/lib/templates.ts` — 4 announcement templates with TeacherTemplateData type, Template type, and helper functions for formatting subjects/rate/location/grade levels with null safety
- `tests/unit/templates.test.ts` — 59 Vitest unit tests covering helper functions, template collection shape, per-template rendering, and cross-cutting null/undefined leak detection across 5 fixtures
- `src/components/dashboard/SwipeFileCard.tsx` — Client component rendering a single template card with copy-to-clipboard (navigator.clipboard + execCommand fallback), Copied! state, and microPress animation
- `src/app/(dashboard)/dashboard/promote/SwipeFileSection.tsx` — Client component handling stagger animation (staggerContainer/staggerItem) and mapping templates to SwipeFileCard — needed as a separate client boundary from the server page
- `src/app/(dashboard)/dashboard/promote/page.tsx` — Expanded Supabase .select() to include school, bio, headline, grade_levels, city, state; builds TeacherTemplateData and renders SwipeFileSection below QR/flyer sections
