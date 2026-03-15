---
id: T03
parent: S02
milestone: M003
provides:
  - AnimatedList + AnimatedListItem client components for staggered list animations
  - AnimatedProfile client wrapper for scroll-triggered profile section fades
  - Dashboard card lists (requests, sessions, overview) wrapped with stagger animations
  - StatsBar stat cards with stagger animation on mount
  - Teacher profile sections (hero, credentials, about, reviews) with sequential fade-in
key_files:
  - src/components/dashboard/AnimatedList.tsx
  - src/components/profile/AnimatedProfile.tsx
  - src/components/dashboard/StatsBar.tsx
  - src/app/(dashboard)/dashboard/requests/page.tsx
  - src/app/(dashboard)/dashboard/sessions/page.tsx
  - src/app/(dashboard)/dashboard/page.tsx
  - src/app/[slug]/page.tsx
key_decisions:
  - Use `import * as m from 'motion/react-client'` namespace import pattern (consistent with existing AnimatedSection, PageTransition) — named `{ m }` import does not exist in motion v12
  - AnimatedProfile uses inline initial/whileInView/transition props instead of variants object — cleaner for per-instance delay customization
patterns_established:
  - AnimatedList + AnimatedListItem pattern for wrapping any RSC list with staggered entrance (ul/li semantics)
  - AnimatedProfile thin wrapper pattern with delay prop for sequential section reveals
observability_surfaces:
  - none — animations are purely visual
duration: 15m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T03: Add dashboard card staggers and profile section fades

**Created AnimatedList and AnimatedProfile client wrappers, wired stagger animations on dashboard card lists and StatsBar, and added sequential fade-in reveals on teacher profile sections.**

## What Happened

Created two new thin client components:
- `AnimatedList` / `AnimatedListItem` — wraps children in `m.ul` / `m.li` with `staggerContainer` and `staggerItem` variants from the shared animation constants. Used on dashboard requests, sessions, and overview pages.
- `AnimatedProfile` — wraps a profile section in `m.div` with `whileInView` scroll-triggered fade+slide-up, accepting a `delay` prop for sequential timing.

Updated `StatsBar` (already a client component) to use `m.div` with stagger variants directly on the grid container and individual stat cards.

Wrapped four profile sections in `[slug]/page.tsx` with `AnimatedProfile` at delays 0, 0.1, 0.15, 0.2s. The `accent_color` CSS variable and inline style logic remain completely untouched — AnimatedProfile only adds opacity/transform.

All three dashboard pages (requests, sessions, overview) remain RSCs — the client boundary is only on the AnimatedList/AnimatedProfile wrapper components.

## Verification

- `npm run build` — exits 0, zero errors
- `npx vitest run src/lib/animation` — 21 tests pass
- `head -1 src/app/(dashboard)/dashboard/requests/page.tsx` — `import { redirect }` (no 'use client', stays RSC)
- `head -1 src/app/(dashboard)/dashboard/sessions/page.tsx` — same, stays RSC
- `head -1 src/app/(dashboard)/dashboard/page.tsx` — same, stays RSC
- `grep "accent_color" src/app/[slug]/page.tsx` — both `--accent` CSS variable and `accentColor` prop still present and unmodified

### Slice-level verification (partial — intermediate task):
- ✅ `npm run build` — exits 0
- ✅ `npx vitest run src/lib/animation` — 21 tests pass
- ✅ `grep -r "accent_color" src/app/[slug]/page.tsx` — accent color logic unchanged
- ⏳ Dev server visual verification of dashboard card staggers — deferred to T04 final integration check
- ⏳ Dev server visual verification of profile section fades — deferred to T04 final integration check
- ⏳ Micro-interactions (T04 scope)

## Diagnostics

- Browser DevTools → Elements → dashboard pages: look for `ul` and `li` elements with `style` containing `transform` and `opacity` (motion renders as plain HTML elements with inline styles)
- Browser DevTools → Elements → profile page: look for `div` wrappers around HeroSection/CredentialsBar/AboutSection/ReviewsSection with inline `opacity` and `transform` styles
- If stagger is not visible: check that `staggerContainer` and `staggerItem` variants are correctly wired (initial="hidden" animate="visible")
- If profile sections appear instantly: check that `whileInView` is set (not just `animate`) and `viewport` includes `once: true`
- Build errors from incorrect motion imports surface immediately in `npm run build`

## Deviations

- Task plan said `import { m } from 'motion/react-client'` — this named export doesn't exist in motion v12. Used `import * as m from 'motion/react-client'` namespace import, consistent with all existing motion components in the codebase (AnimatedSection, AnimatedSteps, PageTransition).
- AnimatedProfile uses inline `initial`/`whileInView`/`transition` props rather than the `variants` + named states pattern. This is cleaner for per-instance `delay` customization where each wrapper gets a different delay value. The `fadeSlideUp` constant is still referenced for the transition config.

## Known Issues

None.

## Files Created/Modified

- `src/components/dashboard/AnimatedList.tsx` — new client component: stagger list wrapper (m.ul) + list item (m.li)
- `src/components/profile/AnimatedProfile.tsx` — new client component: scroll-triggered fade+slide wrapper with delay prop
- `src/components/dashboard/StatsBar.tsx` — added motion stagger to stat card grid container and individual cards
- `src/app/(dashboard)/dashboard/requests/page.tsx` — wrapped RequestCard list with AnimatedList/AnimatedListItem
- `src/app/(dashboard)/dashboard/sessions/page.tsx` — wrapped ConfirmedSessionCard list with AnimatedList/AnimatedListItem
- `src/app/(dashboard)/dashboard/page.tsx` — wrapped upcoming sessions preview list with AnimatedList/AnimatedListItem
- `src/app/[slug]/page.tsx` — wrapped HeroSection, CredentialsBar, AboutSection, ReviewsSection with AnimatedProfile at sequential delays
