# S03: Production Hardening

**Goal:** Add error boundaries so users never see raw stack traces, document the production environment for the founder, and ensure the app is ready for real teachers.
**Demo:** Visit a non-existent /[slug] URL — see a clean 404 page, not a crash. A LAUNCH.md file documents everything the founder needs to know about the live environment.

## Must-Haves

- React error boundary wrapping the app so unhandled errors show a friendly page
- Custom 404 page for invalid routes and non-existent teacher slugs
- LAUNCH.md documenting: live URL, all external services, how to access dashboards, how to troubleshoot
- .planning/ directory cleaned up (old planning artifacts)
- PROJECT.md updated to reflect production state

## Proof Level

- This slice proves: operational (production-quality error handling and documentation)
- Real runtime required: yes
- Human/UAT required: no (error boundaries can be verified by visiting invalid URLs)

## Verification

- Visit `/nonexistent-route` on live URL — see custom 404 page
- Visit `/a-teacher-that-doesnt-exist` — see graceful "not found" state
- Trigger a runtime error (if feasible) — see error boundary, not raw stack trace
- LAUNCH.md exists with all required sections
- PROJECT.md reflects current production state

## Observability / Diagnostics

- Runtime signals: Next.js error boundary catches render errors; Vercel logs capture server errors
- Inspection surfaces: Vercel Dashboard > Deployments > Function Logs
- Failure visibility: error boundary shows user-friendly message; Vercel logs show the actual error
- Redaction constraints: error boundary must never expose internal error messages to the user

## Integration Closure

- Upstream surfaces consumed: verified live deployment from S02
- New wiring introduced: error boundary component, custom 404 page
- What remains before the milestone is truly usable end-to-end: nothing — this is the final slice

## Tasks

- [x] **T01: Add error boundary and custom error pages** `est:20m`
  - Why: Raw Next.js error pages expose implementation details and look unprofessional. Teachers and parents hitting an error should see a branded, helpful page.
  - Files: `src/app/not-found.tsx`, `src/app/error.tsx`, `src/app/global-error.tsx`
  - Do:
    1. Create `src/app/not-found.tsx` — clean 404 page with Tutelo branding, "Page not found" message, and link back to home
    2. Create `src/app/error.tsx` — client component error boundary with "Something went wrong" message, retry button, and link to home. Must use `'use client'` directive. Log the error to console (Vercel captures it).
    3. Create `src/app/global-error.tsx` — root-level error boundary for errors in the layout itself. Minimal HTML (can't use layout components). Must include `<html>` and `<body>` tags.
    4. Verify the existing `/[slug]` page already handles non-existent teachers gracefully (it should — VIS-02 was validated in M001). If it returns raw 404, add a notFound() call.
    5. Deploy: `vercel --prod`
  - Verify: Visit `/nonexistent` on live URL → custom 404. Visit `/fake-teacher-slug` → graceful not-found state.
  - Done when: No raw Next.js error pages visible to users on the live URL

- [x] **T02: Write LAUNCH.md and update PROJECT.md** `est:15m`
  - Why: The founder needs a single reference document for the live environment. Future agents need PROJECT.md to reflect reality.
  - Files: `LAUNCH.md`, `.gsd/PROJECT.md`
  - Do:
    1. Create `LAUNCH.md` at project root with sections:
       - **Live URL** — the Vercel production URL
       - **External Services** — Supabase (project URL, Dashboard link), Stripe (Dashboard link, test/live mode status), Resend (Dashboard link), Vercel (Dashboard link)
       - **Environment Variables** — list of all 10 vars with where each comes from (no values!)
       - **Cron Jobs** — what they do, schedule, Vercel Pro requirement
       - **Common Tasks** — how to: redeploy, check logs, apply a new migration, add a teacher manually
       - **Upgrade Checklist** — Supabase Pro, Vercel Pro, Stripe live mode, custom domain
       - **Known Limitations** — Google OAuth booking flow, guest booking RLS, mobile dashboard
    2. Update `.gsd/PROJECT.md`:
       - Add "Current Status" section noting the app is deployed and in what mode (test/production)
       - Update the "Key Decisions" table outcomes from "Pending" to results
    3. Deploy with updated docs
  - Verify: LAUNCH.md exists and contains all required sections. PROJECT.md reflects production deployment.
  - Done when: A new agent reading LAUNCH.md could understand and operate the production environment

- [x] **T03: Clean up old planning directory** `est:5m`
  - Why: The `.planning/` directory is the pre-migration artifact. Now that `.gsd/` is the source of truth and M001 is complete, keeping both is confusing.
  - Files: `.planning/` directory, `.gitignore`
  - Do:
    1. Verify `.gsd/` has everything needed (already confirmed in migration review)
    2. `git rm -r .planning/` to remove the old directory
    3. Ensure `.gsd/activity/` is in `.gitignore`
    4. Commit: `chore: remove old .planning directory (migrated to .gsd)`
  - Verify: `ls .planning/` returns "No such file or directory". `.gsd/` is intact.
  - Done when: Only `.gsd/` exists as the planning directory

## Files Likely Touched

- `src/app/not-found.tsx` (new)
- `src/app/error.tsx` (new)
- `src/app/global-error.tsx` (new)
- `LAUNCH.md` (new)
- `.gsd/PROJECT.md` (update)
- `.planning/` (delete)
- `.gitignore` (update if needed)
