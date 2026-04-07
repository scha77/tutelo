---
estimated_steps: 51
estimated_files: 1
skills_used: []
---

# T03: Register M010–M012 requirements, update existing entries, validate R005

Register 17 new M010/M012 requirements, update 10 existing entries (UI-01–UI-09 descriptions + PERF-02), and validate R005. No code changes — only GSD tool calls.

## Part 1: New Requirements (17 entries)

Use `gsd_requirement_save` for each.

### M010 — Parent Features, Messaging, Admin, Auth (14 entries)

**PARENT (6) — class: functional — why: "Parent experience drives retention" — source: M010**
- PARENT-04: Multi-child management (CRUD) — validation: "Validated in M010 — multi-child management CRUD"
- PARENT-05: Saved payment methods (Stripe Customer per parent) — validation: "Validated in M010 — saved payment methods via Stripe Customer per parent"
- PARENT-06: Real-time teacher-parent messaging — validation: "Validated in M010 — real-time teacher-parent messaging"
- PARENT-07: Auth-guarded parent dashboard — validation: "Validated in M010 — auth-guarded parent dashboard"
- PARENT-08: Child selector in booking calendar — validation: "Validated in M010 — child selector in booking calendar"
- PARENT-09: Parent-level Stripe Customer — validation: "Validated in M010 — parent-level Stripe Customer"

**MSG (3) — class: functional — why: "Communication channel between teacher and parent" — source: M010**
- MSG-01: One-thread-per-pair messaging — validation: "Validated in M010 — one-thread-per-pair messaging"
- MSG-02: Real-time messages via Supabase Realtime — validation: "Validated in M010 — real-time messages via Supabase Realtime"
- MSG-03: New message email notification with rate limiting — validation: "Validated in M010 — new message email notification with rate limiting"

**ADMIN (3) — class: operability — why: "Platform operator visibility" — source: M010**
- ADMIN-01: Admin metrics dashboard — validation: "Validated in M010 — admin metrics dashboard"
- ADMIN-02: Admin activity feed — validation: "Validated in M010 — admin activity feed"
- ADMIN-04: Admin access gate (notFound for non-admins) — validation: "Validated in M010 — admin access gate using notFound() for non-admins"

**AUTH (2) — class: functional — why: "Authentication completeness" — source: M010**
- AUTH-03: Google SSO working end-to-end — validation: "Validated in M010 — Google SSO working end-to-end"
- AUTH-04: School email verification is provider-agnostic — validation: "Validated in M010 — school email verification is provider-agnostic"

### M012 — Performance (3 entries)

**PERF (3) — class: non-functional — why: "Page load performance and caching" — source: M012 — status: validated**
- PERF-01: Profile page ISR with on-demand revalidation — validation: "Validated in M012 — profile page ISR with on-demand revalidation"
- PERF-06: ISR within Vercel Hobby plan limits — validation: "Validated in M012 — ISR within Vercel Hobby plan limits"
- PERF-07: On-demand revalidation via revalidatePath — validation: "Validated in M012 — on-demand revalidation via revalidatePath"

## Part 2: Update Existing Entries (11 updates)

Use `gsd_requirement_update` for each. Only provide the fields that need changing.

### UI-01 through UI-09 — Add proper descriptions (currently say "Untitled")

For each, call `gsd_requirement_update` with `id` and `description`:
- UI-01: description="Teacher profile page premium visual treatment (hero, credentials, reviews, about)", class="quality-attribute", primary_owner="M011/S01"
- UI-02: description="BookingCalendar decomposed into sub-components", class="quality-attribute", primary_owner="M011/S02"
- UI-03: description="Mobile navigation: labeled primary tabs + More panel", class="quality-attribute", primary_owner="M011/S03"
- UI-04: description="All 11 teacher dashboard pages premium card standard", class="quality-attribute", primary_owner="M011/S04"
- UI-05: description="All 5 parent dashboard pages premium card standard", class="quality-attribute", primary_owner="M011/S04"
- UI-06: description="Landing page tightening (footer, hero badge, responsive nav)", class="quality-attribute", primary_owner="M011/S05"
- UI-07: description="Design patterns documented (card standard, avatar circles, tinting, headers)", class="quality-attribute", primary_owner="M011"
- UI-08: description="Bespoke Tutelo patterns replace generic shadcn/ui defaults", class="quality-attribute", primary_owner="M011"
- UI-09: description="Nav lag eliminated, all icons labeled, consistent across surfaces", class="quality-attribute", primary_owner="M011"

### PERF-02 — Update description and class
- PERF-02: description="Directory pages ISR with on-demand revalidation", class="non-functional", primary_owner="M012", why="Page load performance for directory browsing"

### R005 — Mark as validated
- R005: status="validated", validation="REQUIREMENTS.md contains 150 entries with stable IDs, ownership traceability, and coverage summary. All M001–M012 capabilities documented."

## Steps

1. Call `gsd_requirement_save` for each of the 17 new requirements (M010: 14, M012: 3).
2. Call `gsd_requirement_update` for each of the 11 existing entries (UI-01–UI-09, PERF-02, R005).
3. Verify final state:
   - `grep -c '^### ' .gsd/REQUIREMENTS.md` returns >= 146
   - `grep -c 'Untitled' .gsd/REQUIREMENTS.md` returns 0
   - Confirm R005 status shows "validated" in REQUIREMENTS.md

## Inputs

- `.gsd/REQUIREMENTS.md`

## Expected Output

- `.gsd/REQUIREMENTS.md`

## Verification

grep -c '^### ' .gsd/REQUIREMENTS.md returns >= 146 AND grep -c 'Untitled' .gsd/REQUIREMENTS.md returns 0
