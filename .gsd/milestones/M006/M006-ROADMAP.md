# M006: Growth Tools

**Vision:** Give teachers zero-friction promotion tools — QR codes for print materials, pre-written announcement templates for digital sharing, and verified social preview cards — so they can actively promote their Tutelo pages without decision fatigue.

## Success Criteria

- Teacher can download a QR code PNG that scans to their tutelo.app/[slug] URL
- Teacher can download a styled mini-flyer with QR code, name, subjects, rate, and CTA
- Teacher can copy at least 4 pre-written announcement templates interpolated with their profile data
- Copy-to-clipboard works with confirmation micro-interaction on all templates
- Teacher's Tutelo link unfurls into a professional preview card in iMessage, WhatsApp, and Facebook
- Build passes with no regressions on existing test suite

## Slices

- [x] **S01: QR Code & Mini-Flyer** `risk:low` `depends:[]`
  > After this: Teacher opens /dashboard/promote, sees their QR code preview, downloads high-res PNG, and downloads a styled mini-flyer with their name, subjects, rate, and QR code.

- [x] **S02: Copy-Paste Swipe File** `risk:low` `depends:[]`
  > After this: Teacher opens the promote page, sees 4+ pre-written announcement templates with their data filled in, clicks copy, and pastes the text into their email client or social media.

- [x] **S03: OG Image Platform Verification** `risk:low` `depends:[]`
  > After this: Teacher's Tutelo link pasted into iMessage, WhatsApp, and Facebook shows a professional preview card with their name, photo, subjects, and Tutelo branding.

## Boundary Map

### S01 → S02

Produces:
- `src/app/(dashboard)/dashboard/promote/page.tsx` — Dashboard promote page shell (QR + flyer sections)
- `src/components/dashboard/QRCodeCard.tsx` — QR code preview + download component
- `src/components/dashboard/FlyerPreview.tsx` — Mini-flyer preview + download component
- Established pattern for "promote" dashboard section and download interactions

Consumes:
- nothing (first slice)

### S01 → S03

Produces:
- Dashboard promote page shell at /dashboard/promote

Consumes:
- nothing (first slice)

### S02 → S03

Produces:
- `src/components/dashboard/SwipeFileCard.tsx` — Template card with copy-to-clipboard
- `src/lib/templates.ts` — Template definitions and interpolation logic
- Copy-to-clipboard pattern with "Copied!" micro-interaction

Consumes from S01:
- Dashboard promote page shell (adds swipe file section to same page or sibling route)
