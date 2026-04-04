import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase/service'
import { sendCheckoutLinkEmail, sendBookingConfirmationEmail } from '@/lib/email'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tutelo.app'

/**
 * Creates Stripe Checkout sessions for all pending requested bookings of a teacher
 * who has just connected Stripe. Called after account.updated fires with charges_enabled: true.
 *
 * Design:
 * - Fetches bookings where status = 'requested' OR 'pending' AND stripe_payment_intent IS NULL
 * - IS NULL guard provides idempotency: skips bookings that already went through Checkout
 * - Each booking is processed independently with try/catch — one failure does not block others
 * - Checkout uses capture_method: 'manual' (authorize only — captured on Mark Complete)
 * - Uses destination charges: on_behalf_of + transfer_data.destination = teacher's Stripe account
 */
async function createCheckoutSessionsForTeacher(
  teacherId: string,
  stripeAccountId: string
): Promise<void> {
  const { data: bookings } = await supabaseAdmin
    .from('bookings')
    .select('id, parent_email, student_name, subject, booking_date, stripe_payment_intent, teachers(hourly_rate)')
    .eq('teacher_id', teacherId)
    .in('status', ['requested', 'pending'])
    .is('stripe_payment_intent', null)

  if (!bookings || bookings.length === 0) {
    console.log(`[stripe/webhook] No pending bookings found for teacher ${teacherId}`)
    return
  }

  for (const booking of bookings) {
    try {
      const teacherRow = booking.teachers as unknown as { hourly_rate: number | null } | null
      const hourlyRate = teacherRow?.hourly_rate ?? 0
      const amountInCents = Math.round(hourlyRate * 100)

      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: { name: `Tutoring — ${booking.student_name}` },
              unit_amount: amountInCents,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        payment_intent_data: {
          capture_method: 'manual',
          on_behalf_of: stripeAccountId,
          transfer_data: { destination: stripeAccountId },
          metadata: { booking_id: booking.id },
        },
        customer_email: booking.parent_email,
        success_url: `${appUrl}/booking-confirmed?session={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/booking-cancelled`,
        metadata: { booking_id: booking.id },
      })

      // Store checkout URL so it's retrievable later
      await supabaseAdmin
        .from('bookings')
        .update({ stripe_checkout_url: session.url })
        .eq('id', booking.id)

      // Email the parent their unique checkout link
      if (session.url) {
        await sendCheckoutLinkEmail(booking.parent_email, booking.student_name, session.url).catch(
          (err) => console.error(`[stripe/webhook] Failed to email checkout link for booking ${booking.id}:`, err)
        )
      }

      console.log(`[stripe/webhook] Checkout session created for booking ${booking.id}: ${session.id}`)
    } catch (err) {
      // Individual booking failure does not block other bookings
      console.error(`[stripe/webhook] Failed to create Checkout session for booking ${booking.id}:`, err)
    }
  }
}

export async function POST(req: Request) {
  // CRITICAL: req.text() must be called first — req.json() destroys raw bytes needed for signature verification
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

          // Create Checkout sessions for all pending bookings and email parents
          await createCheckoutSessionsForTeacher(teacher.id, account.id)
        }
      }
      break
    }

    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const bookingId = session.metadata?.booking_id

      if (!bookingId) {
        console.warn('[stripe/webhook] checkout.session.completed missing booking_id in metadata')
        break
      }

      // Idempotent update — .in('status') prevents double-confirm on Stripe re-delivery
      // .select('id') returns updated rows so we only email when a row actually changed
      const { data: updated, error } = await supabaseAdmin
        .from('bookings')
        .update({
          status: 'confirmed',
          stripe_payment_intent: typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId)
        .in('status', ['requested', 'pending'])
        .select('id')

      if (error) {
        console.error(`[stripe/webhook] Failed to confirm booking ${bookingId}:`, error)
      } else if (updated && updated.length > 0) {
        console.log(`[stripe/webhook] Booking ${bookingId} confirmed — payment intent: ${session.payment_intent}`)
        await sendBookingConfirmationEmail(bookingId).catch(console.error)
      } else {
        console.log(`[stripe/webhook] Booking ${bookingId} already confirmed — skipping email (re-delivery)`)
      }
      break
    }

    case 'payment_intent.amount_capturable_updated': {
      const pi = event.data.object as Stripe.PaymentIntent
      const bookingId = pi.metadata?.booking_id
      if (!bookingId) {
        console.warn('[stripe/webhook] payment_intent.amount_capturable_updated missing booking_id')
        break
      }
      // Idempotency: .eq('status', 'requested') prevents double-confirm on re-delivery
      const { data: updated } = await supabaseAdmin
        .from('bookings')
        .update({
          status: 'confirmed',
          stripe_payment_intent: pi.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId)
        .eq('status', 'requested')
        .select('id')

      if (updated && updated.length > 0) {
        // Pass accountUrl so parent-facing confirmation email includes /account link (PARENT-02)
        const accountUrl = `${appUrl}/account`
        await sendBookingConfirmationEmail(bookingId, { accountUrl }).catch(console.error)
        console.log(`[stripe/webhook] Direct booking ${bookingId} confirmed via payment_intent.amount_capturable_updated`)
      }

      // S02: Store payment method on recurring schedule for auto-charge cron
      const recurringScheduleId = pi.metadata?.recurring_schedule_id
      if (recurringScheduleId && pi.payment_method) {
        const { error: pmError } = await supabaseAdmin
          .from('recurring_schedules')
          .update({ stripe_payment_method_id: pi.payment_method as string })
          .eq('id', recurringScheduleId)
          .is('stripe_payment_method_id', null) // idempotent — only set once

        if (pmError) {
          console.warn(`[stripe/webhook] Failed to store payment method on recurring_schedule ${recurringScheduleId}:`, pmError)
        } else {
          console.log(`[stripe/webhook] Stored payment method on recurring_schedule ${recurringScheduleId}`)
        }
      }

      // S03: Retrieve PM card details and upsert to parent_profiles for saved-card flow
      const parentId = pi.metadata?.parent_id
      if (parentId && pi.customer && pi.payment_method) {
        try {
          const pm = await stripe.paymentMethods.retrieve(pi.payment_method as string)
          const cardBrand = pm.card?.brand ?? null
          const cardLast4 = pm.card?.last4 ?? null
          const cardExpMonth = pm.card?.exp_month ?? null
          const cardExpYear = pm.card?.exp_year ?? null

          const { error: profileError } = await supabaseAdmin
            .from('parent_profiles')
            .upsert(
              {
                user_id: parentId,
                stripe_customer_id: pi.customer as string,
                stripe_payment_method_id: pi.payment_method as string,
                card_brand: cardBrand,
                card_last4: cardLast4,
                card_exp_month: cardExpMonth,
                card_exp_year: cardExpYear,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id' }
            )

          if (profileError) {
            console.error(`[stripe/webhook] Failed to upsert parent_profiles for parent ${parentId}:`, profileError)
          } else {
            console.log(`[stripe/webhook] Upserted parent_profiles PM for parent ${parentId} (${cardBrand} ****${cardLast4})`)
          }
        } catch (pmErr) {
          // Non-critical — booking confirm already succeeded; PM storage is best-effort
          console.error(`[stripe/webhook] Failed to retrieve PM ${pi.payment_method} for PI ${pi.id}:`, pmErr)
        }
      }
      break
    }

    default:
      // Ignore unknown events — always return 200 to prevent Stripe retries
      break
  }

  return new Response('OK', { status: 200 })
}
