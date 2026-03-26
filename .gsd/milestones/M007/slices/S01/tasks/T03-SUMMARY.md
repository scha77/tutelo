---
id: T03
parent: S01
milestone: M007
key_files:
  - src/components/profile/WaitlistForm.tsx
  - src/components/profile/AtCapacitySection.tsx
  - src/app/api/waitlist/route.ts
  - src/app/[slug]/page.tsx
key_decisions:
  - Used supabaseAdmin (service role) for waitlist insert since parents are unauthenticated — RLS allows anon insert but service role is simpler and more reliable
  - Inline capacity query in profile RSC rather than importing T01 utility — keeps dependency minimal since the page already has a Supabase client
  - Safe default on capacity query error: show booking calendar (not at-capacity state) — per slice plan failure visibility spec
  - BookNowCTA hidden when at capacity to avoid confusing scroll-to-booking CTA when booking is unavailable
duration: ""
verification_result: passed
completed_at: 2026-03-26T02:23:04.478Z
blocker_discovered: false
---

# T03: Add profile at-capacity state with waitlist signup form and API route

**Add profile at-capacity state with waitlist signup form and API route**

## What Happened

Implemented the four deliverables for T03:

**WaitlistForm** (`src/components/profile/WaitlistForm.tsx`) — Client component with email input, client-side validation, POST to `/api/waitlist`, and three result states: success ("You're on the list!"), already-on-waitlist (friendly blue message), and error (red with message). Submit button styled with teacher's accent color. Loader spinner during submission.

**AtCapacitySection** (`src/components/profile/AtCapacitySection.tsx`) — Server-safe wrapper component matching BookingCalendar's `max-w-3xl px-4 py-8` layout. Shows "Book a Session" heading (same as BookingCalendar), "Currently at capacity" message with teacher's first name, and renders WaitlistForm below.

**Waitlist API route** (`src/app/api/waitlist/route.ts`) — POST handler using `supabaseAdmin` (service role). Validates teacherId and email format. Inserts into waitlist table with lowercased/trimmed email. Returns 201 on success, 409 on duplicate (unique constraint `23505`), 400 on validation failure, 500 on insert error. Logs failures with teacher_id context, no PII.

**Profile page capacity check** (`src/app/[slug]/page.tsx`) — Added capacity check after reviews query. If `teacher.capacity_limit` is null, skips entirely (no DB query). If set, queries bookings for distinct student_name with status confirmed/completed in last 90 days. On query error, defaults to showing BookingCalendar (safe fallback per slice spec). Conditionally renders AtCapacitySection or BookingCalendar. BookNowCTA hidden when at capacity.

Also fixed the pre-existing build failures: ran `npm install` to populate node_modules in the worktree (qrcode/qrcode.react packages were listed in package.json but not installed), and symlinked `.env` and `.env.local` from the main project root (per KNOWLEDGE.md worktree pattern).

## Verification

1. `npx tsc --noEmit` — exit code 0, clean pass (no errors at all after npm install fixed missing qrcode types)
2. `npm run build` — exit code 0, clean build with `/api/waitlist` route visible in output. All pages compile and collect data successfully.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx tsc --noEmit` | 0 | ✅ pass | 3900ms |
| 2 | `npm run build` | 0 | ✅ pass | 12100ms |


## Deviations

Used absolute symlink paths for .env files instead of relative (more reliable for worktree layout). Also ran npm install to fix pre-existing missing node_modules — this was a worktree setup gap, not a T03 concern, but required for verification to pass.

## Known Issues

None.

## Files Created/Modified

- `src/components/profile/WaitlistForm.tsx`
- `src/components/profile/AtCapacitySection.tsx`
- `src/app/api/waitlist/route.ts`
- `src/app/[slug]/page.tsx`
