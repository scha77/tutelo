# S01: Deploy & Configure

**Goal:** Deploy Tutelo to Vercel and configure all external services (Supabase remote, Stripe, Resend) so every route loads without errors.
**Demo:** Visit the live Vercel URL and see the Tutelo landing page/login. All routes return 200 (not 500). Supabase has all tables with RLS. Stripe webhooks are registered.

## Must-Haves

- Vercel project created and first deployment succeeds
- All 10 environment variables configured on Vercel
- Supabase remote project has all 6 migrations applied
- Supabase Storage `profile-images` bucket exists with public read
- Stripe webhook endpoints registered in Stripe Dashboard (test mode)
- Resend API key active and domain verified (or using sandbox)

## Proof Level

- This slice proves: integration (live deployment with real service connections)
- Real runtime required: yes
- Human/UAT required: yes (Stripe Dashboard, Supabase Dashboard, Vercel Dashboard — user must configure accounts)

## Verification

- `vercel --prod` deployment completes without errors
- Visit every major route on the live URL — no 500 errors: `/login`, `/onboarding`, `/dashboard`, `/[slug]`
- Supabase Dashboard shows all 4 tables with RLS enabled
- Stripe Dashboard shows 2 webhook endpoints registered

## Observability / Diagnostics

- Runtime signals: Vercel deployment logs, Vercel function logs
- Inspection surfaces: Vercel Dashboard > Deployments, Supabase Dashboard > Table Editor, Stripe Dashboard > Webhooks
- Failure visibility: Vercel function logs show 500 errors with stack traces; Supabase Dashboard shows migration history
- Redaction constraints: never log Stripe secret keys, Supabase service key, or CRON_SECRET

## Integration Closure

- Upstream surfaces consumed: all M001 source code, `vercel.json`, `supabase/migrations/`, `.env.local`
- New wiring introduced: Vercel project config, Vercel env vars, Stripe webhook endpoint registration
- What remains before the milestone is truly usable end-to-end: S02 (verify live flows work), S03 (error hardening)

## Tasks

- [x] **T01: Install Vercel CLI and deploy** `est:15m`
  - Why: The app needs to be on the internet. Vercel is the pre-decided hosting platform.
  - Files: none (CLI + Dashboard configuration)
  - Do:
    1. Install Vercel CLI: `npm i -g vercel`
    2. Run `vercel login` to authenticate
    3. Run `vercel` from project root to create project and do first preview deployment
    4. Verify preview deployment loads without build errors
    5. Check that all routes render (may show Supabase connection errors — that's expected before env vars)
  - Verify: `vercel ls` shows the project; preview URL returns 200 on `/login`
  - Done when: Vercel project exists and preview deployment succeeded

- [x] **T02: Configure environment variables on Vercel** `est:10m`
  - Why: The app needs all 10 env vars to connect to Supabase, Stripe, and Resend. Without them, every route 500s.
  - Files: none (Vercel Dashboard or CLI)
  - Do:
    1. Use `vercel env add` or Vercel Dashboard to set all 10 variables for Production and Preview:
       - `NEXT_PUBLIC_SUPABASE_URL`
       - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
       - `SUPABASE_SERVICE_SECRET_KEY`
       - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
       - `STRIPE_SECRET_KEY`
       - `STRIPE_WEBHOOK_SECRET` (will be updated after webhook registration in T04)
       - `STRIPE_CONNECT_WEBHOOK_SECRET` (will be updated after webhook registration in T04)
       - `RESEND_API_KEY`
       - `CRON_SECRET`
       - `NEXT_PUBLIC_APP_URL` (set to the Vercel production URL)
    2. Redeploy: `vercel --prod`
  - Verify: Production deployment completes; `/login` loads without Supabase connection errors
  - Done when: Production URL loads the login page correctly

- [x] **T03: Apply Supabase migrations and create storage bucket** `est:10m`
  - Why: The remote Supabase project needs the schema. Without it, all data operations fail.
  - Files: `supabase/migrations/` (6 files, already written)
  - Do:
    1. Verify Supabase CLI is linked: `npx supabase db remote changes` (should show pending migrations)
    2. Push migrations: `npx supabase db push`
    3. Verify in Supabase Dashboard: 4 tables visible (teachers, availability, bookings, reviews), all with RLS enabled
    4. Create `profile-images` storage bucket via Supabase Dashboard:
       - Name: `profile-images`, Public: ON
       - Add RLS policies: public SELECT, authenticated INSERT/UPDATE/DELETE scoped to `auth.uid()`
    5. Configure Auth providers in Supabase Dashboard:
       - Enable Google OAuth (if not already done)
       - Set Site URL to the Vercel production URL
       - Add Vercel URL to Redirect URLs
  - Verify: Visit `/login` on live URL → sign up with email → verify redirect to `/onboarding`
  - Done when: All 4 tables exist with RLS, storage bucket exists, auth is configured for the live URL

- [x] **T04: Register Stripe webhook endpoints** `est:10m`
  - Why: Without webhook registration, Stripe events (account.updated, checkout.session.completed, etc.) are never received. The entire payment flow is dead.
  - Files: none (Stripe Dashboard configuration)
  - Do:
    1. In Stripe Dashboard > Developers > Webhooks:
    2. Add endpoint: `https://<vercel-url>/api/stripe/webhook`
       - Events: `account.updated`, `checkout.session.completed`, `payment_intent.amount_capturable_updated`, `payment_intent.payment_failed`
       - Copy the signing secret → update `STRIPE_WEBHOOK_SECRET` on Vercel
    3. Add endpoint: `https://<vercel-url>/api/stripe-connect/webhook`
       - Listen on connected accounts
       - Events: `account.updated`
       - Copy the signing secret → update `STRIPE_CONNECT_WEBHOOK_SECRET` on Vercel
    4. Redeploy: `vercel --prod` (to pick up updated webhook secrets)
    5. Send a test webhook event from Stripe Dashboard to verify the endpoint responds 200
  - Verify: Stripe Dashboard shows both endpoints as "Enabled" with a successful test event delivery
  - Done when: Both webhook endpoints are registered, verified, and secrets are configured on Vercel

## Files Likely Touched

- No source code changes expected — this is purely deployment and configuration
- `vercel.json` (already exists)
- `supabase/migrations/` (already exist, applied to remote)
