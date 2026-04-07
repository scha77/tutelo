# Requirements

This file is the explicit capability and coverage contract for the project.

## Active

### R002 — Sentry SDK captures client-side and server-side errors with stack traces, breadcrumbs, and source maps. Error boundaries report to Sentry before rendering fallback UI.
- Class: operability
- Status: active
- Description: Sentry SDK captures client-side and server-side errors with stack traces, breadcrumbs, and source maps. Error boundaries report to Sentry before rendering fallback UI.
- Why it matters: Production errors are currently invisible unless a user reports them. Console.error is not monitoring.
- Source: user
- Primary owning slice: M013/S02
- Supporting slices: none
- Validation: unmapped
- Notes: Free tier sufficient for current traffic. No PII in error payloads.

### R003 — Every catch block in production code either re-throws, reports to Sentry, or logs with structured context. No empty catch blocks, no catch-and-ignore patterns.
- Class: failure-visibility
- Status: active
- Description: Every catch block in production code either re-throws, reports to Sentry, or logs with structured context. No empty catch blocks, no catch-and-ignore patterns.
- Why it matters: Silent failures are the hardest bugs to diagnose. A catch block without reporting is a hole in observability.
- Source: inferred
- Primary owning slice: M013/S02
- Supporting slices: none
- Validation: unmapped
- Notes: 46 catch blocks in production code. Audit each for appropriate error handling.

### R004 — All 45 it.todo() stubs in tests/ directory resolved — either deleted (if covered by src/__tests__/) or converted to real passing tests.
- Class: quality-attribute
- Status: active
- Description: All 45 it.todo() stubs in tests/ directory resolved — either deleted (if covered by src/__tests__/) or converted to real passing tests.
- Why it matters: Orphaned stubs create false confidence about coverage and clutter the test report.
- Source: user
- Primary owning slice: M013/S03
- Supporting slices: none
- Validation: unmapped
- Notes: 11 test files with todo stubs across tests/bookings/, tests/stripe/, tests/auth/, tests/onboarding/, tests/unit/.

### R005 — REQUIREMENTS.md documents all 124+ validated capabilities from M001–M012 with stable IDs, ownership, and traceability table.
- Class: operability
- Status: active
- Description: REQUIREMENTS.md documents all 124+ validated capabilities from M001–M012 with stable IDs, ownership, and traceability table.
- Why it matters: The capability contract was hollowed out during M011 restructuring. Without it, there's no single source of truth for what the product can do.
- Source: user
- Primary owning slice: M013/S04
- Supporting slices: none
- Validation: unmapped
- Notes: Rebuild from milestone summaries in PROJECT.md and .gsd/DECISIONS.md.

## Validated

### R001 — All test files pass with 0 failures. No mock drift, no stale assertions.
- Class: quality-attribute
- Status: validated
- Description: All test files pass with 0 failures. No mock drift, no stale assertions.
- Why it matters: A red test suite masks real regressions and erodes confidence in the verification layer.
- Source: execution
- Primary owning slice: M013/S01
- Supporting slices: M013/S03
- Validation: 48 test files pass, 470 tests pass, 0 failures. All 14 failures across 4 files (admin-dashboard, messaging, parent-phone-storage, recurring-charges) resolved via mock realignment. Verified by `npx vitest run` on 2026-04-07.
- Notes: Root causes were mock drift from M010-M012 code changes: (1) admin layout switched auth import chain, (2) conversations route refactored to batch query, (3) parent-phone-storage added slug revalidation, (4) recurring-charges idempotencyKey format changed.

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
| PERF-02 |  | partially-advanced | none | none | Partial: /tutors/[category] confirmed ISR in build output (● 1h). /tutors correctly dynamic (searchParams Next.js constraint, D059). supabaseAdmin in place, revalidation wiring complete, ready for client-side filtering pivot. M012 complete. |
| R001 | quality-attribute | validated | M013/S01 | M013/S03 | 48 test files pass, 470 tests pass, 0 failures. All 14 failures across 4 files (admin-dashboard, messaging, parent-phone-storage, recurring-charges) resolved via mock realignment. Verified by `npx vitest run` on 2026-04-07. |
| R002 | operability | active | M013/S02 | none | unmapped |
| R003 | failure-visibility | active | M013/S02 | none | unmapped |
| R004 | quality-attribute | active | M013/S03 | none | unmapped |
| R005 | operability | active | M013/S04 | none | unmapped |
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

- Active requirements: 4
- Mapped to slices: 4
- Validated: 10 (R001, UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07, UI-08, UI-09)
- Unmapped active requirements: 0
