# S01: Brand Identity & Landing Page — Research

**Date:** 2026-03-11
**Slice:** M003/S01
**Requirements owned:** LAND-01, LAND-02, LAND-03, LAND-04, LAND-05, BRAND-01, BRAND-02, SEO-02
**Requirements supported:** ANIM-01 (landing sections must be component-split for S02 animation wiring)

---

## Summary

S01 is a complete replacement of `src/app/page.tsx` (currently the Next.js default) with a polished marketing landing page, plus brand palette integration into globals.css and the Sidebar. The work is self-contained — there are no upstream dependencies and downstream slices (S02, S03, S04) all consume artifacts created here.

The biggest design constraint is preserving teacher accent color isolation: the `--accent` CSS variable is **set inline on `<main>` in `src/app/[slug]/page.tsx`** and consumed by profile components (`BookNowCTA`, `AvailabilityGrid`, `PaymentStep`) via `var(--accent)`. This means brand palette changes must use **separate CSS custom property names** (e.g., `--brand-primary`, `--brand-secondary`) rather than overriding `--accent` globally. The `--primary` and `--secondary` Tailwind theme tokens are safe to remap to the brand palette because profile components do not use them — they use `--accent`.

The logo is a 916 KB, 4000×4000 PNG at `public/logo.png`. Sharp is already installed (confirmed: `node -e "require.resolve('sharp')"`). Next.js `<Image>` will handle optimization at render time. The only asset prep needed is extracting a favicon (32×32 `.ico` or `.png`) — the rest can use `<Image width={} height={} />` directly.

Animation infrastructure for S01 is not needed — landing page scroll reveals are owned by S02 (ANIM-01 lists S01 as supporting). However, landing page sections **must be extracted as separate React components** in `src/components/landing/` so S02 can wrap them in motion elements without modifying S01's page.tsx. This is the key structural decision for the S01/S02 boundary.

## Recommendation

**Approach:** Build the landing page as a server component (`page.tsx` imports static section components). Extract each section into `src/components/landing/` — `HeroSection`, `HowItWorksSection`, `ProblemSolutionSection`, `TeacherMockSection`, `CTASection`. Keep all sections as pure RSC (no `'use client'`) so they render at build time. The interactive teacher page mock (LAND-02) can be a client component within `TeacherMockSection`.

