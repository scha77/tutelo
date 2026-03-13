---
id: S01
parent: M002
milestone: M002
provides:
  - Live Vercel deployment at tutelo.app and tutelo.vercel.app
  - All 10 env vars configured on Vercel production
  - All 6 Supabase migrations applied to remote project
  - Two Stripe webhook destinations registered (platform + connected accounts)
  - Custom domain tutelo.app active
  - Cron jobs configured (daily frequency for Hobby plan)
requires: []
affects: []
key_files: []
key_decisions:
  - "Daily cron frequency for Hobby plan — auto-cancel runs at 9 AM UTC, reminders at 10 AM UTC, session reminders at 2 PM UTC"
  - "Stripe API version: Clover (latest stable at time of setup)"
  - "Custom domain added immediately to avoid URL changes later"
patterns_established: []
observability_surfaces:
  - "Vercel Dashboard > Deployments for build/function logs"
  - "Stripe Dashboard > Webhooks for delivery logs"
duration: ~30min
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---
# S01: Deploy & Configure

**Tutelo deployed to production at https://tutelo.app with all external services configured.**

## What Happened

Installed Vercel CLI, created the project, and deployed. Initial deployment failed due to Supabase service client needing env vars at build time — resolved by configuring all 10 env vars before the production deploy. Cron schedules adjusted from hourly to daily for Vercel Hobby plan compatibility.

All 6 Supabase migrations pushed to remote (5 were already applied, 1 pending). Custom domain tutelo.app added and verified working. Stripe webhook destinations registered for both platform events and connected account events with Clover API version.

All routes verified: /login (200), /onboarding (307 → auth redirect), /dashboard (307 → auth redirect), non-existent slug (404).
