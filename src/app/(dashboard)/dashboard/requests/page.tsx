import { redirect } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import { getTeacher } from '@/lib/supabase/auth-cache'
import { Inbox } from 'lucide-react'
import { RequestCard } from '@/components/dashboard/RequestCard'
import { AnimatedList, AnimatedListItem } from '@/components/dashboard/AnimatedList'
import { acceptBooking, declineBooking } from '@/actions/bookings'
import { CopyLinkButton } from './CopyLinkButton'

/** Pending booking requests cached for 30 s. */
function getCachedRequestsData(teacherId: string) {
  return unstable_cache(
    async () => {
      const { supabaseAdmin: supabase } = await import('@/lib/supabase/service')

      const { data } = await supabase
        .from('bookings')
        .select('id, student_name, subject, booking_date, start_time, parent_email, created_at')
        .eq('teacher_id', teacherId)
        .eq('status', 'requested')
        .order('created_at', { ascending: false })

      return data ?? []
    },
    [`requests-${teacherId}`],
    { revalidate: 30, tags: [`requests-${teacherId}`] },
  )()
}

export default async function RequestsPage() {
  const { teacher } = await getTeacher()
  if (!teacher) redirect('/login')

  const bookings = await getCachedRequestsData(teacher.id)

  const teacherTimezone = teacher.timezone ?? 'America/New_York'
  const stripeConnected = teacher.stripe_charges_enabled ?? false
  const pageUrl = `https://tutelo.app/${teacher.slug}`

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Booking Requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review and respond to incoming session requests from parents.</p>
      </div>

      {bookings.length === 0 ? (
        /* Empty state — no pending or confirmed bookings */
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            No pending requests yet. Share your page to get bookings!
          </p>
          <CopyLinkButton url={pageUrl} />
        </div>
      ) : (
        <>
          {/* Pending booking requests */}
          {bookings.length > 0 && (
            <AnimatedList className="flex flex-col gap-4">
              {bookings.map((booking) => (
                <AnimatedListItem key={booking.id}>
                  <RequestCard
                    booking={booking}
                    teacherTimezone={teacherTimezone}
                    stripeConnected={stripeConnected}
                    acceptAction={acceptBooking}
                    declineAction={declineBooking}
                  />
                </AnimatedListItem>
              ))}
            </AnimatedList>
          )}

        </>
      )}
    </div>
  )
}
