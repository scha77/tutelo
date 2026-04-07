# S02: Sentry Integration & Error Handling Audit

**Goal:** Integrate Sentry SDK for client + server error tracking. Audit all 46 catch blocks to ensure none silently swallow errors.
**Demo:** After this: Trigger a deliberate error in dev → appears in Sentry dashboard with stack trace and request context. All catch blocks either re-throw, report to Sentry, or log with structured context.

## Tasks
