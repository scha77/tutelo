---
estimated_steps: 1
estimated_files: 3
skills_used: []
---

# T01: Upgrade HeroSection, AboutSection, and SocialLinks to premium visual treatment

Upgrade the three simplest profile components in one pass. HeroSection gets a taller banner (h-44/h-64), larger avatar (h-24/h-28 with border-4 + shadow-lg), better overlap (-mt-12/-mt-14), refined name typography (text-2xl/text-3xl font-bold tracking-tight with text-wrap: balance), and a subtle ring-inset on the banner image for depth. AboutSection gets a refined heading treatment (small uppercase label or left accent border) and text-wrap: pretty on bio text. SocialLinks gets pill-link styling (rounded-full px-4 py-2 border hover:bg-muted transition-colors) and a subtle 'Powered by Tutelo' attribution footer. No logic changes, no new props needed, no tests to worry about for these three components.

## Inputs

- ``src/components/profile/HeroSection.tsx` — current MVP hero with h-40 banner, h-20 avatar, text-2xl name`
- ``src/components/profile/AboutSection.tsx` — current plain h2 + p layout`
- ``src/app/[slug]/page.tsx` — contains SocialLinks function and page composition`

## Expected Output

- ``src/components/profile/HeroSection.tsx` — upgraded with taller banner, larger avatar, better typography`
- ``src/components/profile/AboutSection.tsx` — upgraded with refined heading and text-wrap: pretty`
- ``src/app/[slug]/page.tsx` — SocialLinks upgraded with pill styling + Tutelo attribution footer`

## Verification

npx tsc --noEmit && npx vitest run --reporter=dot 2>&1 | tail -3
