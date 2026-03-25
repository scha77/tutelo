# M006: Growth Tools

**Gathered:** 2026-03-25
**Status:** Ready for planning

## Project Description

Tutelo is live in production with 85 validated requirements. Teachers can create professional tutoring pages, manage availability, accept bookings with payments, and communicate via email/SMS. The next step is giving teachers the tools to actively promote their pages — QR codes for print materials, pre-written announcement templates, and verified social preview cards.

## Why This Milestone

Teachers have professional pages but limited tools to promote them. Education is paper-heavy (take-home folders, back-to-school flyers, syllabi), and teachers experience decision fatigue by 3:30 PM — they need zero-friction promotion tools. This milestone gives them: a downloadable QR code and printable flyer, copy-paste announcement scripts, and verified social link previews.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Download a QR code PNG and a print-ready mini-flyer from their dashboard
- Copy pre-written announcement templates (email sig, newsletter, social post, handout) with one click
- Share their Tutelo link in iMessage, WhatsApp, and Facebook and see it unfurl into a professional preview card

### Entry point / environment

- Entry point: Teacher dashboard at /dashboard
- Environment: Production (tutelo.app) or local dev
- Live dependencies involved: None — all features are client-side or use existing data

## Completion Class

- Contract complete means: QR code generates correct URL, templates interpolate teacher data, copy-to-clipboard works, flyer renders with teacher info
- Integration complete means: OG image renders correctly across at least 3 platforms (iMessage, WhatsApp, Facebook)
- Operational complete means: None — no new services or crons

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- A teacher with a complete profile can download a QR code that, when scanned, navigates to their tutelo.app/[slug] page
- The same teacher can download a styled mini-flyer with their name, subjects, rate, and QR code
- The teacher can copy at least 4 different announcement templates, each interpolated with their real profile data
- The teacher's Tutelo link produces a professional preview card when pasted into iMessage or WhatsApp

## Risks and Unknowns

- OG image rendering varies by platform — WhatsApp and iMessage have different cache behaviors and image requirements. May need platform-specific debugging.
- Mini-flyer PDF/PNG generation on client side — html2canvas or server-side rendering may have quality/font issues.

## Existing Codebase / Prior Art

- `src/app/[slug]/opengraph-image.tsx` — Existing edge-runtime OG image generation with teacher photo, name, subjects, brand colors
- `src/app/[slug]/page.tsx` — generateMetadata() with dynamic OG meta tags
- `src/components/dashboard/PageSettings.tsx` — Dashboard page customization (accent color, headline, social links)
- `src/app/(dashboard)/dashboard/page.tsx` — Dashboard home with StatsBar, upcoming sessions
- `src/app/(dashboard)/dashboard/requests/CopyLinkButton.tsx` — Existing copy-to-clipboard pattern

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions.

## Relevant Requirements

- QR-01 — QR code download from dashboard
- QR-02 — Printable mini-flyer with QR + teacher data
- SWIPE-01 — Pre-written announcement templates with interpolation
- SWIPE-02 — One-click copy-to-clipboard
- OG-01 — OG image verified across major platforms

## Scope

### In Scope

- QR code generation and high-res PNG download
- Printable mini-flyer template (QR + teacher name + subjects + rate + CTA)
- 4+ copy-paste announcement templates (email signature, newsletter blurb, social post, handout text)
- Copy-to-clipboard with confirmation micro-interaction
- OG image platform verification and fixes
- Dashboard UI for all three tools

### Out of Scope / Non-Goals

- PDF generation (PNG is sufficient for flyer; PDF is a future enhancement)
- Custom QR code styling (colored/logo QR codes — standard black/white is fine for now)
- Video previews or animated OG content
- Analytics on QR code scans (that's M008 analytics territory)

## Technical Constraints

- QR code library must work client-side in React (next-qrcode or similar)
- OG image must work in edge runtime (existing opengraph-image.tsx constraint)
- No new database tables or migrations needed
- Must follow existing dashboard UI patterns (shadcn/ui, 4pt grid, max 24px font size)

## Integration Points

- Existing teacher profile data (slug, full_name, subjects, hourly_rate, photo_url) — read-only consumption
- Existing CopyLinkButton pattern in requests page — reuse for swipe file
- Existing opengraph-image.tsx — verify and fix, not rebuild

## Open Questions

- Mini-flyer rendering approach: html2canvas for client-side PNG capture vs. a server-side Next.js ImageResponse route? Leaning toward ImageResponse for consistent quality — same approach as opengraph-image.tsx.
