---
estimated_steps: 9
estimated_files: 3
skills_used: []
---

# T01: Landing page tightening — footer, spacing refinements, minor typography

Polish the landing page with:

1. **CTASection footer upgrade**: Replace the minimal copyright line with a proper footer that includes navigation links (Find a Tutor → /tutors, Sign In → /login, Privacy → #), the Tutelo logo, and the copyright. Use a clean two-row layout: top row with logo + nav links, bottom row with copyright.

2. **Hero section refinements**: Tighten the 'Free forever • No hidden fees' text — make it slightly more prominent with a subtle border pill treatment matching the eyebrow style.

3. **Section spacing consistency**: Verify all sections use consistent py-24 md:py-32 padding. Verify all section headers use the same pattern (uppercase eyebrow + bold heading + optional subtext).

4. **NavBar mobile responsiveness**: The current NavBar hides nothing on mobile — both 'Sign in' and 'Start your page' show. On very narrow screens the 'Sign in' text link can be hidden (md:inline-flex) to save space, keeping only the CTA button.

Constraints:
- Do NOT restructure sections or change copy beyond the footer
- Keep all existing animations (AnimatedSection, AnimatedButton)
- Preserve the #3b4d3e / #f6f5f0 color system

## Inputs

- `src/components/landing/CTASection.tsx`
- `src/components/landing/HeroSection.tsx`
- `src/components/landing/NavBar.tsx`

## Expected Output

- `Updated CTASection.tsx with proper footer`
- `Updated HeroSection.tsx with pill treatment on free line`
- `Updated NavBar.tsx with mobile-responsive sign-in link`

## Verification

npx tsc --noEmit
