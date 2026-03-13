# Tutelo — Production Environment

## Live URL

**https://tutelo.app**

Also accessible at: https://tutelo.vercel.app

## External Services

| Service | Dashboard | Purpose |
|---------|-----------|---------|
| **Vercel** | [vercel.com/soo-sup-chas-projects/tutelo](https://vercel.com/soo-sup-chas-projects/tutelo) | Hosting, serverless functions, cron jobs |
| **Supabase** | [supabase.com/dashboard](https://supabase.com/dashboard) | PostgreSQL database, Auth, Storage |
| **Stripe** | [dashboard.stripe.com](https://dashboard.stripe.com) | Payments, Connect Express (teacher payouts) |
| **Resend** | [resend.com](https://resend.com) | Transactional email delivery |

## Environment Variables

All configured on Vercel Dashboard → Project → Settings → Environment Variables.

| Variable | Source | Public? |
|----------|--------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API | Yes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase Dashboard → Project Settings → API | Yes |
| `SUPABASE_SERVICE_SECRET_KEY` | Supabase Dashboard → Project Settings → API | No |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Developers → API keys | Yes |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys | No |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks → Platform endpoint | No |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks → Connected endpoint | No |
| `RESEND_API_KEY` | Resend Dashboard → API Keys | No |
| `CRON_SECRET` | Self-generated (`openssl rand -hex 32`) | No |
| `NEXT_PUBLIC_APP_URL` | Set to `https://tutelo.app` | Yes |

## Cron Jobs

Configured in `vercel.json`. Currently running on **daily** frequency (Vercel Hobby plan limitation).

| Schedule | Path | Purpose |
|----------|------|---------|
| `0 9 * * *` (9 AM UTC) | `/api/cron/auto-cancel` | Cancel bookings where teacher hasn't connected Stripe within 48hr |
| `0 10 * * *` (10 AM UTC) | `/api/cron/stripe-reminders` | Send 24hr/48hr follow-up emails to teachers who haven't connected Stripe |
| `0 14 * * *` (2 PM UTC) | `/api/cron/session-reminders` | Send 24hr session reminders to teachers and parents |

**Note:** Upgrade to Vercel Pro ($20/mo) for hourly cron frequency (recommended for auto-cancel).

## Stripe Webhooks

Two webhook destinations in Stripe Dashboard → Developers → Webhooks:

1. **Platform events** → `https://tutelo.app/api/stripe/webhook`
   - Events: `account.updated`, `checkout.session.completed`, `payment_intent.amount_capturable_updated`, `payment_intent.payment_failed`

2. **Connected account events** → `https://tutelo.app/api/stripe-connect/webhook`
   - Events: `account.updated`

**Current mode:** Test mode. Switch to live mode when ready for real payments.

## Common Tasks

### Redeploy
```bash
vercel --prod --token <your-token>
```

### Check function logs
Vercel Dashboard → Project → Deployments → (latest) → Functions tab

### Apply a new migration
```bash
npx supabase db push
```

### Check database
Supabase Dashboard → Table Editor

### Check email delivery
Resend Dashboard → Emails

### Send test webhook
Stripe Dashboard → Developers → Webhooks → (endpoint) → Send test event

## Upgrade Checklist

Before onboarding real teachers:

- [ ] **Supabase Pro** ($25/mo) — prevents project pausing after 1 week of inactivity
- [ ] **Vercel Pro** ($20/mo) — enables hourly cron jobs for timely auto-cancel
- [ ] **Stripe live mode** — switch from test to live keys for real payments
- [ ] **Resend domain verification** — verify tutelo.app domain for branded email delivery
- [ ] **Supabase Storage bucket** — create `profile-images` bucket if not already done via Dashboard
- [ ] **Google OAuth** — verify Google Cloud Console OAuth credentials point to tutelo.app

## Known Limitations

- **Google OAuth in booking flow:** Redirects away from the booking page — parent loses booking state. Email+password works inline. Documented as MVP tradeoff.
- **Guest booking RLS:** `bookings_anon_insert` policy uses `WITH CHECK (true)` — permissive at MVP. Tighten before scale.
- **Mobile dashboard:** Desktop-first — sidebar hidden on mobile. Responsive is post-MVP.
- **Daily crons:** Auto-cancel runs once daily instead of hourly. Some bookings may persist up to 72hr instead of 48hr before cancellation. Upgrade to Vercel Pro for hourly.
- **Default homepage:** Root `/` shows Next.js starter page. Teachers share their `/[slug]` URL directly. Landing page is a future milestone.

## Tech Stack

- **Framework:** Next.js 16.1.6 (Turbopack)
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Database:** Supabase PostgreSQL with RLS
- **Auth:** Supabase Auth (email + Google SSO)
- **Payments:** Stripe Connect Express
- **Email:** Resend + react-email
- **Hosting:** Vercel
