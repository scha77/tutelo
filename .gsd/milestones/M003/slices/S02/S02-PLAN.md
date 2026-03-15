# S02: Animation System & App-Wide Polish

**Goal:** Every major surface of the Tutelo app has smooth, subtle animations — landing page scroll reveals, page transitions, onboarding step slides, dashboard card staggers, profile section fades, and micro-interactions on interactive elements.
**Demo:** Navigate through the app: landing page sections fade in on scroll, dashboard pages transition smoothly, onboarding steps slide, dashboard cards stagger in, teacher profile sections reveal on load, and buttons/toggles have press feedback.

## Must-Haves

- `motion` package installed and working with React 19 + Next.js 16
- Landing page: all 5 section components animate in on scroll (whileInView)
- Page transitions: smooth fade between dashboard routes and between major app sections
- Onboarding: step-to-step slide/fade transitions with directional awareness
- Dashboard: request cards and session cards stagger in, stats bar animates on mount
- Teacher profile: hero, credentials, about, and reviews sections fade in on page load
- Micro-interactions: button press scale, form focus transitions using motion where CSS is insufficient
- `npm run build` passes with zero errors
- Existing teacher accent color on profile pages (PAGE-07) is NOT broken

## Proof Level

- This slice proves: integration
- Real runtime required: yes (must verify animations render in browser)
- Human/UAT required: yes (animation quality is subjective — visual check needed)

## Verification

- `npm run build` — exits with code 0, no TypeScript errors
- `npm test -- src/lib/animation` — animation constants and utility tests pass
- Dev server: landing page at `/` — all 5 sections animate in on scroll (whileInView triggers)
- Dev server: navigate between dashboard pages — fade transition visible (no jarring flash)
- Dev server: onboarding wizard — steps slide left/right with fade
- Dev server: dashboard requests page — cards stagger in on mount
- Dev server: teacher profile `/[slug]` — sections fade in sequentially
- Dev server: buttons across app — press feedback (scale) visible on click/tap
- `grep -r "accent_color\|accent-color" src/app/[slug]/page.tsx` — accent color logic unchanged

## Observability / Diagnostics

- Runtime signals: none — animations are purely visual, no structured events
- Inspection surfaces: Browser DevTools → Elements → check for `motion.div` rendered elements with `style` attributes containing `transform` and `opacity`; React DevTools → component tree shows `motion.div` wrappers
- Failure visibility: `npm run build` errors surface any import or type issues; browser console shows React hydration mismatches if client/server boundary is wrong
- Redaction constraints: none

## Integration Closure

- Upstream surfaces consumed: `src/components/landing/*` (5 RSC + 1 client component from S01), `src/components/onboarding/OnboardingWizard.tsx`, `src/components/dashboard/RequestCard.tsx`, `src/components/dashboard/ConfirmedSessionCard.tsx`, `src/components/dashboard/StatsBar.tsx`, `src/components/profile/HeroSection.tsx`, `src/components/profile/AboutSection.tsx`, `src/components/profile/CredentialsBar.tsx`, `src/components/profile/ReviewsSection.tsx`, `src/app/(dashboard)/dashboard/layout.tsx`
- New wiring introduced in this slice: `motion` package dependency, animation constants module, thin animated wrapper components, `template.tsx` for page transitions, AnimatePresence in onboarding wizard
- What remains before the milestone is truly usable end-to-end: S03 (mobile bottom nav), S04 (OG tags on slug pages, social_email fix, production deploy)

## Tasks

- [x] **T01: Install motion, create animation constants, and add landing page scroll reveals** `est:45m`
  - Why: Installs the motion library, establishes shared animation constants used everywhere, and delivers the highest-visibility animation surface (ANIM-01). Also creates the unit test file for animation constants.
  - Files: `package.json`, `src/lib/animation.ts`, `src/lib/animation.test.ts`, `src/components/landing/AnimatedSection.tsx`, `src/components/landing/HeroSection.tsx`, `src/components/landing/HowItWorksSection.tsx`, `src/components/landing/ProblemSolutionSection.tsx`, `src/components/landing/CTASection.tsx`, `src/app/page.tsx`
  - Do: `npm install motion`. Create `src/lib/animation.ts` with shared variants (fadeSlideUp, staggerContainer, microPress, pageFade) and duration/easing constants. Create thin `AnimatedSection` client wrapper using `motion.div whileInView` with `viewport={{ once: true }}`. Wrap each RSC landing section in the animated wrapper from `page.tsx`. Add stagger children to HowItWorksSection's 3-step grid via a dedicated client wrapper. Create unit test file for constants.
  - Verify: `npm run build` passes. `npm test -- src/lib/animation` passes. Dev server: sections at `/` animate in on scroll.
  - Done when: All 5 landing sections fade+slide into view on scroll, build passes, animation constants tested.

