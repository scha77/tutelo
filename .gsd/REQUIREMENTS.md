# Requirements

This file is the explicit capability and coverage contract for the project.

## Active

### R001 — Test Suite Fully Green
- Class: quality-attribute
- Status: active
- Description: All test files pass with 0 failures. No mock drift, no stale assertions.
- Why it matters: A red test suite masks real regressions and erodes confidence in the verification layer.
- Source: execution
- Primary owning slice: M013/S01
- Supporting slices: M013/S03
- Validation: unmapped
- Notes: 14 failures across 4 files (admin-dashboard, messaging, parent-phone-storage, recurring-charges). Root causes are mock drift from cross-milestone changes.

### R002 — Sentry Error Tracking Integrated
- Class: operability
- Status: active
- Description: Sentry SDK captures client-side and server-side errors with stack traces, breadcrumbs, and source maps. Error boundaries report to Sentry before rendering fallback UI.
- Why it matters: Production errors are currently invisible unless a user reports them. Console.error is not monitoring.
- Source: user
- Primary owning slice: M013/S02
- Supporting slices: none
- Validation: unmapped
- Notes: Free tier sufficient for current traffic. No PII in error payloads.

### R003 — No Swallowed Errors in Production Catch Blocks
- Class: failure-visibility
- Status: active
- Description: Every catch block in production code either re-throws, reports to Sentry, or logs with structured context. No empty catch blocks, no catch-and-ignore patterns.
- Why it matters: Silent failures are the hardest bugs to diagnose. A catch block without reporting is a hole in observability.
- Source: inferred
- Primary owning slice: M013/S02
- Supporting slices: none
- Validation: unmapped
- Notes: 46 catch blocks in production code. Audit each for appropriate error handling.

### R004 — Test Stub Audit Complete
- Class: quality-attribute
- Status: active
- Description: All 45 it.todo() stubs in tests/ directory resolved — either deleted (if covered by src/__tests__/) or converted to real passing tests.
- Why it matters: Orphaned stubs create false confidence about coverage and clutter the test report.
- Source: user
- Primary owning slice: M013/S03
- Supporting slices: none
- Validation: unmapped
- Notes: 11 test files with todo stubs across tests/bookings/, tests/stripe/, tests/auth/, tests/onboarding/, tests/unit/.

### R005 — Full Capability Contract in REQUIREMENTS.md
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

### UI-01 — Teacher Profile Premium Visual Treatment
- Class: quality-attribute
- Status: validated
- Validation: Validated by M011/S01 — HeroSection, CredentialsBar, ReviewsSection, AboutSection all rebuilt with premium visual treatment.

### UI-02 — Booking Calendar Decomposition
- Class: quality-attribute
- Status: validated
- Validation: Validated by M011/S02 — BookingCalendar decomposed into BookingForm, SessionTypeSelector, CalendarGrid, TimeSlotsPanel sub-components.

### UI-03 — Mobile Navigation Overhaul
- Class: quality-attribute
- Status: validated
- Validation: Validated by M011/S03 — MobileBottomNav rebuilt with 4 labeled primary tabs + More panel.

### UI-04 — Teacher Dashboard Polish
- Class: quality-attribute
- Status: validated
- Validation: Validated by M011/S04 — All 11 teacher dashboard pages upgraded with premium card standard.

### UI-05 — Parent Dashboard Polish
- Class: quality-attribute
- Status: validated
- Validation: Validated by M011/S04 — All 5 parent dashboard pages upgraded with same premium card standard.

### UI-06 — Landing Page Tightening
- Class: quality-attribute
- Status: validated
- Validation: Validated by M011/S05 — Landing page tightening pass applied. SocialLinks always renders attribution footer.

### UI-07 — Design System Documentation
- Class: quality-attribute
- Status: validated
- Validation: Validated by M011 — KNOWLEDGE.md documents Premium Dashboard Card Standard, Avatar Initial Circle Pattern, color-mix canonical tinting, and Premium Page Header Pattern.

### UI-08 — Bespoke Visual Identity
- Class: quality-attribute
- Status: validated
- Validation: Validated by M011 — All surfaces use bespoke Tutelo patterns. No default shadcn/ui spacing or generic template patterns.

### UI-09 — Responsive Navigation & Performance
- Class: quality-attribute
- Status: validated
- Validation: Validated by M011 + post-M011 perf work — nav lag eliminated, all icons labeled, consistent across teacher and parent surfaces.

## Traceability

| ID | Class | Status | Primary owner | Supporting | Proof |
|---|---|---|---|---|---|
| R001 | quality-attribute | active | M013/S01 | M013/S03 | unmapped |
| R002 | operability | active | M013/S02 | none | unmapped |
| R003 | failure-visibility | active | M013/S02 | none | unmapped |
| R004 | quality-attribute | active | M013/S03 | none | unmapped |
| R005 | operability | active | M013/S04 | none | unmapped |
| UI-01 | quality-attribute | validated | M011/S01 | none | validated |
| UI-02 | quality-attribute | validated | M011/S02 | none | validated |
| UI-03 | quality-attribute | validated | M011/S03 | none | validated |
| UI-04 | quality-attribute | validated | M011/S04 | none | validated |
| UI-05 | quality-attribute | validated | M011/S04 | none | validated |
| UI-06 | quality-attribute | validated | M011/S05 | none | validated |
| UI-07 | quality-attribute | validated | M011 | none | validated |
| UI-08 | quality-attribute | validated | M011 | none | validated |
| UI-09 | quality-attribute | validated | M011 | none | validated |

## Coverage Summary

- Active requirements: 5
- Mapped to slices: 5
- Validated: 9
- Unmapped active requirements: 0
