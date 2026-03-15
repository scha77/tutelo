# S02: Animation System & App-Wide Polish — Research

**Date:** 2026-03-11
**Slice:** M003/S02
**Requirements owned:** ANIM-01, ANIM-02, ANIM-03, ANIM-04, ANIM-05, ANIM-06
**Requirements supported:** BRAND-01

## Summary

S02 wires animations across every surface of the app using the `motion` package (the modern successor to `framer-motion`, same codebase, same version 12.36.0). Both `framer-motion` and `motion` resolve to the same package at 12.36.0, both declare `react: "^18.0.0 || ^19.0.0"` as peer dependencies — React 19 + Next.js 16 are fully supported.

The landing page (ANIM-01) is the highest-value target and the simplest: all 5 section components in `src/components/landing/` are pure RSCs today; wrapping each in a `"use client"` thin wrapper with `motion.div whileInView` scroll reveals is the cleanest pattern. The six S01 landing components — HeroSection, HowItWorksSection, TeacherMockSection, ProblemSolutionSection, CTASection — need no logic changes, just motion wrapping.

Page transitions (ANIM-02) are the trickiest surface. App Router's file-system router doesn't expose a shared layout-wrapper between routes at the top level, and `AnimatePresence` needs to observe child key changes to trigger exit animations. The proven approach for App Router is creating a `template.tsx` file at the relevant layout level — Next.js remounts template on every navigation (unlike `layout.tsx` which persists), giving `AnimatePresence` the key change it needs. A simple fade is sufficient and avoids the complexity of full slide transitions with layout shifts.

Onboarding step transitions (ANIM-03) are already local state — `OnboardingWizard.tsx` renders one of three step components based on `currentStep`. Wrapping the step render area with `AnimatePresence` + `motion.div` slide variants is straightforward since no RSC boundary is crossed.

Dashboard cards/lists (ANIM-04) and micro-interactions (ANIM-06) target the existing `'use client'` components directly: `RequestCard`, `ConfirmedSessionCard`, `StatsBar`. These all already use `'use client'` — motion imports work directly.

Teacher profile section animations (ANIM-05) require converting the pure RSC profile section components (`HeroSection`, `CredentialsBar`, `AboutSection`, `ReviewsSection`) to `'use client'` or wrapping them in thin animated client wrappers. The thin-wrapper pattern is preferred to preserve any future server-side advantages and to minimize the client boundary footprint.

## Recommendation

**Use `motion` (import from `"motion/react"`) not `framer-motion`.** The `motion` package is the canonical name for the modern release; `framer-motion` still works as an alias but the docs, examples, and tooling all point to `motion`. Install: `npm install motion`.

**Animation strategy by surface:**

| Surface | Approach | Motion API |
|---|---|---|
| Landing scroll reveals | `whileInView` on each section | `motion.div whileInView={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 24 }}` |
| Page transitions | `template.tsx` + `AnimatePresence` | `mode="wait"` with fade, `initial={false}` |
| Onboarding step slides | Local `AnimatePresence` around step render | Slide x ±30px + fade |
| Dashboard card stagger | `motion.ul` container + `motion.li` children with `staggerChildren` | variants pattern |
| Profile section fades | Thin `'use client'` wrapper components | `whileInView` + `viewport={{ once: true }}` |
| Micro-interactions | CSS `transition-` classes (already present) + `motion` for press/hover where CSS falls short | `whileTap={{ scale: 0.97 }}`, `whileHover` |

