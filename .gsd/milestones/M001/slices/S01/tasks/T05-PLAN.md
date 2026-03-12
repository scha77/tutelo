# T05: 01-foundation 05

**Slice:** S01 — **Milestone:** M001

## Description

Build the public teacher profile page (/[slug]) and the teacher dashboard (Page, Availability, Settings sections) — completing all PAGE-*, CUSTOM-*, AVAIL-*, VIS-*, and DASH-06 requirements.

Purpose: This is the public face of Tutelo — what a parent sees when clicking a teacher's link. It is also the end-to-end proof that the platform works: teacher onboards, publishes, shares link, parent sees a professional page.

Output: Fully rendered public profile page with hero, credentials bar, about, availability grid (timezone-converted), and Book Now CTA. Dashboard with sidebar navigation, page customization panel, availability editor, and Active/Draft toggle.

## Must-Haves

- [ ] "Visiting /[slug] renders the teacher's public profile page"
- [ ] "Hero section shows banner image (or accent color fallback) + circular avatar + name + tagline"
- [ ] "Credentials bar shows verified teacher badge, years experience, subjects, grade levels"
- [ ] "About section shows teacher's bio (auto-generated if blank)"
- [ ] "Availability section shows weekly grid with times in visitor's local timezone"
- [ ] "Book Now sticky CTA is visible at all times on mobile, scrolls to #availability on click"
- [ ] "Teacher's accent color is applied as CSS custom property throughout the page"
- [ ] "Visiting a Draft page shows graceful 'not available' message — NOT a 404"
- [ ] "preview=true query param bypasses the draft gate (for Step 3 preview)"
- [ ] "Dashboard renders with left sidebar (Page | Availability | Settings)"
- [ ] "Page section has Active/Draft toggle at top + all CUSTOM-* fields"
- [ ] "Availability section shows editable weekly grid"
- [ ] "Saving CUSTOM-* fields updates teachers table and reflects on public page immediately"

## Files

- `src/app/[slug]/page.tsx`
- `src/components/profile/HeroSection.tsx`
- `src/components/profile/CredentialsBar.tsx`
- `src/components/profile/AboutSection.tsx`
- `src/components/profile/AvailabilityGrid.tsx`
- `src/components/profile/BookNowCTA.tsx`
- `src/lib/utils/bio.ts`
- `src/lib/utils/timezone.ts`
- `src/app/(dashboard)/dashboard/layout.tsx`
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/dashboard/page/page.tsx`
- `src/app/(dashboard)/dashboard/availability/page.tsx`
- `src/app/(dashboard)/dashboard/settings/page.tsx`
- `src/components/dashboard/Sidebar.tsx`
- `src/components/dashboard/PageSettings.tsx`
- `src/components/dashboard/AvailabilityEditor.tsx`
- `src/actions/profile.ts`
- `src/actions/availability.ts`
- `tests/utils/bio.test.ts`
- `tests/availability/timezone.test.ts`
- `tests/profile/draft-visibility.test.ts`
- `tests/profile/slug-page.test.ts`
