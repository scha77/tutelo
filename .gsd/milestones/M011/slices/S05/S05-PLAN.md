# S05: Landing Page & Global Consistency Pass

**Goal:** Tighten the landing page and apply a global consistency pass so the entire app feels like one product — consistent card treatments, spacing, typography, and visual patterns across all surfaces.
**Demo:** After this: After this: the landing page is tightened. Typography, spacing, and component patterns are consistent across every surface. The whole app feels like one product, not 10 milestones of accumulated features.

## Tasks
- [x] **T01: Tightened the landing page with a proper footer, pill treatment on the free-forever badge, and mobile-responsive NavBar** — Polish the landing page with:

1. **CTASection footer upgrade**: Replace the minimal copyright line with a proper footer that includes navigation links (Find a Tutor → /tutors, Sign In → /login, Privacy → #), the Tutelo logo, and the copyright. Use a clean two-row layout: top row with logo + nav links, bottom row with copyright.

2. **Hero section refinements**: Tighten the 'Free forever • No hidden fees' text — make it slightly more prominent with a subtle border pill treatment matching the eyebrow style.

3. **Section spacing consistency**: Verify all sections use consistent py-24 md:py-32 padding. Verify all section headers use the same pattern (uppercase eyebrow + bold heading + optional subtext).

4. **NavBar mobile responsiveness**: The current NavBar hides nothing on mobile — both 'Sign in' and 'Start your page' show. On very narrow screens the 'Sign in' text link can be hidden (md:inline-flex) to save space, keeping only the CTA button.

Constraints:
- Do NOT restructure sections or change copy beyond the footer
- Keep all existing animations (AnimatedSection, AnimatedButton)
- Preserve the #3b4d3e / #f6f5f0 color system
  - Estimate: 30m
  - Files: src/components/landing/CTASection.tsx, src/components/landing/HeroSection.tsx, src/components/landing/NavBar.tsx
  - Verify: npx tsc --noEmit
- [x] **T02: Applied global consistency pass — elevated booking-confirmed card, Search icon on tutors empty state, card wrapper on auth layout** — Apply consistent card elevation and typography patterns across non-dashboard surfaces:

1. **Booking-confirmed page**: Wrap the confirmation content in an elevated card (rounded-xl border bg-card shadow-sm p-8). Replace the text checkmark with a proper CheckCircle2 lucide icon in a tinted success pill (green). Add a 'Back to Home' link button below.

2. **Tutors directory page**: Add the premium page header pattern (tracking-tight on h1 — already close, verify). The TeacherCard already uses rounded-xl shadow-sm hover:shadow-md — confirmed good. Upgrade the empty state to match the dashboard pattern (centered icon + heading + description).

3. **Auth layout/login page**: The auth layout is minimal (centered, max-w-md). Add a subtle Card wrapper around the LoginForm content for visual containment — rounded-xl border bg-card shadow-sm. Verify the login page header uses tracking-tight.

4. **Run full verification suite**: npx tsc --noEmit + npx vitest run + npx next build

Constraints:
- Do NOT modify any auth logic, data fetching, or API routes
- Keep the tutors page Suspense boundary unchanged
- Booking-confirmed page: keep the Stripe session retrieval logic unchanged
  - Estimate: 45m
  - Files: src/app/booking-confirmed/page.tsx, src/app/tutors/page.tsx, src/app/(auth)/login/page.tsx, src/app/(auth)/layout.tsx
  - Verify: npx tsc --noEmit && npx vitest run && npx next build
