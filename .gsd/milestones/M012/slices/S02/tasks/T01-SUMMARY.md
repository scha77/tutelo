---
id: T01
parent: S02
milestone: M012
key_files:
  - src/app/tutors/page.tsx
  - src/app/tutors/[category]/page.tsx
  - src/actions/profile.ts
key_decisions:
  - supabaseAdmin replaces createClient in both directory pages — safe since both query only is_published=true public data
  - revalidatePath('/tutors') calls are kept in profile.ts even though the page is dynamic — they invalidate the dynamic render cache on profile mutations
  - blocker_discovered: true because the slice contract 'ISR for /tutors' and 'filter UX still works' are mutually exclusive without an architectural change
duration: 
verification_result: passed
completed_at: 2026-04-07T05:38:46.662Z
blocker_discovered: true
---

# T01: Swapped createClient→supabaseAdmin in both directory pages and wired directory revalidatePath into profile actions; /tutors/[category] is now ISR ●, but /tutors remains Dynamic because searchParams is an independent Next.js dynamic API incompatible with ISR

**Swapped createClient→supabaseAdmin in both directory pages and wired directory revalidatePath into profile actions; /tutors/[category] is now ISR ●, but /tutors remains Dynamic because searchParams is an independent Next.js dynamic API incompatible with ISR**

## What Happened

Applied all four planned edits: (1) src/app/tutors/page.tsx — supabaseAdmin import, removed createClient instantiation, updated query, added revalidate=300; (2) src/app/tutors/[category]/page.tsx — supabaseAdmin import, removed createClient instantiation, updated query, preserved revalidate=3600 and generateStaticParams; (3) profile.ts updateProfile — added revalidatePath('/tutors'); (4) profile.ts updatePublishStatus — added revalidatePath('/tutors') and revalidatePath('/tutors/[category]', 'page'). TypeScript exits 0. Build succeeds. /tutors/[category] shows ● ISR at 1h. However /tutors shows ƒ Dynamic — not because of createClient/cookies() but because the page reads searchParams for server-side filtering (subject, grade, city, price, q), which is itself a Next.js dynamic API that unconditionally opts the route out of static generation. This is a blocker for the slice's stated goal of converting /tutors to ISR while preserving filter UX — the two requirements are mutually exclusive without an architectural change.

## Verification

npx tsc --noEmit exits 0. npm run build exits 0 in 15.7s. Build output: /tutors/[category] ● ISR 1h ✓; /tutors ƒ Dynamic (searchParams blocker). grep -r 'createClient' src/app/tutors/ returns no output (exit 1) confirming clean removal. grep -c 'revalidatePath.*tutors' src/actions/profile.ts returns 3 confirming all three revalidation calls are present.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx tsc --noEmit` | 0 | ✅ pass | 8000ms |
| 2 | `npm run build` | 0 | ✅ pass | 15700ms |
| 3 | `grep -r 'createClient' src/app/tutors/` | 1 | ✅ pass (no matches) | 50ms |
| 4 | `grep -c 'revalidatePath.*tutors' src/actions/profile.ts` | 0 | ✅ pass (count=3) | 50ms |

## Deviations

/tutors cannot be ISR because searchParams (required for filter UX) is a dynamic API in Next.js App Router, independent of supabaseAdmin. The plan's must-have 'npm run build shows both directory routes as ● ISR' cannot be fully satisfied without descoping server-side filtering.

## Known Issues

/tutors remains ƒ Dynamic. Resolution options: (1) move filtering to client-side with API route, (2) static shell + client filtering, (3) accept /tutors as dynamic and scope ISR goal to /tutors/[category] only.

## Files Created/Modified

- `src/app/tutors/page.tsx`
- `src/app/tutors/[category]/page.tsx`
- `src/actions/profile.ts`
