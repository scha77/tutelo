# Requirements

This file is the explicit capability and coverage contract for the project.

## Validated

### UI-01 — Untitled
- Status: validated
- Validation: Validated by M011/S01 — HeroSection, CredentialsBar, ReviewsSection, AboutSection all rebuilt with premium visual treatment. Two-row CredentialsBar layout, taller hero banner with ring-inset avatar, inline SVG star ratings, dynamic --accent color throughout. Build passes.

### UI-02 — Untitled
- Status: validated
- Validation: Validated by M011/S02 — BookingCalendar decomposed into BookingForm, SessionTypeSelector, CalendarGrid, TimeSlotsPanel sub-components. All booking paths (direct, recurring, deferred) confirmed functional. Build passes.

### UI-03 — Untitled
- Status: validated
- Validation: Validated by M011/S03 — MobileBottomNav rebuilt with 4 labeled primary tabs + More panel. ParentMobileNav confirmed with visible text-[10px] labels on all 5 tabs. Build passes.

### UI-04 — Untitled
- Status: validated
- Validation: Validated by M011/S04 — All 11 teacher dashboard pages upgraded: premium card standard (rounded-xl border bg-card shadow-sm), avatar initial circles, empty state pattern, color-mix tinting, tracking-tight headers. Build passes.

### UI-05 — Untitled
- Status: validated
- Validation: Validated by M011/S04 — All 5 parent dashboard pages upgraded with same premium card standard as teacher dashboard. Build passes.

### UI-06 — Untitled
- Status: validated
- Validation: Validated by M011/S05 — Landing page tightening pass applied. SocialLinks always renders attribution footer regardless of teacher social links.

### UI-07 — Untitled
- Status: validated
- Validation: Validated by M011 overall — KNOWLEDGE.md documents Premium Dashboard Card Standard, Avatar Initial Circle Pattern, color-mix canonical tinting, and Premium Page Header Pattern applied consistently across all surfaces. Build passes.

### UI-08 — Untitled
- Status: validated
- Validation: Validated by M011 — All surfaces use bespoke Tutelo patterns (color-mix tinting, tracking-tight headers, custom empty states, avatar circles). No default shadcn/ui spacing or generic template patterns visible.

### UI-09 — Untitled
- Status: validated
- Validation: Validated by M011 + post-M011 perf work — nav lag eliminated (template.tsx removed, auth dedup, loading skeletons on all pages), all icons labeled, no mystery affordances. Consistent across teacher and parent surfaces.

## Traceability

| ID | Class | Status | Primary owner | Supporting | Proof |
|---|---|---|---|---|---|
| PERF-02 |  | partially-advanced | none | none | Partial: /tutors/[category] confirmed ISR in build output (● 1h). /tutors correctly dynamic (searchParams). Code ready for future architectural pivot (supabaseAdmin in place, revalidate export declared, revalidation wiring complete)." |
| UI-01 |  | validated | none | none | Validated by M011/S01 — HeroSection, CredentialsBar, ReviewsSection, AboutSection all rebuilt with premium visual treatment. Two-row CredentialsBar layout, taller hero banner with ring-inset avatar, inline SVG star ratings, dynamic --accent color throughout. Build passes. |
| UI-02 |  | validated | none | none | Validated by M011/S02 — BookingCalendar decomposed into BookingForm, SessionTypeSelector, CalendarGrid, TimeSlotsPanel sub-components. All booking paths (direct, recurring, deferred) confirmed functional. Build passes. |
| UI-03 |  | validated | none | none | Validated by M011/S03 — MobileBottomNav rebuilt with 4 labeled primary tabs + More panel. ParentMobileNav confirmed with visible text-[10px] labels on all 5 tabs. Build passes. |
| UI-04 |  | validated | none | none | Validated by M011/S04 — All 11 teacher dashboard pages upgraded: premium card standard (rounded-xl border bg-card shadow-sm), avatar initial circles, empty state pattern, color-mix tinting, tracking-tight headers. Build passes. |
| UI-05 |  | validated | none | none | Validated by M011/S04 — All 5 parent dashboard pages upgraded with same premium card standard as teacher dashboard. Build passes. |
| UI-06 |  | validated | none | none | Validated by M011/S05 — Landing page tightening pass applied. SocialLinks always renders attribution footer regardless of teacher social links. |
| UI-07 |  | validated | none | none | Validated by M011 overall — KNOWLEDGE.md documents Premium Dashboard Card Standard, Avatar Initial Circle Pattern, color-mix canonical tinting, and Premium Page Header Pattern applied consistently across all surfaces. Build passes. |
| UI-08 |  | validated | none | none | Validated by M011 — All surfaces use bespoke Tutelo patterns (color-mix tinting, tracking-tight headers, custom empty states, avatar circles). No default shadcn/ui spacing or generic template patterns visible. |
| UI-09 |  | validated | none | none | Validated by M011 + post-M011 perf work — nav lag eliminated (template.tsx removed, auth dedup, loading skeletons on all pages), all icons labeled, no mystery affordances. Consistent across teacher and parent surfaces. |

## Coverage Summary

- Active requirements: 0
- Mapped to slices: 0
- Validated: 9 (UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07, UI-08, UI-09)
- Unmapped active requirements: 0
