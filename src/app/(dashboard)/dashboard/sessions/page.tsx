import { redirect } from 'next/navigation'
import { getTeacher } from '@/lib/supabase/auth-cache'
import { format } from 'date-fns'
import { ConfirmedSessionCard } from '@/components/dashboard/ConfirmedSessionCard'
import { AnimatedList, AnimatedListItem } from '@/components/dashboard/AnimatedList'
import { markSessionComplete, cancelSession, cancelSingleRecurringSession, cancelRecurringSeries } from '@/actions/bookings'

export default async function SessionsPage() {
  const { teacher, supabase } = await getTeacher()
  if (!teacher) redirect('/login')

  const teacherTimezone = teacher.timezone ?? 'America/New_York'

  // Two parallel queries
  const [upcomingResult, pastResult] = await Promise.all([
    supabase
      .from('bookings')
      .select('id, student_name, subject, booking_date, start_time, parent_email, recurring_schedule_id, status')
      .eq('teacher_id', teacher.id)
      .in('status', ['confirmed', 'payment_failed'])
      .order('booking_date', { ascending: true }),

    supabase
      .from('bookings')
      .select('id, student_name, subject, booking_date, amount_cents, reviews(rating)')
      .eq('teacher_id', teacher.id)
      .eq('status', 'completed')
      .order('booking_date', { ascending: false }),
  ])

  const upcomingBookings = upcomingResult.data ?? []
  const pastBookings = pastResult.data ?? []

  return (
    <div className="p-6 max-w-3xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sessions</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage upcoming sessions and review past completions.</p>
      </div>

      {/* Upcoming section */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Upcoming</h2>
        {upcomingBookings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming sessions.</p>
        ) : (
          <AnimatedList className="space-y-3">
            {upcomingBookings.map((booking) => (
              <AnimatedListItem key={booking.id}>
                <ConfirmedSessionCard
                  booking={booking}
                  teacherTimezone={teacherTimezone}
                  markCompleteAction={markSessionComplete}
                  cancelSessionAction={booking.recurring_schedule_id ? cancelSingleRecurringSession : cancelSession}
                  recurringScheduleId={booking.recurring_schedule_id}
                  bookingStatus={booking.status}
                  cancelSeriesAction={cancelRecurringSeries}
                />
              </AnimatedListItem>
            ))}
          </AnimatedList>
        )}
      </section>

      {/* Past section */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Past Sessions</h2>
        {pastBookings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No completed sessions yet.</p>
        ) : (
          <div className="space-y-2">
            {pastBookings.map((booking) => {
              const earned =
                booking.amount_cents != null
                  ? (booking.amount_cents / 100).toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    })
                  : '—'

              const reviews = booking.reviews as Array<{ rating: number | null }> | null
              const reviewRating = reviews?.[0]?.rating

              return (
                <div
                  key={booking.id}
                  className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 rounded-xl border bg-card px-4 py-3 shadow-sm"
                >
                  <div>
                    <span className="font-medium text-foreground">{booking.student_name}</span>
                    <span className="text-sm text-muted-foreground ml-2">{booking.subject}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(booking.booking_date), 'MMM d, yyyy')}
                  </span>
                  <span className="text-sm font-medium text-foreground">{earned}</span>
                  <span className="text-sm text-muted-foreground">
                    {reviewRating != null ? (
                      <span className="text-yellow-500">
                        {'★'.repeat(reviewRating)}{'☆'.repeat(5 - reviewRating)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">No review yet</span>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
