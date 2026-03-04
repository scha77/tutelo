---
phase: 01-foundation
plan: "01"
subsystem: infra
tags: [next.js, tailwind, shadcn, supabase, vitest, typescript]

# Dependency graph
requires: []
provides:
  - Next.js 16 App Router project with TypeScript strict mode
  - Tailwind v4 CSS-first configuration via @theme (no tailwind.config.js)
  - shadcn/ui initialized with button, input, label, select, avatar, badge, card, separator, sonner
  - proxy.ts at project root with getClaims() session handling and route protection
  - Three Supabase clients (browser, server, admin) using PUBLISHABLE_KEY pattern
  - Vitest test scaffold with 8 Wave 0 stub files (23 todos)
  - .env.local template with post-Nov 2025 Supabase key names
affects:
  - 01-02 (auth pages depend on Supabase clients and proxy.ts)
  - 01-03 (onboarding wizard depends on layout and shadcn/ui)
  - 01-04 (public profile page depends on Next.js routing)
  - 01-05 (all subsequent plans depend on this foundation)

# Tech tracking
tech-stack:
  added:
    - next@16.1.6
    - react@19.2.3
    - typescript@5
    - tailwindcss@4 (CSS-first, no config file)
    - "@shadcn/ui (components: button, input, label, select, avatar, badge, card, separator, sonner)"
    - "@supabase/supabase-js + @supabase/ssr"
    - react-hook-form + @hookform/resolvers
    - zod
    - date-fns + date-fns-tz
    - slugify
    - zustand
    - vitest@4 + @vitejs/plugin-react + jsdom
    - "@testing-library/react + @testing-library/jest-dom"
  patterns:
    - proxy.ts (not middleware.ts) for Next.js 16 session handling
    - getClaims() instead of getSession()/getUser() in proxy
    - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (post-Nov 2025 naming)
    - SUPABASE_SERVICE_SECRET_KEY for admin client
    - await cookies() in server Supabase client (Next.js 16 requirement)
    - Wave 0 test stubs using it.todo() (not it.skip)

key-files:
  created:
    - proxy.ts
    - src/lib/supabase/client.ts
    - src/lib/supabase/server.ts
    - src/lib/supabase/service.ts
    - vitest.config.ts
    - tests/setup.ts
    - tests/utils/slugify.test.ts
    - tests/utils/bio.test.ts
    - tests/availability/timezone.test.ts
    - tests/profile/draft-visibility.test.ts
    - tests/auth/signup.test.ts
    - tests/auth/session.test.ts
    - tests/onboarding/wizard.test.ts
    - tests/profile/slug-page.test.ts
  modified:
    - src/app/layout.tsx (metadata: title "Tutelo", teacher description)
    - src/app/globals.css (shadcn/ui CSS variables added)

key-decisions:
  - "proxy.ts uses getClaims() not getSession() — post-Nov 2025 Supabase auth-js pattern"
  - "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY not ANON_KEY — required for post-Nov 2025 Supabase projects"
  - "Wave 0 test stubs use it.todo() (not it.skip) — produces green vitest run without false confidence"
  - "sonner used for toast notifications (shadcn/ui v4 replaced toast with sonner)"

patterns-established:
  - "proxy.ts pattern: getClaims() optional chaining — data?.claims ?? null handles nullable union type"
  - "Supabase client split: browser/server/service with separate key scopes"
  - "Test stub pattern: describe block + it.todo() stubs, no production imports"

requirements-completed:
  - AUTH-01
  - AUTH-02

# Metrics
duration: 6min
completed: "2026-03-04"
---

# Phase 1 Plan 1: Foundation Bootstrap Summary

**Next.js 16 + Tailwind v4 CSS-first project scaffolded with three Supabase clients, proxy.ts session handler, shadcn/ui, and 23 Wave 0 test stubs running green**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-04T13:57:12Z
- **Completed:** 2026-03-04T14:02:52Z
- **Tasks:** 2 (+ 1 auto-fix)
- **Files modified:** 28 created, 2 modified

