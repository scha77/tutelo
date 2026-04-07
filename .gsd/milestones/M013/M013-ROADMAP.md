# M013: Codebase Cohesion & Observability

## Vision
Bring the codebase from 'features work' to 'codebase is maintainable and observable.' Fix all broken tests, integrate Sentry error tracking, audit and resolve all test stubs, and rebuild the full capability contract. No new features, no UI changes, no schema migrations.

## Slice Overview
| ID | Slice | Risk | Depends | Done | After this |
|----|-------|------|---------|------|------------|
| S01 | Fix Broken Tests | low | — | ✅ | npx vitest run shows 0 failures across all test files. |
| S02 | Sentry Integration & Error Handling Audit | medium | — | ✅ | Trigger a deliberate error in dev → appears in Sentry dashboard with stack trace and request context. All catch blocks either re-throw, report to Sentry, or log with structured context. |
| S03 | Test Stub Audit & Cleanup | medium | — | ✅ | npx vitest run shows 0 todo stubs. Every test either passes or was deliberately removed with justification. |
| S04 | Requirements Rebuild | low | — | ⬜ | REQUIREMENTS.md contains 124+ validated requirements with stable IDs, ownership traceability, and coverage summary. |
