import { redirect } from 'next/navigation'
import Link from 'next/link'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase/service'
import { CheckCircle2 } from 'lucide-react'

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
      <div className="max-w-md w-full rounded-xl border bg-card p-8 shadow-sm text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">You&apos;re booked!</h1>
        {bookingDetails ? (
          <p className="text-muted-foreground mb-6">
            {bookingDetails.student_name}&apos;s session with {teacher?.full_name} on{' '}
            {new Date(bookingDetails.booking_date + 'T12:00:00').toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}{' '}
            at {bookingDetails.start_time.slice(0, 5)} is confirmed.
          </p>
        ) : (
          <p className="text-muted-foreground mb-6">Your booking is confirmed.</p>
        )}
        <p className="text-sm text-muted-foreground mb-6">
          You&apos;ll get a reminder 24 hours before your session.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Back to Home
        </Link>
      </div>
    </div>
  )
}
