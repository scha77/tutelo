# M005: Trust & Communication — Context

**Gathered:** 2026-03-11
**Status:** Pending (depends on M004)

## Project Description

Tutelo needs two capabilities that require significant research before committing to an approach: (1) a teacher verification system so parents can trust that the person they're booking is a real current or former teacher, and (2) SMS notifications for session reminders and last-minute cancellation alerts. Both involve external service integrations, ongoing costs, and regulatory considerations.

## Why This Milestone

Trust is central to Tutelo's value prop — parents are trusting strangers with their children's education. Currently, teacher credentials are entirely self-reported. As the platform scales beyond the founder's personal network, some form of verification becomes necessary. Similarly, email-only notifications have lower engagement than SMS — text reminders reduce no-shows and last-minute texts reach parents faster than email.

## User-Visible Outcome

### When this milestone is complete, the user can:

- See a "Verified Teacher" badge on teacher profiles that have passed identity/credential verification
- Receive text message reminders before sessions (both teacher and parent)
- Receive a text message immediately when a teacher cancels last-minute
- Trust that the platform has a real verification step, not just self-reported credentials

### Entry point / environment

- Entry point: https://tutelo.app (various surfaces)
- Environment: Vercel production
- Live dependencies: SMS provider (Twilio or similar), verification service (TBD), Supabase

## Completion Class

- Contract complete means: verification flow works end-to-end, SMS sends and delivers, phone numbers collected with opt-in consent
- Integration complete means: verified badge appears on teacher profiles, SMS reminders fire on schedule, cancellation SMS delivers
- Operational complete means: deployed to production, SMS costs are manageable, verification service is operational

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- A teacher completes the verification flow and their profile shows a "Verified" badge
- A parent receives a text message reminder 24 hours before a session
- A teacher triggers a last-minute cancellation and the parent receives a text within seconds
- Phone number collection includes proper opt-in consent

## Risks and Unknowns

- **Teacher verification — no turnkey API** — State licensing databases are fragmented across 50 states. Most "verification" services (Checkr, Sterling) target employment/background checks, not teacher credential confirmation. May need a manual or semi-automated approach.
- **SMS costs** — Twilio charges ~$0.0079/segment for US SMS. At scale this adds up, but at MVP scale it's negligible. The real cost is the phone number ($1/month).
- **Phone number collection** — Need to collect phone numbers from both teachers and parents. Parents currently don't even create accounts for booking requests. Requires UX changes.
- **SMS opt-in compliance** — TCPA requires explicit opt-in consent for promotional/transactional SMS. Must be handled correctly.
- **Verification approach** — Options range from manual review (founder checks credentials) to school email domain verification to API-based credential checks. Need research to determine the right approach.

## Existing Codebase / Prior Art

- `src/lib/email.ts` — Email notification infrastructure (Resend). SMS would follow a similar pattern.
- `src/emails/` — React Email templates. SMS templates would be plain text.
- `src/app/api/cron/session-reminders/route.ts` — Existing email reminder cron. SMS reminders would extend this.
- `supabase/migrations/0001_initial_schema.sql` — teachers table has no phone number or verification status columns yet.

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions.

## Relevant Requirements

- VERIFY-01 — Teacher identity verification system
- SMS-01 — SMS session reminders
- SMS-02 — SMS last-minute cancellation alerts
- CANCEL-02 — Teacher last-minute cancellation via text

## Scope

### In Scope

- Research and select teacher verification approach
- Implement verification flow (whatever approach is chosen)
- "Verified Teacher" badge on profile pages
- SMS provider integration (Twilio or alternative)
- Phone number collection (teacher onboarding + parent booking form)
- SMS opt-in consent UI and storage
- SMS session reminders (extend existing cron)
- SMS last-minute cancellation alerts (extend CANCEL-01 from M004)

### Out of Scope / Non-Goals

- Marketing SMS (only transactional — reminders, cancellations)
- Two-way SMS conversations
- WhatsApp or other messaging platforms
- Background checks (criminal, etc.) — only credential/identity verification
- Automated credential verification via state databases (too fragmented — research may prove this feasible, but don't assume it)

## Technical Constraints

- TCPA compliance required for SMS — explicit opt-in, easy opt-out
- Twilio or similar requires account setup and phone number provisioning
- Teacher verification approach depends on research findings — do not pre-commit to a technical solution
- Phone number must be optional — cannot break existing flows for users who don't provide one

## Open Questions

- **Verification approach** — Manual founder review? School email domain check? Third-party API? State board lookup? Research needed.
- **SMS provider** — Twilio is the default choice but alternatives (MessageBird, Vonage) may offer better pricing or DX.
- **Phone number collection UX** — Add to onboarding? Ask on first booking? Separate settings page?
- **Parent phone numbers** — Parents currently book without accounts. Where in the flow do we ask for their phone number?
