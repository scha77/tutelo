import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST() {
  const supabase = await createClient()

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const userId = userData.user.id

  const { data: teacher } = await supabase
    .from('teachers')
    .select('id, stripe_account_id, stripe_charges_enabled')
    .eq('user_id', userId)
    .single()

  if (!teacher) {
    return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
  }

  if (teacher.stripe_charges_enabled) {
    return NextResponse.json({ redirect: '/dashboard' })
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

    console.log(`[connect-stripe] Created Stripe Express account ${stripeAccountId} for teacher ${teacher.id}`)
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tutelo.app'
  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    type: 'account_onboarding',
    return_url: `${appUrl}/dashboard?stripe=connected`,
    refresh_url: `${appUrl}/dashboard/connect-stripe`,
  })

  console.log(`[connect-stripe] Redirecting teacher ${teacher.id} to Stripe onboarding`)
  return NextResponse.json({ redirect: accountLink.url })
}
