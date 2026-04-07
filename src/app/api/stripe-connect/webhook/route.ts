import * as Sentry from '@sentry/nextjs'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  if (!sig) return new Response('Missing stripe-signature header', { status: 400 })

  try {
    // Verify signature with CONNECT secret (different from platform secret)
    stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_CONNECT_WEBHOOK_SECRET!)
  } catch (err) {
    Sentry.captureException(err)
    return new Response(`Webhook Error: ${err}`, { status: 400 })
  }

  // Stub: future connected-account events handled here
  return new Response('OK', { status: 200 })
}
