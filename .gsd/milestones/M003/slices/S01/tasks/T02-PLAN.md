---
estimated_steps: 5
estimated_files: 8
---

# T02: Build landing page with all sections — hero, how-it-works, problem/solution, interactive teacher mock, slug showcase, and CTA

**Slice:** S01 — Brand Identity & Landing Page
**Milestone:** M003

## Description

Replace the Next.js default `src/app/page.tsx` with a polished marketing landing page composed of 6 extracted components in `src/components/landing/`. The landing page is the primary deliverable of S01 and covers LAND-01 (hero, how-it-works, problem/solution, CTA), LAND-02 (interactive teacher mock), LAND-03 ("Start your page" → `/login`), LAND-04 (brand identity used throughout), LAND-05 (shareable slug showcase), and SEO-02 (OG meta tags).

**Design direction:** Sleek & modern — clean startup feel (Stripe/Linear vibe) with the sage green brand palette. Teacher-only audience. No Founding Teacher badge. Use the frontend-design skill for distinctive, non-generic aesthetics. Typography should elevate beyond default — use the existing Geist font family but with careful sizing, weight, and spacing. Generous whitespace. Warm off-white (#f6f5f0) background. Sage green accents. The landing page should feel premium and trustworthy.

Each section is a separate component in `src/components/landing/` so S02 can wrap them in motion elements without modifying this file. All sections are RSC (server components) except `TeacherMockSection` which needs `'use client'` for CSS hover state interactions.

## Steps

1. **Create `src/components/landing/NavBar.tsx`.** Sticky top nav with: Tutelo logo (left, `<Image src="/logo.png">` with proper sizing), navigation spacer, "Sign in" text link → `/login`, "Start your page" primary button → `/login`. Use brand colors. Light, clean design. Nav should have a subtle backdrop blur and background on scroll (pure CSS — no JS state needed, just `backdrop-blur` class). RSC.

2. **Create hero and how-it-works sections.** `HeroSection.tsx`: Large headline focused on professional identity ("Your tutoring page, ready in minutes" or similar teacher-audience messaging). Sub-headline about zero risk / no payment required. Primary "Start your page" CTA button → `/login`. Trust signal area (placeholder for future teacher count). Use brand secondary (#f6f5f0) as background. `HowItWorksSection.tsx`: 3-step visual — (1) Sign up & customize, (2) Share your link, (3) Get booked. Clean iconography using Lucide icons. Step cards or numbered flow. RSC for both.

3. **Create problem/solution and CTA sections.** `ProblemSolutionSection.tsx`: Before/After contrast — "Before" shows chaos of Venmo requests, text message scheduling, no-shows with no system. "After" shows Tutelo's organized booking, professional page, automatic payments. Visual cards or split layout. `CTASection.tsx`: Final call-to-action section. "Start your page" button → `/login`. Include slug URL showcase element: a visual showing `tutelo.app/ms-johnson` in a stylized browser bar or URL badge to highlight the vanity URL value prop (LAND-05). Footer-level information. RSC for both.

4. **Create `src/components/landing/TeacherMockSection.tsx` as `'use client'`.** Build a realistic interactive mock of a teacher's public page. Include: mock browser chrome wrapper (address bar showing `tutelo.app/ms-johnson`), teacher profile preview with banner (using hardcoded accent `#10B981`), avatar, name, headline, credential badges, subjects, a mini availability grid preview, and a "Book Now" button. CSS hover effects: cards lift on hover, book-now button scales, sections have subtle transitions. The mock should look like a real teacher page inside a browser frame — this is the primary conversion element (LAND-02). Use existing profile component visual structure (from `src/components/profile/HeroSection.tsx`) as reference for realistic layout.

5. **Replace `src/app/page.tsx` and add OG metadata.** Replace entire file content. Import all 6 landing components. Compose them vertically. Add `export const metadata: Metadata = { ... }` with: `title: 'Tutelo — Professional Tutoring Pages for Teachers'`, `description`, `openGraph` with title, description, type, images (use `/logo.png` as fallback OG image — a proper OG image can be designed later). The page is a server component — no `'use client'`. Run `npm run build` to verify everything compiles. Start dev server and visually check all sections render, CTAs link to `/login`, teacher mock is interactive, slug URL is visible.

## Must-Haves

- [ ] 6 components exist in `src/components/landing/`: NavBar, HeroSection, HowItWorksSection, ProblemSolutionSection, TeacherMockSection, CTASection
- [ ] `src/app/page.tsx` replaced with server component composing all 6 sections
- [ ] Hero headline addresses teachers, communicates professional identity and zero risk
- [ ] "Start your page" CTA links to `/login` (at least in hero and CTA sections)
- [ ] 3-step how-it-works visual present
- [ ] Problem/solution before/after contrast visible
- [ ] Interactive teacher mock with CSS hover/transition effects (`'use client'`)
- [ ] Slug URL `tutelo.app/ms-johnson` visually showcased on page
- [ ] OG meta tags exported from page.tsx (title, description, openGraph)
- [ ] No Founding Teacher badge anywhere
- [ ] Teacher-only copy (no parent-facing sections)
- [ ] All brand colors used (sage green primary, warm off-white secondary)
- [ ] `npm run build` passes

## Verification

- `npm run build` exits with code 0
- `ls src/components/landing/` shows all 6 component files
- Dev server at `http://localhost:3000/` renders landing page (not "To get started, edit the page.tsx file.")
- "Start your page" button visible and links to `/login`
- Teacher mock section has hover interactivity (cursor changes, elements animate on hover)
- `tutelo.app/ms-johnson` text visible on the page
- View page source or DevTools `<head>`: `og:title`, `og:description`, `og:image` present
- No "Founding Teacher" text anywhere on the page
- Visual: page uses sage green (#3b4d3e) and warm off-white (#f6f5f0), not generic black/white

## Observability Impact

- Signals added/changed: None — static marketing page with no runtime signals
- How a future agent inspects this: `npm run build` for compile errors. Browser at `/` for visual state. `<head>` inspection for OG tags. Component file listing for structure.
- Failure state exposed: Build failures from TypeScript errors or missing imports. Visual regressions visible at `/`.

## Inputs

- `src/app/globals.css` — brand CSS variables from T01 (--primary, --brand-primary, --brand-secondary)
- `src/app/layout.tsx` — metadataBase from T01 (enables relative OG image URLs)
- `src/components/profile/HeroSection.tsx` — visual reference for teacher mock layout
- `src/components/dashboard/PageSettings.tsx` — ACCENT_COLORS reference for mock (use `#10B981`)
- Brand decisions from DECISIONS.md: teacher-only audience, "Start your page" → `/login`, no Founding Teacher badge, sleek & modern tone

## Expected Output

- `src/components/landing/NavBar.tsx` — sticky nav with logo, sign-in, CTA
- `src/components/landing/HeroSection.tsx` — hero with headline, sub-headline, CTA
- `src/components/landing/HowItWorksSection.tsx` — 3-step visual flow
- `src/components/landing/ProblemSolutionSection.tsx` — before/after contrast
- `src/components/landing/TeacherMockSection.tsx` — interactive teacher page mock (`'use client'`)
- `src/components/landing/CTASection.tsx` — final CTA with slug URL showcase
- `src/app/page.tsx` — server component composing all sections with OG metadata
