# M013: Codebase Cohesion & Observability

**Gathered:** 2026-04-07
**Status:** Ready for planning

## Project Description

Tutelo is a live production web app (tutelo.app) with 12 completed milestones of feature work. The test suite has drifted (14 failures, 45 orphaned todo stubs), the capability contract was hollowed out, and production errors are invisible (console.log only, no monitoring). This milestone fixes the internal quality signals without touching user-facing features.

## Why This Milestone

Feature velocity across M001–M012 prioritized shipping over maintenance. Cross-milestone changes broke tests without updating mocks. The original 124+ requirement entries were lost during M011 restructuring. Production has zero error visibility — a thrown exception in a server component is invisible unless a user reports it. These are the kinds of problems that compound: one more feature milestone without fixing them makes the next fix harder.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Trigger an error and have it appear in the Sentry dashboard with full stack trace and breadcrumbs
- Run `npx vitest run` and see 0 failures with no orphaned todo stubs
- Read REQUIREMENTS.md and see the full 124+ validated capability surface

### Entry point / environment

- Entry point: test suite (`npx vitest run`), build (`npx next build`), Sentry dashboard
- Environment: local dev + production (Vercel)
- Live dependencies involved: Sentry (new), Supabase, Stripe (existing, unchanged)

## Completion Class

- Contract complete means: all tests green, tsc clean, build succeeds, no orphaned stubs
- Integration complete means: Sentry receives errors from both client React error boundaries and server-side catch blocks in dev and production
- Operational complete means: Sentry alerts configured for error spikes (basic, not custom)
- UAT / human verification: trigger a test error in production and confirm it appears in Sentry dashboard

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- `npx vitest run` → 0 failures, 0 todo stubs remaining
- `npx tsc --noEmit` → clean
- `npx next build` → succeeds
- A deliberate client-side error in dev renders the error boundary and appears in Sentry
- A deliberate server-side error in dev appears in Sentry with request context
- REQUIREMENTS.md contains entries for all validated capabilities from M001–M012

## Risks and Unknowns

- **Test stub audit effort is variable** — some stubs may represent real coverage gaps that need non-trivial mocking (e.g., onboarding wizard, mark-complete flow). May need to timebox and defer the hardest ones.
- **Sentry + Next.js 16 integration** — Sentry's Next.js SDK may have compatibility quirks with Next.js 16.1.6. Need to verify the instrumentation wizard works with the current setup.

## Existing Codebase / Prior Art

- `src/__tests__/` — 48 test files, 456 passing tests (the real test suite)
- `tests/` — 11 files with 45 todo stubs and 4 skipped tests (wave-0 leftovers from M001)
- `src/app/error.tsx` and `src/app/global-error.tsx` — existing error boundary files, will need Sentry wrapping
- `vitest.config.ts` — test configuration, already excludes `.gsd/**`
- `.env.local` — will need SENTRY_DSN and related env vars
- `next.config.ts` — will need Sentry webpack plugin configuration

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions.

## Relevant Requirements

- R001 — Test suite fully green (primary deliverable of S01)
- R002 — Sentry error tracking integrated (primary deliverable of S02)
- R003 — No swallowed errors in catch blocks (delivered alongside S02)
- R004 — Test stub audit complete (primary deliverable of S03)
- R005 — Full capability contract rebuilt (primary deliverable of S04)

## Scope

### In Scope

- Fix all 14 broken tests (mock drift corrections)
- Sentry SDK integration (client + server + source maps)
- Error boundary Sentry wrapping
- Catch block audit (46 blocks — ensure all report or log meaningfully)
- Test stub audit (45 todos — delete redundant, convert gaps)
- REQUIREMENTS.md full rebuild from milestone summaries

### Out of Scope / Non-Goals

- No UI changes (except Sentry error boundaries replacing default Next.js error pages)
- No new features
- No schema migrations
- No Stripe live mode switch (separate launch-readiness milestone)
- No Twilio A2P 10DLC registration (separate launch-readiness milestone)
- No refactoring of working code paths

## Technical Constraints

- Sentry free tier (50K errors/month, 1GB attachments) — sufficient for current traffic
- Must not add Sentry to client bundle in a way that bloats initial load (tree-shake appropriately)
- Tests must remain fast (<30s total run time)

## Integration Points

- **Sentry** — new external service; SDK integration in Next.js config, error boundaries, and server error paths
- **Vercel** — SENTRY_DSN env var must be set on Vercel for production error capture; source map upload via Sentry webpack plugin

## Open Questions

- None — scope is well-defined and bounded
