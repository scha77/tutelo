# Phase 1: Foundation - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

A teacher can complete onboarding, publish a live customized public page at their vanity URL, and a visitor can see their availability — all with no payment setup required. Booking, payments, and the teacher dashboard (beyond page management) are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Onboarding wizard flow
- 3 steps: Step 1 = Identity (name, school, city/state, photo, years experience); Step 2 = Teaching (subjects, grade range, hourly rate with local benchmarks); Step 3 = Availability + publish
- Slug auto-generated from teacher name (e.g. "Sarah Johnson" → `sarah-johnson`), shown on Step 3, teacher can edit before publishing; collisions resolved with suffix (-2, -3)
- Preview link on Step 3: opens `/[slug]?preview=true` in a new tab before committing to publish
- Wizard progress saved to DB as teacher advances; if they abandon and return, they resume at the step they left off

### Public profile page layout
- Section order (top to bottom): Hero → Credentials bar → About → Availability → Reviews → Book Now footer
- Hero above the fold on mobile: banner image (or accent color if none) + circular avatar overlapping + name + tagline + sticky Book Now at bottom of screen
- Reviews section hidden entirely in Phase 1 (no empty state, no placeholder) — section renders only once the first review exists (Phase 5)
- Availability displayed as a weekly grid: days as columns, time blocks as rows; stacks to day-by-day list on mobile
- All availability times displayed in the visitor's browser timezone (converted from teacher's stored IANA timezone)

### Book Now CTA
- Phase 1 behavior: clicking "Book Now" scrolls to the availability section (anchor link) — no modal, no "coming soon"
- Label: plain "Book Now" — no rate shown on button, no secondary text
- Visibility: sticky bottom bar on mobile; fixed sidebar panel on desktop (scrolls with page or fixed position)
- Phase 2 wires the same CTA to the booking form — no label or layout change needed between phases

### Dashboard structure
- Layout: left sidebar nav + main content area (standard SaaS pattern — extensible as Phase 2–5 add sections)
- Phase 1 sidebar sections: Page | Availability | Settings
  - Page: Active/Draft toggle at the top + all CUSTOM-* fields (accent color, headline, banner image, social links)
  - Availability: weekly schedule editor (AVAIL-01)
  - Settings: account/profile editing
- Active/Draft toggle lives at the top of the Page section — prominent but not globally persistent
- Post-publish flow: wizard redirects to `/dashboard` automatically; shareable URL shown as a banner/toast on first dashboard visit

### Claude's Discretion
- Exact accent color palette (5–6 colors from CUSTOM-01 — specific colors not specified)
- Avatar fallback when no photo uploaded (initials-based, color derived from accent or name hash)
- Slug generation algorithm details (capitalize-friendly names, special character handling)
- Loading/skeleton states throughout
- Toast/notification styling
- Mobile availability grid interaction details (scroll behavior, slot highlight)

</decisions>

<specifics>
## Specific Ideas

- The "7 minutes to live page" promise is core — onboarding wizard should feel fast and low-friction; avoid optional fields that slow teachers down on first pass
- Vanity URL (`tutelo.app/ms-johnson`) is a core value prop — the slug edit experience on Step 3 should feel deliberate and memorable, not buried
- The post-publish share URL moment (shown as dashboard banner/toast) is the emotional peak of onboarding — make it easy to copy and share

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- Tech stack is locked: Next.js 16 App Router, Tailwind v4 (CSS-first `@theme`, no `tailwind.config.js`), shadcn/ui, Supabase (`@supabase/ssr`), React Hook Form + Zod, date-fns + date-fns-tz
- `proxy.ts` (not `middleware.ts`) — Next.js 16 breaking change; required from project setup
- All timestamps as `timestamptz`; IANA timezone column (`TEXT NOT NULL`) on `teachers` table
- `supabase.auth.getUser()` not `getSession()`; RLS enabled on all tables from day one
- Supabase Storage for profile photos and banner images

### Integration Points
- `/[slug]` — public profile page (RSC); reads from `teachers` table + availability
- `/dashboard` — protected route; teacher-only
- `/onboarding` — multi-step wizard; creates teacher record + availability
- `proxy.ts` — session handling for all protected routes

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-03*
