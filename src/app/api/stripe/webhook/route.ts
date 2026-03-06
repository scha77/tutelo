import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase/service'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  if (!sig) return new Response('Missing stripe-signature header', { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('[stripe/webhook] Signature verification failed:', err)
    return new Response(`Webhook Error: ${err}`, { status: 400 })
  }

  switch (event.type) {
    case 'account.updated': {
      const account = event.data.object as Stripe.Account
      if (account.charges_enabled) {
        // Check if already activated to prevent duplicate Checkout session creation (idempotency guard)
        const { data: teacher } = await supabaseAdmin
          .from('teachers')
          .select('id, stripe_charges_enabled')
          .eq('stripe_account_id', account.id)
          .maybeSingle()

        if (teacher && !teacher.stripe_charges_enabled) {
          await supabaseAdmin
            .from('teachers')
            .update({ stripe_charges_enabled: true, updated_at: new Date().toISOString() })
            .eq('stripe_account_id', account.id)

          // Stub: Plan 02 implements createCheckoutSessionsForTeacher()
          console.log(
            `[stripe/webhook] Teacher activated: ${teacher.id} — Checkout sessions will be created in Plan 02`
          )
        }
      }
      break
    }

    case 'checkout.session.completed': {
      // Stub: Plan 02 implements full handler
      const session = event.data.object as Stripe.Checkout.Session
      console.log(
        `[stripe/webhook] checkout.session.completed for booking: ${session.metadata?.booking_id}`
      )
      break
    }

    default:
      // Ignore unknown events — always return 200
      break
  }

  return new Response('OK', { status: 200 })
}
