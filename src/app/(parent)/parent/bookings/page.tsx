import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CalendarCheck, Clock } from 'lucide-react'

export const metadata = { title: 'My Bookings — Tutelo' }

export default async function ParentBookingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/parent/bookings')

  const userId = user.id

  // Fetch all parent's bookings with teacher info and child name
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(`
      id,
      student_name,
      subject,
      booking_date,
      start_time,
      status,
      amount_cents,
      child_id,
      children ( name ),
      teacher_id,
      teachers ( full_name, slug )
    `)
    .eq('parent_id', userId)
    .order('booking_date', { ascending: false })

  if (error) {
    return (
      <div className="p-6 md:p-10">
        <h1 className="text-2xl font-bold tracking-tight">My Bookings</h1>
        <p className="text-muted-foreground mt-4">
          Unable to load your bookings. Please try again later.
        </p>
      </div>
    )
  }

  const allBookings = bookings ?? []
  const today = new Date().toISOString().split('T')[0]

  const upcoming = allBookings.filter(
    (b) => b.booking_date >= today && b.status !== 'completed' && b.status !== 'cancelled'
  )
  const past = allBookings.filter(
    (b) => b.booking_date < today || b.status === 'completed' || b.status === 'cancelled'
  )

  return (
    <div className="p-6 md:p-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Bookings</h1>
        <p className="text-muted-foreground mt-1">
          View your upcoming and past tutoring sessions.
        </p>
      </div>

      {allBookings.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CalendarCheck className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h2 className="text-lg font-semibold">No bookings yet</h2>
          <p className="text-muted-foreground mt-1 max-w-sm">
            Find a tutor and book your first session.
          </p>
          <Button asChild className="mt-4">
            <Link href="/tutors">Find a Tutor</Link>
          </Button>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Upcoming Sessions</h2>
          <div className="space-y-3">
            {upcoming.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        </section>
      )}

      {/* Past */}
      {past.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Past Sessions</h2>
          <div className="space-y-3">
            {past.map((booking) => (
              <BookingCard key={booking.id} booking={booking} showRebook />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */

interface BookingRow {
  id: string
  student_name: string | null
  subject: string | null
  booking_date: string
  start_time: string | null
  status: string
  amount_cents: number | null
  child_id: string | null
  children: { name: string }[] | null
  teacher_id: string
  teachers: { full_name: string; slug: string }[] | null
}

function BookingCard({
  booking,
  showRebook = false,
}: {
  booking: BookingRow
  showRebook?: boolean
}) {
  const childName = booking.children?.[0]?.name
  const displayName = childName ?? booking.student_name ?? 'Student'
  const teacherName = booking.teachers?.[0]?.full_name ?? 'Teacher'
  const teacherSlug = booking.teachers?.[0]?.slug

  const statusVariant =
    booking.status === 'confirmed'
      ? 'default'
      : booking.status === 'requested'
        ? 'secondary'
        : booking.status === 'completed'
          ? 'outline'
          : 'destructive'

  return (
    <Card className="rounded-xl shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{displayName}</h3>
              <Badge variant={statusVariant} className="capitalize text-xs">
                {booking.status}
              </Badge>
            </div>
            {booking.subject && (
              <p className="text-sm text-muted-foreground">{booking.subject}</p>
            )}
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <CalendarCheck className="h-3.5 w-3.5" />
                {format(new Date(booking.booking_date + 'T00:00:00'), 'MMM d, yyyy')}
              </span>
              {booking.start_time && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {booking.start_time}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              with <strong>{teacherName}</strong>
            </p>
          </div>

          {showRebook && teacherSlug && (
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link href={`/${teacherSlug}`}>Rebook</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
