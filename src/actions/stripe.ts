'use server'
import Stripe from 'stripe'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function connectStripe(): Promise<void> {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) {
    redirect('/login')
    return
  }

  const { data: teacher } = await supabase
    .from('teachers')
    .select('id, stripe_account_id, stripe_charges_enabled')
    .eq('user_id', userId)
    .single()

  if (!teacher) {
    redirect('/login')
    return
  }

  // Guard: already connected — redirect to dashboard
  if (teacher.stripe_charges_enabled) {
    redirect('/dashboard')
  }

  let stripeAccountId = teacher.stripe_account_id

  // Create Express account if none exists
  if (!stripeAccountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    })
    stripeAccountId = account.id

    await supabase
      .from('teachers')
      .update({ stripe_account_id: stripeAccountId })
      .eq('id', teacher.id)
  }

  // Generate one-time account link (single-use — generate on each request)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tutelo.app'
  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    type: 'account_onboarding',
    return_url: `${appUrl}/dashboard?stripe=connected`,
    refresh_url: `${appUrl}/dashboard/connect-stripe`,
  })

  redirect(accountLink.url)
}
