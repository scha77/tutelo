---
id: T03
parent: S01
milestone: M001
provides:
  - Complete Phase 1 PostgreSQL schema via supabase/migrations/0001_initial_schema.sql
  - teachers table with all onboarding, customization, and Stripe stub columns
  - availability table for weekly schedule slots
  - bookings table stub with UNIQUE double-booking constraint and status state machine
  - reviews table stub for Phase 5
  - RLS policies on all 4 tables (public read, owner write, anon booking insert)
  - updated_at auto-trigger via update_updated_at() function
  - supabase/config.toml for local development with profile-images bucket config
  - profile-images public Storage bucket configuration (manual creation documented)
requires: []
affects: []
key_files: []
key_decisions: []
patterns_established: []
observability_surfaces: []
drill_down_paths: []
duration: 3min
verification_result: passed
completed_at: 2026-03-04
blocker_discovered: false
---
# T03: 01-foundation 03

**# Phase 1 Plan 03: Database Schema Summary**

## What Happened

# Phase 1 Plan 03: Database Schema Summary

**Supabase PostgreSQL schema with 4 tables (teachers, availability, bookings, reviews), RLS on all tables, TIMESTAMPTZ enforcement, IANA timezone column, UNIQUE double-booking constraint, and Supabase local config**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-04T14:05:41Z
- **Completed:** 2026-03-04T14:08:08Z
- **Tasks:** 2
- **Files modified:** 2 created

## Accomplishments

- Created complete Phase 1 SQL migration (260 lines) covering all 4 tables, all indexes, all RLS policies, and updated_at triggers
- Initialized Supabase CLI local config with profile-images bucket definition
- All verification checks pass: 4 tables, 4 RLS enables, 6+ TIMESTAMPTZ columns, correct UNIQUE constraint, no bare TIMESTAMP

## Task Commits

Each task was committed atomically:

1. **Task 1: Write complete initial schema migration** - `74a0386` (feat)
2. **Task 2: Initialize Supabase local config** - `f386f0a` (chore)

## Files Created/Modified

- `supabase/migrations/0001_initial_schema.sql` - Complete Phase 1 schema: teachers, availability, bookings, reviews tables with RLS, indexes, constraints, triggers
- `supabase/config.toml` - Supabase local development config with profile-images bucket definition

## Decisions Made

- `availability.start_time/end_time` use bare `TIME` (no timezone) — these are weekly recurring slots, interpreted relative to `teachers.timezone` (IANA string). This is the correct pattern for avoiding timezone-of-storage confusion with recurring schedules.
- `bookings.teacher_id` has no `ON DELETE CASCADE` — preserves booking history if a teacher account is deleted, allowing platform audit trail.
- `bookings_anon_insert` policy uses `WITH CHECK (true)` — deliberately permissive for Phase 2 guest booking. Phase 2 will tighten to verify teacher is published and slot is available.
- Storage bucket cannot be created via SQL — documented manual Dashboard creation steps as comments in migration file and configured in `config.toml` for local dev.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added profile-images bucket config to supabase/config.toml**
- **Found during:** Task 2 (Supabase initialization)
- **Issue:** Plan specified storage bucket creation but `supabase init` doesn't create it; local dev would be missing bucket config
- **Fix:** Ran `npx supabase init` to create `config.toml`, then added `[storage.buckets.profile-images]` section with `public = true`, 5MiB limit, image MIME types
- **Files modified:** supabase/config.toml
- **Verification:** Config file contains bucket definition correctly
- **Committed in:** f386f0a (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 - missing critical local dev config)
**Impact on plan:** Necessary for local development to mirror remote bucket behavior. No scope creep.

## User Setup Required

**External services require manual configuration before the schema is live.**

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for it to initialize (~2 minutes)

### Step 2: Update .env.local

Replace placeholder values in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_<your-key>
SUPABASE_SERVICE_SECRET_KEY=sb_secret_<your-key>
```

Keys found at: Project Settings > API

### Step 3: Apply the Migration

**Option A — Supabase CLI (recommended):**
```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

**Option B — SQL Editor:**
Copy the contents of `supabase/migrations/0001_initial_schema.sql` and execute in:
Supabase Dashboard > SQL Editor > New Query > Run

### Step 4: Create profile-images Storage Bucket

Supabase Dashboard > Storage > New bucket:
- Name: `profile-images`
- Toggle "Public bucket": ON
- Click Create

Then add Storage RLS policies (Storage > profile-images > Policies):
- Public SELECT: `true`
- Authenticated INSERT: `(auth.uid()::text) = (storage.foldername(name))[1]`
- Owner UPDATE: `(auth.uid()::text) = (storage.foldername(name))[1]`
- Owner DELETE: `(auth.uid()::text) = (storage.foldername(name))[1]`

### Step 5: Verify

After applying, in Supabase Dashboard > Table Editor you should see:
- teachers (RLS enabled)
- availability (RLS enabled)
- bookings (RLS enabled)
- reviews (RLS enabled)

## Next Phase Readiness

- Schema is complete and ready for Plan 01-04 (auth + onboarding wizard) and Plan 01-05 (public profile page)
- Supabase project setup is a human-action gate before any app code can be tested against the database
- Once `.env.local` has real credentials and migration is applied, all subsequent plans can proceed

---
*Phase: 01-foundation*
*Completed: 2026-03-04*