## Accomplishments
- Next.js 16.1.6 scaffolded from scratch (empty git repo → full project) with Tailwind v4 CSS-first, no tailwind.config.js
- proxy.ts at project root with getClaims() session handling protecting /dashboard and /onboarding routes
- Three Supabase clients with correct post-Nov 2025 key names (PUBLISHABLE_KEY, SERVICE_SECRET_KEY)
- shadcn/ui initialized with 9 Phase 1 components (button, input, label, select, avatar, badge, card, separator, sonner)
- 8 Wave 0 vitest stub files with 23 it.todo() stubs — all pass green (0 failures)
- .env.local template with correct key names and comments

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold project, install dependencies, configure Tailwind v4 + shadcn/ui** - `f80a250` (feat)
2. **Task 2: Create proxy.ts, Supabase clients, .env.local, Wave 0 test scaffold** - `d840cc0` (feat)
3. **Auto-fix: getClaims TypeScript nullable union type** - `3f0be2f` (fix)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `proxy.ts` - Session handler with getClaims(), protects /dashboard and /onboarding
- `src/lib/supabase/client.ts` - Browser client using createBrowserClient + PUBLISHABLE_KEY
- `src/lib/supabase/server.ts` - Server client with await cookies() for Next.js 16
- `src/lib/supabase/service.ts` - Admin client using SUPABASE_SERVICE_SECRET_KEY (bypasses RLS)
- `vitest.config.ts` - Vitest config with jsdom, @/* alias, tests/setup.ts entry
- `tests/setup.ts` - @testing-library/jest-dom setup
- `tests/utils/slugify.test.ts` - 4 todo stubs for slug generation
- `tests/utils/bio.test.ts` - 3 todo stubs for bio generation
- `tests/availability/timezone.test.ts` - 3 todo stubs for timezone conversion
- `tests/profile/draft-visibility.test.ts` - 2 todo stubs for draft gate
- `tests/auth/signup.test.ts` - 2 todo stubs for email signup flow
- `tests/auth/session.test.ts` - 2 todo stubs for session persistence
- `tests/onboarding/wizard.test.ts` - 4 todo stubs for wizard flow
- `tests/profile/slug-page.test.ts` - 3 todo stubs for public profile page
- `src/app/layout.tsx` - Updated metadata (title "Tutelo", teacher description)
- `src/app/globals.css` - shadcn/ui CSS variables added alongside Tailwind v4 @theme

## Decisions Made
- Used `data?.claims ?? null` optional chaining in proxy.ts because getClaims() returns a union type `{data: {...}|null}` — direct destructuring fails TypeScript strict mode
- Used sonner component instead of toast for notifications — shadcn/ui v4 deprecated the old toast component in favor of sonner

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed getClaims TypeScript strict mode type error**
- **Found during:** Task 2 verification (npm run build)
- **Issue:** `const { data: { claims } } = await supabase.auth.getClaims()` fails TypeScript strict because the return type is a union where `data` can be `null`. Build error: "Property 'claims' does not exist on type '... | null'"
- **Fix:** Changed to `const { data } = await supabase.auth.getClaims(); const claims = data?.claims ?? null` — handles both union branches correctly
- **Files modified:** proxy.ts
- **Verification:** `npm run build` exits 0 after fix
- **Committed in:** 3f0be2f

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Required for build to pass. No scope creep. The fix uses the exact getClaims() pattern intended by the plan — just with correct TypeScript handling for the actual type signature.

## Issues Encountered
- `create-next-app` rejected "Tutelo" as project name (npm naming requires lowercase). Resolved by scaffolding in /tmp/tutelo-scaffold/tutelo and copying files to the project root with rsync. All project files identical to what create-next-app would have placed directly.

## User Setup Required
Before running the dev server, fill in real Supabase credentials in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` — from Supabase dashboard > Project Settings > API
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — from same location (labeled "Publishable key")
- `SUPABASE_SERVICE_SECRET_KEY` — from same location (labeled "Service key" or "Secret key")

## Next Phase Readiness
- Foundation complete — build passes, all deps installed, Supabase clients ready
- proxy.ts ready to protect routes once real Supabase keys are in .env.local
- Wave 0 test stubs ready to be implemented in later plans
- 01-02 (auth pages) can proceed immediately

---
*Phase: 01-foundation*
*Completed: 2026-03-04*