- [x] **T02: Add page transitions and onboarding step animations** `est:45m`
  - Why: Delivers ANIM-02 (page transitions) and ANIM-03 (onboarding step slides) — the two surfaces that require AnimatePresence orchestration.
  - Files: `src/app/(dashboard)/dashboard/template.tsx`, `src/app/template.tsx`, `src/components/onboarding/OnboardingWizard.tsx`, `src/components/shared/PageTransition.tsx`
  - Do: Create `PageTransition` client component wrapping `AnimatePresence mode="wait"` + `motion.div` with fade variant from animation constants. Create `template.tsx` at dashboard layout level and root app level using `PageTransition`. In `OnboardingWizard.tsx`, wrap the step render area with `AnimatePresence` + `motion.div key={currentStep}` with slide variants. Add `custom` prop for forward/back direction on step changes.
  - Verify: `npm run build` passes. Dev server: navigating between `/dashboard/requests` and `/dashboard/sessions` shows fade transition. Dev server: onboarding wizard steps slide left-to-right on advance, right-to-left on back.
  - Done when: Dashboard route changes and onboarding steps both animate with no jarring flashes.

- [x] **T03: Add dashboard card staggers and profile section fades** `est:45m`
  - Why: Delivers ANIM-04 (dashboard animations) and ANIM-05 (profile section entrance animations). These target the two main user-facing surfaces — teacher dashboard and parent-facing profile.
  - Files: `src/components/dashboard/AnimatedList.tsx`, `src/app/(dashboard)/dashboard/requests/page.tsx`, `src/app/(dashboard)/dashboard/sessions/page.tsx`, `src/app/(dashboard)/dashboard/page.tsx`, `src/components/dashboard/StatsBar.tsx`, `src/components/profile/AnimatedProfile.tsx`, `src/app/[slug]/page.tsx`
  - Do: Create `AnimatedList` client component using `motion.ul` + `motion.li` with staggerChildren variant. Wrap card lists in requests and sessions pages with `AnimatedList`. Add motion mount animation to `StatsBar` stat cards. Create `AnimatedProfile` thin client wrapper for profile sections using `whileInView` with sequential delays. Wrap profile sections in `[slug]/page.tsx` with `AnimatedProfile`. Verify accent_color logic is untouched.
  - Verify: `npm run build` passes. Dev server: dashboard requests page cards stagger in. Dev server: teacher profile sections fade in on load. `grep "accent_color" src/app/[slug]/page.tsx` still shows accent color logic intact.
  - Done when: Dashboard cards stagger, stats animate, profile sections fade in, accent colors preserved.

- [x] **T04: Add micro-interactions and final build verification** `est:30m`
  - Why: Delivers ANIM-06 (micro-interactions) and performs final integration verification across all 6 animation surfaces. Ensures everything works together without regressions.
  - Files: `src/components/ui/button.tsx`, `src/components/shared/AnimatedButton.tsx`, `src/components/dashboard/RequestCard.tsx`, `src/components/dashboard/ConfirmedSessionCard.tsx`
  - Do: Create `AnimatedButton` wrapper component with `whileTap={{ scale: 0.97 }}` and `whileHover` spring for primary action buttons. Apply to key CTAs: dashboard accept/decline buttons, booking CTA, landing page CTA buttons. Add subtle press feedback to RequestCard and ConfirmedSessionCard action buttons. Verify existing CSS transition utilities on hover/focus states are preserved (tw-animate-css). Run final `npm run build` and verify all 6 animation surfaces in browser.
  - Verify: `npm run build` passes with zero errors. Dev server: buttons show press scale feedback. All 6 surfaces confirmed: (1) landing scroll reveals, (2) page transitions, (3) onboarding step slides, (4) dashboard card staggers, (5) profile section fades, (6) micro-interactions.
  - Done when: All 6 ANIM requirements verified in browser, build clean, no regressions.

## Files Likely Touched

- `package.json` — motion dependency
- `src/lib/animation.ts` — shared animation constants and variants
- `src/lib/animation.test.ts` — unit tests for animation constants
- `src/components/landing/AnimatedSection.tsx` — thin animated wrapper for landing sections
- `src/components/landing/HeroSection.tsx` — (minor, wrapped from page.tsx)
- `src/components/landing/HowItWorksSection.tsx` — stagger children wrapper
- `src/components/landing/ProblemSolutionSection.tsx` — (minor, wrapped from page.tsx)
- `src/components/landing/CTASection.tsx` — (minor, wrapped from page.tsx)
- `src/app/page.tsx` — wrap landing sections with animated wrappers
- `src/app/template.tsx` — root-level page transition
- `src/app/(dashboard)/dashboard/template.tsx` — dashboard page transition
- `src/components/shared/PageTransition.tsx` — reusable page transition wrapper
- `src/components/onboarding/OnboardingWizard.tsx` — AnimatePresence for steps
- `src/components/dashboard/AnimatedList.tsx` — stagger list wrapper
- `src/app/(dashboard)/dashboard/requests/page.tsx` — wrap card list
- `src/app/(dashboard)/dashboard/sessions/page.tsx` — wrap card list
- `src/app/(dashboard)/dashboard/page.tsx` — wrap stats
- `src/components/dashboard/StatsBar.tsx` — motion mount animation
- `src/components/profile/AnimatedProfile.tsx` — thin profile section wrapper
- `src/app/[slug]/page.tsx` — wrap profile sections
- `src/components/shared/AnimatedButton.tsx` — micro-interaction wrapper
- `src/components/ui/button.tsx` — possible minor enhancement
- `src/components/dashboard/RequestCard.tsx` — action button animation
- `src/components/dashboard/ConfirmedSessionCard.tsx` — action button animation
