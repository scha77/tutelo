import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_SECRET_KEY);

const teacherId = 'b2e51d3d-dc0c-4b61-96b5-060af64c3fa2';
const stripeAccountId = 'acct_1T8D4eAQciwJQzzO';
const appUrl = process.env.NEXT_PUBLIC_APP_URL;

const { data: bookings } = await supabase
  .from('bookings')
  .select('id, parent_email, student_name, subject, booking_date, stripe_payment_intent, teachers(hourly_rate)')
  .eq('teacher_id', teacherId)
  .eq('status', 'requested')
  .is('stripe_payment_intent', null);

console.log('Bookings found:', bookings?.length);

for (const booking of bookings ?? []) {
  const hourlyRate = booking.teachers?.hourly_rate ?? 0;
  const amountInCents = Math.round(hourlyRate * 100);

  const session = await stripe.checkout.sessions.create({
    line_items: [{ price_data: { currency: 'usd', product_data: { name: 'Tutoring — ' + booking.student_name }, unit_amount: amountInCents }, quantity: 1 }],
    mode: 'payment',
    payment_intent_data: {
      capture_method: 'manual',
      on_behalf_of: stripeAccountId,
      transfer_data: { destination: stripeAccountId },
      metadata: { booking_id: booking.id },
    },
    customer_email: booking.parent_email,
    success_url: appUrl + '/booking-confirmed?session={CHECKOUT_SESSION_ID}',
    cancel_url: appUrl + '/booking-cancelled',
    metadata: { booking_id: booking.id },
  });

  await supabase.from('bookings').update({ stripe_checkout_url: session.url }).eq('id', booking.id);
  console.log('Checkout URL for', booking.parent_email, ':', session.url);
}
