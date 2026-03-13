---
id: S03
parent: M002
milestone: M002
provides:
  - Custom 404 page (not-found.tsx) with Tutelo branding and home link
  - Error boundary (error.tsx) with retry button; logs to console for Vercel capture
  - Global error boundary (global-error.tsx) for root layout crashes
  - LAUNCH.md documenting full production environment for the founder
  - .planning/ legacy directory removed; .gsd/ is sole planning authority
  - PROJECT.md updated to reflect production deployment status
requires:
  - slice: S02
    provides: Verified live deployment; auth, booking, and Stripe Connect flows working
affects: []
key_files:
  - src/app/not-found.tsx
  - src/app/error.tsx
  - src/app/global-error.tsx
  - LAUNCH.md
  - .gsd/PROJECT.md
key_decisions:
  - "global-error.tsx uses inline styles — layout components unavailable at root error boundary level"
  - "error.tsx logs error to console (not exposed to UI) — Vercel captures console.error"
patterns_established:
  - "Next.js error hierarchy: not-found.tsx → error.tsx (segment) → global-error.tsx (root) — three layers needed for complete coverage"
observability_surfaces:
  - "error.tsx console.error('Application error:', error) — captured in Vercel function logs"
  - "Vercel Dashboard > Deployments > Function Logs — authoritative for production errors"
duration: ~20min
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---
# S03: Production Hardening

**Error boundaries, LAUNCH.md, and .planning cleanup — no raw errors visible to users; production environment fully documented.**

## What Happened

Three tasks addressed the final production-readiness concerns.

**T01 — Error pages:** Created the full Next.js error hierarchy: `not-found.tsx` (clean 404 with Tutelo branding, Go to Tutelo link), `error.tsx` (client component with retry button and home link; logs to Vercel via `console.error`), and `global-error.tsx` (root-level boundary with inline styles and a retry button — layout components cannot be used at this level, so Tailwind was replaced with inline CSS). The existing `/[slug]` page already handled non-existent teachers gracefully via `notFound()` (VIS-02 was validated in M001).

**T02 — Documentation:** Created `LAUNCH.md` at project root covering: live URL, all external service dashboards, all 10 env var names with sources, cron job schedules and purposes, Stripe webhook configuration, common operational tasks (redeploy, check logs, apply migration, add teacher manually), and an upgrade checklist (Supabase Pro, Vercel Pro, Stripe live mode, custom domain). Updated `.gsd/PROJECT.md` to reflect current production state with "Current Status" section and updated "Key Decisions" table.

**T03 — Cleanup:** Removed the `.planning/` directory (pre-GSD migration artifacts from M001 phases 01–07). Added `.gsd/activity/` to `.gitignore`. Committed with `chore: remove old .planning directory (migrated to .gsd)`.

## Verification

- ✅ `src/app/not-found.tsx` exists — displays branded 404 on `/nonexistent` route
- ✅ `src/app/error.tsx` exists — client error boundary with retry button; no stack trace exposed to user
- ✅ `src/app/global-error.tsx` exists — root error boundary with `<html>` and `<body>` tags (required)
- ✅ `LAUNCH.md` exists with all required sections (live URL, services, env vars, crons, common tasks, upgrade checklist)
- ✅ `.planning/` removed — `ls .planning/` returns "No such file or directory"
- ✅ `.gsd/` intact — all GSD artifacts present and correct

## Files Created/Modified

- `src/app/not-found.tsx` — Custom 404 page; Tutelo branding; link to /login
- `src/app/error.tsx` — Client error boundary; retry button; console.error for Vercel capture
- `src/app/global-error.tsx` — Root-level error boundary; inline styles; html + body tags required
- `LAUNCH.md` — Production environment reference for founder and future agents
- `.gsd/PROJECT.md` — Current Status section added; Key Decisions table updated
- `.gitignore` — Added `.gsd/activity/` entry
- `.planning/` — Removed (95 legacy files deleted via git rm -r)
