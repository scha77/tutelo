import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/service'

/**
 * GET /api/parent/payment-method
 * Returns safe display fields for the authenticated parent's saved card.
 * Returns `{ card: null }` when no card is on file.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error } = await supabaseAdmin
    .from('parent_profiles')
    .select('card_brand, card_last4, card_exp_month, card_exp_year')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('[GET /api/parent/payment-method] Query failed:', error)
    return NextResponse.json({ error: 'Failed to fetch payment method' }, { status: 500 })
  }

  if (!profile || !profile.card_last4) {
    return NextResponse.json({ card: null })
  }

  return NextResponse.json({
    card: {
      brand: profile.card_brand,
      last4: profile.card_last4,
      exp_month: profile.card_exp_month,
      exp_year: profile.card_exp_year,
    },
  })
}

/**
 * DELETE /api/parent/payment-method
 * Detaches the saved payment method from Stripe and clears card fields on parent_profiles.
 */
export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error: fetchError } = await supabaseAdmin
    .from('parent_profiles')
    .select('stripe_payment_method_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (fetchError) {
    console.error('[DELETE /api/parent/payment-method] Query failed:', fetchError)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }

  if (!profile || !profile.stripe_payment_method_id) {
    return NextResponse.json({ error: 'No saved payment method' }, { status: 404 })
  }

  // Lazy-import Stripe only for the DELETE path
  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  try {
    await stripe.paymentMethods.detach(profile.stripe_payment_method_id)
  } catch (stripeErr) {
    console.error('[DELETE /api/parent/payment-method] Stripe detach failed:', stripeErr)
    return NextResponse.json({ error: 'Failed to detach payment method' }, { status: 502 })
  }

  const { error: updateError } = await supabaseAdmin
    .from('parent_profiles')
    .update({
      stripe_payment_method_id: null,
      card_brand: null,
      card_last4: null,
      card_exp_month: null,
      card_exp_year: null,
    })
    .eq('user_id', user.id)

  if (updateError) {
    console.error('[DELETE /api/parent/payment-method] DB update failed:', updateError)
    return NextResponse.json({ error: 'Detached from Stripe but failed to update profile' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
