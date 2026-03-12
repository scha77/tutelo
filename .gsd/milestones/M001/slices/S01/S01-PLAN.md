# S01: Foundation

**Goal:** Bootstrap the Tutelo Next.
**Demo:** Bootstrap the Tutelo Next.

## Must-Haves


## Tasks

- [x] **T01: 01-foundation 01** `est:6min`
  - Bootstrap the Tutelo Next.js 16 project with all dependencies installed, Tailwind v4 CSS-first configured, shadcn/ui initialized, three Supabase clients set up, proxy.ts for session handling, and the full Vitest Wave 0 test scaffold committed.

Purpose: Every subsequent plan in this phase depends on this foundation being correct. Getting proxy.ts, the Supabase key names, and async params patterns right here prevents cascading failures across all later plans.

Output: A runnable Next.js 16 project with working dev server, three Supabase client files, proxy.ts for route protection, .env.local template, and 8 test stub files that fail informatively (Wave 0 requirement from VALIDATION.md).
- [x] **T02: 01-foundation 02** `est:45min`
  - Build the complete authentication layer: a login page supporting both email+password and Google SSO, an OAuth callback route handler, and session persistence via the proxy.ts already in place. Teachers who are new get redirected to /onboarding; existing teachers go to /dashboard.

Purpose: Auth gates all dashboard and onboarding routes. Without this, no subsequent plan can be tested end-to-end.

Output: Working login/signup page, Google OAuth flow, session cookie set on login, route protection enforced by proxy.ts, and the auth callback route that Supabase redirects to after OAuth.
- [x] **T03: 01-foundation 03** `est:3min`
  - Create the complete Phase 1 database schema: teachers, availability, bookings (state machine stub), and reviews (stub) tables — with all RLS policies, indexes, timestamptz enforcement, IANA timezone column, booking unique constraint, and Supabase Storage bucket configuration.

Purpose: Every subsequent plan (onboarding wizard, public profile page, dashboard) reads and writes to this schema. Getting it right now prevents destructive migrations later.

Output: A single SQL migration file (0001_initial_schema.sql) that can be applied via `supabase db push` or directly in the Supabase SQL editor, plus a Supabase Storage public bucket for profile images.
- [x] **T04: 01-foundation 04** `est:~60min`
  - Build the 3-step onboarding wizard: Step 1 (identity), Step 2 (teaching details), Step 3 (availability + slug + publish). Uses React Hook Form with per-step Zod validation, saves progress to DB after each step, generates a unique slug from the teacher's name, and publishes a live page with no Stripe required.

Purpose: This is the core "7 minutes to a live page" flow — the product's headline promise. Completing this means a real teacher can onboard and get a shareable URL.

Output: Fully functional multi-step wizard that creates a teacher record and availability rows in Supabase, ending with a redirect to /dashboard?welcome=true.
- [x] **T05: 01-foundation 05** `est:~30min`
  - Build the public teacher profile page (/[slug]) and the teacher dashboard (Page, Availability, Settings sections) — completing all PAGE-*, CUSTOM-*, AVAIL-*, VIS-*, and DASH-06 requirements.

Purpose: This is the public face of Tutelo — what a parent sees when clicking a teacher's link. It is also the end-to-end proof that the platform works: teacher onboards, publishes, shares link, parent sees a professional page.

Output: Fully rendered public profile page with hero, credentials bar, about, availability grid (timezone-converted), and Book Now CTA. Dashboard with sidebar navigation, page customization panel, availability editor, and Active/Draft toggle.

## Files Likely Touched

- `package.json`
- `tsconfig.json`
- `next.config.ts`
- `src/app/globals.css`
- `src/app/layout.tsx`
- `proxy.ts`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/service.ts`
- `.env.local`
- `vitest.config.ts`
- `tests/utils/slugify.test.ts`
- `tests/utils/bio.test.ts`
- `tests/availability/timezone.test.ts`
- `tests/profile/draft-visibility.test.ts`
- `tests/auth/signup.test.ts`
- `tests/auth/session.test.ts`
- `tests/onboarding/wizard.test.ts`
- `tests/profile/slug-page.test.ts`
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/callback/route.ts`
- `src/app/(auth)/layout.tsx`
- `src/components/auth/LoginForm.tsx`
- `supabase/migrations/0001_initial_schema.sql`
- `src/app/onboarding/page.tsx`
- `src/components/onboarding/OnboardingWizard.tsx`
- `src/components/onboarding/WizardStep1.tsx`
- `src/components/onboarding/WizardStep2.tsx`
- `src/components/onboarding/WizardStep3.tsx`
- `src/lib/schemas/onboarding.ts`
- `src/lib/utils/slugify.ts`
- `src/actions/onboarding.ts`
- `src/app/[slug]/page.tsx`
- `src/components/profile/HeroSection.tsx`
- `src/components/profile/CredentialsBar.tsx`
- `src/components/profile/AboutSection.tsx`
- `src/components/profile/AvailabilityGrid.tsx`
- `src/components/profile/BookNowCTA.tsx`
- `src/lib/utils/bio.ts`
- `src/lib/utils/timezone.ts`
- `src/app/(dashboard)/dashboard/layout.tsx`
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/dashboard/page/page.tsx`
- `src/app/(dashboard)/dashboard/availability/page.tsx`
- `src/app/(dashboard)/dashboard/settings/page.tsx`
- `src/components/dashboard/Sidebar.tsx`
- `src/components/dashboard/PageSettings.tsx`
- `src/components/dashboard/AvailabilityEditor.tsx`
- `src/actions/profile.ts`
- `src/actions/availability.ts`
- `tests/utils/bio.test.ts`
- `tests/availability/timezone.test.ts`
- `tests/profile/draft-visibility.test.ts`
- `tests/profile/slug-page.test.ts`