**Animation style constants** (used everywhere, from DECISIONS.md):
- Subtle & smooth, not bouncy or playful
- Fade+slide: `initial={{ opacity: 0, y: 24 }}` → `animate={{ opacity: 1, y: 0 }}`
- Duration: `0.4s` for sections, `0.2s` for micro-interactions
- Easing: `ease: "easeOut"` for enters, `ease: "easeIn"` for exits
- Stagger: `staggerChildren: 0.07` for lists (fast enough to feel snappy)
- Spring for interactive elements (buttons, toggles): `type: "spring", stiffness: 400, damping: 20`
- `viewport={{ once: true }}` on all `whileInView` — animate once, don't re-trigger on scroll back

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Scroll-triggered section reveals | `motion.div whileInView` | Zero boilerplate vs. IntersectionObserver; integrates with SSR hydration |
| Staggered list animations | `staggerChildren` in container variants | Automatic orchestration; no manual delay calculation |
| Exit animations on route change | `AnimatePresence` in `template.tsx` | Next.js `template.tsx` remounts on every nav, giving AnimatePresence the key change it needs |
| Onboarding step transition direction | `custom` prop on variants | Encode slide direction (forward vs back) without separate variant sets |
| CSS-based micro-interactions | `tw-animate-css` already installed | Use CSS `transition-` utilities for hover/focus states; reserve `motion` for press/tap |

## Existing Code and Patterns

- `src/components/landing/HeroSection.tsx` — RSC, no `'use client'`. Add thin animated wrapper or convert to client component. Prefer thin wrapper to preserve RSC tree.
- `src/components/landing/HowItWorksSection.tsx` — RSC. Same approach. Contains a grid of 3 step cards — good stagger candidate with `staggerChildren: 0.1`.
- `src/components/landing/TeacherMockSection.tsx` — Already `'use client'`. Can use motion directly.
- `src/components/landing/ProblemSolutionSection.tsx` — RSC. Before/After grid — both panels slide in from opposite sides.
- `src/components/landing/CTASection.tsx` — RSC. Simple fade-in on viewport entry.
- `src/components/onboarding/OnboardingWizard.tsx` — `'use client'`, manages `currentStep` state. Step content renders via `{currentStep === N && <WizardStepN />}`. Wrap the conditional block with `AnimatePresence` + `motion.div key={currentStep}`.
- `src/components/dashboard/RequestCard.tsx` — `'use client'`. Direct motion usage for mount animation. List container in `requests/page.tsx` (RSC) needs a `'use client'` `RequestList` wrapper to use `motion.ul` + stagger.
- `src/components/dashboard/ConfirmedSessionCard.tsx` — `'use client'`. Same pattern as RequestCard.
- `src/components/dashboard/StatsBar.tsx` — `'use client'`. Three stat cards can stagger in on mount.
- `src/components/profile/HeroSection.tsx` — RSC. Convert to `'use client'` or wrap in thin animated client component. Banner + avatar overlap is visually impactful — a fade+scale-up looks great here.
- `src/components/profile/AboutSection.tsx`, `CredentialsBar.tsx`, `ReviewsSection.tsx` — All RSC. Same thin-wrapper approach.
- `src/app/(dashboard)/dashboard/layout.tsx` — Sidebar + main layout. A `template.tsx` at dashboard level handles dashboard page transitions.
- `src/app/globals.css` — `tw-animate-css` already imported. Micro-interaction hover/focus states already use Tailwind `transition-` utilities throughout — no changes needed for basic hover states.

## Constraints

- **All `motion` imports require `'use client'` components.** RSC components cannot import from `motion/react`. Pattern: either convert the component, or create a thin `'use client'` wrapper that accepts the data as props and renders the motion version.
- **`import * as motion from "motion/react-client"` for Next.js App Router optimization** — reduces client bundle by excluding server-only code. Use this import form for all landing page wrappers.
- **`viewport={{ once: true }}`** — mandatory on all `whileInView` uses. Without `once: true`, animations re-trigger on scroll back, which looks broken.
- **`AnimatePresence` must remain mounted.** Only its children are conditional. This is the #1 footgun — see troubleshooting in docs.
- **Stable `key` prop required for AnimatePresence children.** Use `currentStep` (a number) for onboarding, not array index. Use page segment string for route transitions.
- **Profile page accent color (PAGE-07 preserved)** — animations must not override or interfere with `teacher.accent_color` styling on `[slug]` pages. Motion wrappers add only opacity/transform — no color changes.
- **No SSR issues with `motion`** — server renders static HTML, motion hydrates on client. `whileInView` requires a client boundary, but the static HTML renders correctly before JS loads.
- **Dashboard layout has `Sidebar` in layout.tsx** — `template.tsx` at the dashboard group level will only animate the `children` (the main area), not the sidebar. This is the correct behavior — sidebar persists between pages.

