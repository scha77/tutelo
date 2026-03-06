import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RequestCard } from '@/components/dashboard/RequestCard'
import { acceptBooking, declineBooking } from '@/actions/bookings'
import { CopyLinkButton } from './CopyLinkButton'

export default async function RequestsPage() {
  const supabase = await createClient()

  // Auth check
  const { data: claimsData } = await supabase.auth.getClaims()
  if (!claimsData?.claims) {
    redirect('/login')
  }

  const userId = claimsData.claims.sub

  // Fetch teacher row
  const { data: teacher } = await supabase
    .from('teachers')
    .select('id, slug, timezone')
    .eq('user_id', userId)
    .maybeSingle()

  if (!teacher) {
    redirect('/onboarding')
  }

  // Fetch pending booking requests
  const { data: requests } = await supabase
    .from('bookings')
    .select('id, student_name, subject, booking_date, start_time, parent_email, created_at')
    .eq('teacher_id', teacher.id)
    .eq('status', 'requested')
    .order('created_at', { ascending: false })

  const bookings = requests ?? []
  const teacherTimezone = teacher.timezone ?? 'America/New_York'
  const pageUrl = `https://tutelo.app/${teacher.slug}`

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground mb-6">Booking Requests</h1>

      {bookings.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-muted-foreground">
            No pending requests yet. Share your page to get bookings!
          </p>
          <CopyLinkButton url={pageUrl} />
        </div>
      ) : (
        /* Request cards */
        <div className="flex flex-col gap-4">
          {bookings.map((booking) => (
            <RequestCard
              key={booking.id}
              booking={booking}
              teacherTimezone={teacherTimezone}
              acceptAction={acceptBooking}
              declineAction={declineBooking}
            />
          ))}
        </div>
      )}
    </div>
  )
}
