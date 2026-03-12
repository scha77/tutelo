# T01: 01-foundation 01

**Slice:** S01 — **Milestone:** M001

## Description

Bootstrap the Tutelo Next.js 16 project with all dependencies installed, Tailwind v4 CSS-first configured, shadcn/ui initialized, three Supabase clients set up, proxy.ts for session handling, and the full Vitest Wave 0 test scaffold committed.

Purpose: Every subsequent plan in this phase depends on this foundation being correct. Getting proxy.ts, the Supabase key names, and async params patterns right here prevents cascading failures across all later plans.

Output: A runnable Next.js 16 project with working dev server, three Supabase client files, proxy.ts for route protection, .env.local template, and 8 test stub files that fail informatively (Wave 0 requirement from VALIDATION.md).

## Must-Haves

- [ ] "Next.js 16 dev server starts without errors"
- [ ] "proxy.ts exists at project root (not middleware.ts)"
- [ ] "All Supabase clients use NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (not ANON_KEY)"
- [ ] "Tailwind v4 renders correctly via CSS-first @theme (no tailwind.config.js)"
- [ ] "shadcn/ui components initialize and render without error"
- [ ] "Vitest test suite runs and all Wave 0 test stubs produce expected SKIP/TODO output"

## Files

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
