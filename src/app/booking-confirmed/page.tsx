import { redirect } from 'next/navigation'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase/service'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

interface Props {
  searchParams: Promise<{ session?: string }>
}

export default async function BookingConfirmedPage({ searchParams }: Props) {
  const params = await searchParams
  const sessionId = params.session
  if (!sessionId) redirect('/')

  let bookingDetails: {
    student_name: string
    subject: string
    booking_date: string
    start_time: string
    teachers: unknown
  } | null = null

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    const bookingId = session.metadata?.booking_id
    if (bookingId) {
      const { data } = await supabaseAdmin
        .from('bookings')
        .select('student_name, subject, booking_date, start_time, teachers(full_name)')
        .eq('id', bookingId)
        .single()
      bookingDetails = data
    }
  } catch {
    // Silently fall through to generic confirmation
  }

  const teacher = bookingDetails?.teachers as { full_name: string } | null

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center">
        <div
          className="text-5xl mb-4"
          aria-hidden="true"
        >
          ✓
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">You&apos;re booked!</h1>
        {bookingDetails ? (
          <>
            <p className="text-muted-foreground mb-6">
              {bookingDetails.student_name}&apos;s session with {teacher?.full_name} on{' '}
              {new Date(bookingDetails.booking_date + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}{' '}
              at {bookingDetails.start_time.slice(0, 5)} is confirmed.
            </p>
          </>
        ) : (
          <p className="text-muted-foreground mb-6">Your booking is confirmed.</p>
        )}
        <p className="text-sm text-muted-foreground">
          You&apos;ll get a reminder 24 hours before your session.
        </p>
      </div>
    </div>
  )
}