## Common Pitfalls

- **Converting RSC to client just for animation** — prefer thin wrapper components that accept rendered children or data props, keeping RSC at the parent and only adding the client boundary at the animation layer.
- **Forgetting `viewport={{ once: true }}`** — without this, elements that scroll out of view and back in will re-animate, which looks broken.
- **AnimatePresence not triggering exit** — most common cause: AnimatePresence is conditionally rendered instead of its children being conditional. Second most common: child key is not stable (e.g. using array index).
- **Dashboard list animations with RSC pages** — `dashboard/requests/page.tsx` is an RSC that renders `RequestCard` components. To animate the list as a unit, extract a `'use client'` `RequestList` wrapper component that wraps the `motion.ul` + stagger. The RSC page passes data to it.
- **`template.tsx` vs `layout.tsx`** — `layout.tsx` is shared/persisted across routes (sidebar doesn't re-render). `template.tsx` is remounted on every navigation. For page transitions, use `template.tsx` at the appropriate route group level.
- **Onboarding step transitions with `<WizardStep N />`** — conditional `{currentStep === N && <WizardStepN />}` needs the `AnimatePresence` wrapper around the whole block, with a `motion.div key={currentStep}` wrapping all three conditionals as a single child per step.
- **`motion/react-client` vs `motion/react`** — use `motion/react-client` for components in App Router to get the tree-shaken client-only build. Use `motion/react` when server access is also needed (rare in this project).

## Open Risks

- **Page transition flash with App Router** — Next.js 16 may render the new page instantly before `AnimatePresence` exit animation completes if Suspense boundaries resolve too fast. Mitigation: keep transitions fast (200-300ms fade) and test the actual navigation behavior before relying on exit animations.
- **Onboarding wizard step transition direction** — forward vs backward slide direction requires `custom` prop or `variants` with dynamic values. This is achievable but adds a small amount of complexity.
- **Profile page client boundary expansion** — converting all profile section components to client components may increase JS bundle size. Mitigation: use thin wrappers that only add motion — keep the data-fetching RSC structure intact.
- **`motion` bundle size** — `motion` is ~30-50KB gzipped. For a mostly-server-rendered app, this is added to the client bundle. Acceptable given the animation scope, but use `LazyMotion` with `domAnimation` feature set if bundle size becomes a concern post-launch.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Framer Motion / motion | `patricio0312rev/skills@framer-motion-animator` (1.4K installs) | Available — `npx skills add patricio0312rev/skills@framer-motion-animator` |
| Framer Motion best practices | `pproenca/dot-skills@framer-motion-best-practices` (191 installs) | Available — `npx skills add pproenca/dot-skills@framer-motion-best-practices` |

The top skill (`framer-motion-animator` with 1.4K installs) is most relevant. Install before execution if complex orchestration is needed.

## Sources

- `motion` v12.36.0 peer deps declare `react: "^18.0.0 || ^19.0.0"` — confirmed React 19 compatible (source: `npm info motion peerDependencies`)
- `framer-motion` and `motion` resolve to same package at 12.36.0 — confirmed (source: `npm info` output comparison)
- `motion/react-client` optimized import for App Router (source: motion.dev/docs/react-installation via Context7)
- `whileInView` + `viewport={{ once: true }}` scroll pattern (source: motion.dev docs via Context7)
- `staggerChildren` variant orchestration pattern (source: framer/motion Context7)
- `AnimatePresence mode="wait"` for page transitions (source: motion.dev docs via Context7)
- `template.tsx` remount behavior for App Router page transitions (source: Next.js App Router architecture — layout.tsx persists, template.tsx remounts per navigation)
