---
id: T01
parent: S05
milestone: M011
key_files:
  - src/components/landing/CTASection.tsx
  - src/components/landing/HeroSection.tsx
  - src/components/landing/NavBar.tsx
key_decisions:
  - Footer uses logo text + tagline rather than an image logo to keep the footer lightweight and consistent with the NavBar text treatment
duration: 
verification_result: passed
completed_at: 2026-04-03T18:05:16.322Z
blocker_discovered: false
---

# T01: Tightened the landing page with a proper footer, pill treatment on the free-forever badge, and mobile-responsive NavBar

**Tightened the landing page with a proper footer, pill treatment on the free-forever badge, and mobile-responsive NavBar**

## What Happened

Three targeted improvements to the landing page:\n\n1. **CTASection footer**: Replaced the minimal single-line copyright with a structured footer — top row has Tutelo branding + nav links (Find a Tutor, Sign In), bottom row has copyright. Uses border-t separator and responsive flex layout (stacked on mobile, row on desktop).\n\n2. **HeroSection free-forever badge**: Upgraded from plain text to a pill with a subtle border, checkmark icon, and consistent styling matching the eyebrow pill above the headline. Uses the same border-[#3b4d3e]/8 treatment.\n\n3. **NavBar mobile**: Hid the 'Sign in' text link on small screens (hidden sm:inline-flex) — only the 'Start your page' CTA button shows on mobile, preventing horizontal cramping.

## Verification

npx tsc --noEmit passed with 0 errors.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx tsc --noEmit` | 0 | ✅ pass | 4500ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/components/landing/CTASection.tsx`
- `src/components/landing/HeroSection.tsx`
- `src/components/landing/NavBar.tsx`