**Brand palette:** Add `--brand-primary` (#3b4d3e), `--brand-secondary` (#f6f5f0), and derived tokens to `:root` in `globals.css`. Override `--primary` and `--primary-foreground` to match the brand. Do **not** touch `--accent` — it is reserved for teacher-specific color overrides.

**Navigation header:** Add a minimal nav to the landing page (logo + "Sign in" + "Start your page" CTA). The Sidebar already has `hidden ... md:flex` so mobile is hidden by default — add logo there in S01 as stated in boundary map.

**OG tags (SEO-02):** Use Next.js `export const metadata: Metadata = { ... openGraph: {...} }` in the landing page. Static metadata is sufficient here (no DB fetch needed).

**Logo optimization:** Use `<Image src="/logo.png" width={40} height={40} />` in the nav — Next.js/Sharp optimizes at request time. For the favicon, generate a 32×32 PNG from logo.png using Sharp in a one-off script, place at `public/favicon.png`, and update `src/app/layout.tsx` metadata. The current `src/app/favicon.ico` should be replaced or supplemented.

**CSS color approach:** Tailwind v4 `@theme inline` block in globals.css maps `--color-primary` → `var(--primary)`. Override `--primary` in `:root` from near-black `oklch(0.205 0 0)` to the brand sage green. Hex is valid in Tailwind v4 CSS custom properties — use `#3b4d3e` directly.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Responsive image optimization for 4000×4000 PNG logo | `next/image` (`<Image>`) + Sharp (already installed) | Automatic WebP/AVIF, proper sizing via `sizes`, no manual resize scripts needed |
| OG meta tags | Next.js `export const metadata` with `openGraph` field | Zero boilerplate, RSC-friendly, build-time static for landing page |
| Scroll reveal animations | Defer to S02 with `motion` package | S01's job is component structure; animation wiring is S02's scope |
| CSS variable theming | Existing `@theme inline` block in `globals.css` | Already wired — just override `:root` values |

## Existing Code and Patterns

- `src/app/page.tsx` — **Complete replacement target.** Currently the Next.js default. No existing content to preserve.
- `src/app/globals.css` — Tailwind v4 with `@theme inline` mapping CSS vars to color tokens. Brand colors go into `:root` block. Uses `oklch()` for existing colors — hex is also valid. Has `@import "tw-animate-css"` — simple CSS animations available without installing motion.
- `src/app/layout.tsx` — Root layout. Has `export const metadata` — update title/description here. Toaster already present.
- `src/components/dashboard/Sidebar.tsx` — `hidden w-56 ... md:flex md:flex-col`. Logo goes in the `border-b p-4` header div (currently only shows teacher name). Logo added here satisfies BRAND-02.
- `src/app/[slug]/page.tsx` — Sets `<main style={{ '--accent': teacher.accent_color }}>`; all profile accent color usage flows from this inline style. **Do not touch this pattern.**
- `src/components/profile/HeroSection.tsx` — Good model for the teacher mock on the landing page: shows banner, avatar overlap, name, headline. Reuse the same visual structure in `TeacherMockSection` to give visitors an accurate preview.
- `src/components/dashboard/PageSettings.tsx` — Shows `ACCENT_COLORS` palette (6 presets). The teacher mock on the landing page can hardcode one of these colors (e.g., `#10B981` green) to look realistic.
- `src/components/ui/button.tsx` — Uses `--primary` for `variant="default"`. Once `--primary` is overridden to brand green, all default buttons get the brand color automatically.

## Constraints

- **`--accent` CSS variable is reserved for teacher profiles.** Set inline in `src/app/[slug]/page.tsx`. Overriding globally would break teacher accent color on all profile pages. Brand colors must use `--brand-primary` / `--brand-secondary` as separate vars, OR repurpose `--primary` (which is safe — profile components use `var(--accent)`, not `var(--primary)`).
- **No animation library installed yet.** `motion` / `framer-motion` are not in `package.json`. S01 should use only `tw-animate-css` CSS classes for any simple entrance effects (e.g., `animate-fade-in`). The full motion library installation belongs to S02.
- **logo.png is 916 KB, 4000×4000.** Never use `<img src="/logo.png">` directly. Always use `next/image` `<Image>` with explicit `width` and `height` props.
- **Teacher-only audience.** No parent-facing copy. All messaging addresses teachers considering publishing their page.
- **"Start your page" CTA** must link to `/login` (which toggles to signup mode via the existing `LoginForm` two-mode component). No intermediate demo page.
- **Founding Teacher badge** must NOT appear on the landing page (per DECISIONS.md — saved for Instagram launch).
- **Tailwind v4** is in use (`@import "tailwindcss"` + `@theme inline`). No `tailwind.config.js` — all theme config lives in `globals.css`. No utility classes like `bg-[#3b4d3e]` needed once CSS vars are set.
- **`src/app/favicon.ico` already exists** at the app root. Replacing it with a branded one requires generating a proper `.ico` or `.png` file — Sharp can do this at build time or in a one-off script.

## Common Pitfalls

- **Overriding `--accent` in `:root`** — This would set a global default accent color that gets overridden per-profile, but it could cause flash or inconsistency. Safer to leave `--accent` alone and use `--primary` for brand buttons on the landing page.
- **Using `<img>` tag for logo** — Next.js lint will flag `@next/next/no-img-element`. Always use `<Image>` with width/height. For SVG logos, an `<svg>` inline or `<Image>` with `unoptimized` is fine.
- **Putting `'use client'` on landing page sections** — This forces client-side rendering of the entire landing page. Only the interactive teacher mock component needs `'use client'`. All other sections should be RSC.
- **Not using `next/image` `sizes` prop** — Without `sizes`, Next.js may serve large images on mobile. Add `sizes="(max-width: 768px) 32px, 40px"` for the nav logo.
- **Hardcoding dark mode colors** — globals.css has a `.dark` block. Ensure brand colors have sensible dark variants or restrict landing page to light mode only.
- **OG image path** — `openGraph.images` needs absolute URLs in production (`https://tutelo.app/og-image.png`). Use `metadataBase` in layout.tsx metadata to make relative paths resolve correctly.
- **Tailwind v4 inline theme token override** — The `@theme inline` block maps tokens to CSS vars. If overriding `--primary` in `:root`, the `--color-primary` token automatically picks it up. No need to change the `@theme` block itself.

## Open Risks

- **`--primary` override scope**: Changing `--primary` to sage green affects all shadcn components that use `bg-primary` (buttons, active states, etc.) across the app — including the dashboard. Visually verify the dashboard still looks acceptable after this change. Low risk given the green is used intentionally as Tutelo's brand color.
- **Logo PNG transparency**: The 4000×4000 logo.png is described as "T with leaf motif" but the file header shows `8-bit/color RGB, non-interlaced` — no alpha channel. If the logo has a solid background (not transparent), it may not look right on colored nav backgrounds. Check the actual logo content before placing it in the nav.
- **Teacher mock interactivity** (LAND-02): "Interactive/animated, not a static screenshot." Without motion installed in S01, the mock can use CSS hover/transition effects only. A simulated browser-chrome wrapper with hover states and CSS transitions is achievable with `tw-animate-css`. Full Framer Motion animation of the mock is S02 scope.
- **Slug showcase** (LAND-05): The vanity URL feature needs to be showcased in the landing page copy. A visual element showing `tutelo.app/ms-johnson` in a browser bar or badge is highly effective. This is copywriting + visual design, not a technical risk.
- **metadataBase in layout.tsx**: For OG tags to generate absolute URLs, `metadataBase` must be set to `https://tutelo.app` in the root layout metadata. Currently absent. This must be added for SEO-02 to work correctly in production.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Next.js landing page / frontend UI | `~/.gsd/agent/skills/frontend-design/SKILL.md` | installed (loaded) |
| Landing page guide (generic) | `bear2u/my-skills@landing-page-guide-v2` (589 installs) | available — not needed, frontend-design skill covers this |
| Tailwind CSS advanced | `josiahsiegel/claude-plugin-marketplace@tailwindcss-advanced-layouts` (2.3K installs) | available — not needed for this scope |

## Implementation Plan (for planner)

### T01: Brand CSS variables + logo in Sidebar
- Add `--brand-primary: #3b4d3e`, `--brand-secondary: #f6f5f0` to `:root` in `globals.css`
- Override `--primary` → `#3b4d3e`, `--primary-foreground` → `#f6f5f0` (brand-aware buttons everywhere)
- Add logo to `Sidebar.tsx` header section using `<Image src="/logo.png" width={32} height={32} />`
- Update `metadataBase` in `src/app/layout.tsx` metadata
- Generate favicon: use Sharp script to write `public/favicon-32.png`, reference in layout metadata
- **Verify:** dashboard buttons still look correct with new `--primary`; no visual regressions

### T02: Landing page structure + sections
- Create `src/components/landing/` directory with: `NavBar.tsx`, `HeroSection.tsx`, `HowItWorksSection.tsx`, `ProblemSolutionSection.tsx`, `TeacherMockSection.tsx`, `CTASection.tsx`
- Replace `src/app/page.tsx` with a server component importing all six components
- Add OG metadata via `export const metadata` with `openGraph` block (SEO-02)
- `NavBar`: logo (left), "Sign in" link (right), "Start your page" primary button (right)
- `HeroSection`: headline, sub-headline, "Start your page" CTA, trust signals (teacher count or quote placeholder)
- `HowItWorksSection`: 3-step visual (Sign up → Customize → Share link)
- `ProblemSolutionSection`: Before/After — Venmo/texting chaos vs. Tutelo organized booking
- `TeacherMockSection`: Realistic teacher page mockup (LAND-02), slug URL showcase (LAND-05), CSS hover interactions
- `CTASection`: Final call-to-action
- All sections are RSC (no `'use client'`) except `TeacherMockSection` if it needs hover state
- **Verify:** `npm run build` succeeds, landing page renders at `/`, OG tags present in `<head>`

## Sources

- `framer-motion` / `motion` both at v12.36.0 with `peerDependencies: react ^18 || ^19` — confirmed React 19 compatible (source: `npm show motion@latest peerDependencies`)
- `tw-animate-css` v1.4.0 already imported in globals.css — CSS animations available without additional install
- Sharp confirmed installed at project root (source: `node -e "require.resolve('sharp')"`)
- Teacher accent color isolation confirmed via `src/app/[slug]/page.tsx:111` — `--accent` set inline per-profile, profile components use `var(--accent)` not `var(--primary)`
- No `generateMetadata` currently exists anywhere in the codebase — S01 introduces it first on the landing page
- `metadataBase` absent from `src/app/layout.tsx` — must be added for absolute OG URLs (source: code inspection)
