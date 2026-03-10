import { supabaseAdmin } from '@/lib/supabase/service'
import { ReviewForm } from './ReviewForm'

// ---------------------------------------------------------------------------
// ReviewPage — RSC shell (resolves token, handles error states)
// ---------------------------------------------------------------------------
export default async function ReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const { data: review } = await supabaseAdmin
    .from('reviews')
    .select('id, token_used_at, booking_id, bookings(student_name, teachers(full_name, slug))')
    .eq('token', token)
    .maybeSingle()

  if (!review) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-2">
          <h1 className="text-xl font-semibold">Invalid review link</h1>
          <p className="text-muted-foreground">
            This review link is invalid or has expired.
          </p>
        </div>
      </main>
    )
  }

  if (review.token_used_at) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-2">
          <h1 className="text-xl font-semibold">Review already submitted</h1>
          <p className="text-muted-foreground">
            This review has already been submitted. Thank you!
          </p>
        </div>
      </main>
    )
  }

  const booking = review.bookings as unknown as {
    student_name: string
    teachers: { full_name: string }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">
            How was {booking.student_name}&apos;s session?
          </h1>
          <p className="text-muted-foreground">with {booking.teachers.full_name}</p>
        </div>
        <ReviewForm reviewId={review.id} />
      </div>
    </main>
  )
}
