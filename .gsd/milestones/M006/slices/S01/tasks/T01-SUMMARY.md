---
id: T01
parent: S01
milestone: M006
key_files:
  - src/lib/nav.ts
  - src/components/dashboard/QRCodeCard.tsx
  - src/app/(dashboard)/dashboard/promote/page.tsx
key_decisions:
  - QR error correction level set to H (highest) for future logo overlay compatibility
  - Hidden 512px canvas approach for high-res download — avoids server-side rendering while giving a clean PNG
  - Promote nav entry placed before Settings to keep Settings as the last nav item
duration: ""
verification_result: passed
completed_at: 2026-03-25T05:36:05.170Z
blocker_discovered: false
---

# T01: Add /dashboard/promote page with QR code preview and high-res PNG download

**Add /dashboard/promote page with QR code preview and high-res PNG download**

## What Happened

Installed `qrcode.react`, added the "Promote" nav entry with Megaphone icon to `src/lib/nav.ts`, created the `/dashboard/promote` RSC page following the established auth pattern (getUser → query teachers → redirect), and built the `QRCodeCard` client component with visible 192px preview QR and hidden 512px canvas for high-res download.

The QRCodeCard uses `QRCodeCanvas` with error correction level "H" for future logo overlay compatibility. The download handler extracts PNG data from the hidden canvas via `toDataURL` and triggers a download with filename `tutelo-qr-{slug}.png`. The component uses `fadeSlideUp` and `microPress` animations from the shared animation library, and button styling matches the existing dashboard pattern (border, rounded-md, hover:bg-muted).

The promote page fetches `slug, full_name, subjects, hourly_rate` from the teachers table (full_name/subjects/hourly_rate will be used by FlyerPreview in T02) and renders the QRCodeCard with the teacher's slug. Layout uses `p-6 max-w-3xl space-y-8` matching other dashboard pages.

Symlinked `.env.local` and `.env` from the main project root into the worktree to enable the Next.js build (env files aren't tracked in git, so worktrees don't get them automatically).

## Verification

TypeScript compiles with no errors in new files (pre-existing test errors in bookings/email.test.ts, og-metadata.test.ts, social-email.test.ts are unrelated). Next.js build succeeds with /dashboard/promote in the route manifest. Grep confirms Megaphone import in nav.ts and QRCodeCard usage in promote page.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx tsc --noEmit (new files check)` | 0 | ✅ pass | 12100ms |
| 2 | `npm run build` | 0 | ✅ pass | 12100ms |
| 3 | `grep -q Megaphone src/lib/nav.ts` | 0 | ✅ pass | 50ms |
| 4 | `grep -q QRCodeCard src/app/(dashboard)/dashboard/promote/page.tsx` | 0 | ✅ pass | 50ms |


## Deviations

Symlinked .env.local and .env from the main project root to enable builds in the worktree — this was a worktree infrastructure gap, not a plan deviation.

## Known Issues

Pre-existing TypeScript errors in test files (bookings/email.test.ts, og-metadata.test.ts, social-email.test.ts) — not introduced by this task.

## Files Created/Modified

- `src/lib/nav.ts`
- `src/components/dashboard/QRCodeCard.tsx`
- `src/app/(dashboard)/dashboard/promote/page.tsx`
