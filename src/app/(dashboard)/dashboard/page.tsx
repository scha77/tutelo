import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { format } from 'date-fns'
import { StatsBar } from '@/components/dashboard/StatsBar'
import { ReviewPreviewCard } from '@/components/dashboard/ReviewPreviewCard'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: claimsData } = await supabase.auth.getClaims()
  if (!claimsData?.claims) redirect('/login')

  const userId = claimsData.claims.sub

  const { data: teacher } = await supabase
    .from('teachers')
    .select('id, timezone, slug, full_name')
    .eq('user_id', userId)
    .maybeSingle()

  if (!teacher) redirect('/onboarding')

  // Four parallel queries
  const [
    upcomingResult,
    completedResult,
    recentReviewsResult,
    upcomingPreviewResult,
  ] = await Promise.all([
    // Count only — no rows needed
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('teacher_id', teacher.id)
      .eq('status', 'confirmed'),

    // Completed bookings for earnings + student count
    supabase
      .from('bookings')
      .select('id, amount_cents, student_name, parent_email')
      .eq('teacher_id', teacher.id)
      .eq('status', 'completed'),

    // Last 2 reviews with ratings
    supabase
      .from('reviews')
      .select('rating, review_text, reviewer_name, created_at')
      .eq('teacher_id', teacher.id)
      .not('rating', 'is', null)
      .order('created_at', { ascending: false })
      .limit(2),

    // 3 upcoming sessions for preview
    supabase
      .from('bookings')
      .select('id, student_name, subject, booking_date')
      .eq('teacher_id', teacher.id)
      .eq('status', 'confirmed')
      .order('booking_date', { ascending: true })
      .limit(3),
  ])

  const upcomingCount = upcomingResult.count ?? 0
  const completedBookings = completedResult.data ?? []
  const recentReviews = recentReviewsResult.data ?? []
  const upcomingPreview = upcomingPreviewResult.data ?? []

  // Compute earnings
  const totalEarnedCents = completedBookings.reduce(
    (sum, b) => sum + (b.amount_cents ?? 0),
    0
  )

  // Compute unique student count
  const studentCount = new Set(
    completedBookings.map((b) => `${b.student_name}|${b.parent_email}`)
  ).size

  return (
    <div className="p-6 max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold text-foreground">Overview</h1>

      {/* Stats bar */}
      <StatsBar
        totalEarnedCents={totalEarnedCents}
        upcomingCount={upcomingCount}
        studentCount={studentCount}
      />

      {/* Upcoming sessions preview */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-3">Upcoming Sessions</h2>
        {upcomingPreview.length === 0 ? (
          <p className="text-muted-foreground text-sm">No upcoming sessions.</p>
        ) : (
          <ul className="space-y-2">
            {upcomingPreview.map((booking) => (
              <li key={booking.id} className="rounded-lg border bg-card p-3 flex items-center gap-3">
                <div>
                  <span className="font-medium text-foreground">{booking.student_name}</span>
                  <span className="text-sm text-muted-foreground ml-2">{booking.subject}</span>
                </div>
                <span className="ml-auto text-sm text-muted-foreground">
                  {format(new Date(booking.booking_date), 'MMM d, yyyy')}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/dashboard/sessions"
          className="mt-3 inline-block text-sm text-primary hover:underline"
        >
          View all sessions →
        </Link>
      </section>

      {/* Recent reviews — only shown when reviews exist */}
      {recentReviews.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">Recent Reviews</h2>
          <div className="space-y-3">
            {recentReviews.map((review, i) => (
              <ReviewPreviewCard
                key={i}
                rating={review.rating as number}
                text={review.review_text}
                reviewerName={review.reviewer_name}
                createdAt={review.created_at}
              />
            ))}
          </div>
          <Link
            href={`/${teacher.slug}`}
            className="mt-3 inline-block text-sm text-primary hover:underline"
          >
            View profile →
          </Link>
        </section>
      )}
    </div>
  )
}
