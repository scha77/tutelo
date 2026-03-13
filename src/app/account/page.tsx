import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/actions/auth'

export const metadata = { title: 'My Sessions — Tutelo' }

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Belt-and-suspenders auth check (middleware handles redirect, but belt-and-suspenders)
  if (!user) {
    redirect('/login?redirect=/account')
  }

  // Role check: teachers go to /dashboard
  const { data: teacherRow } = await supabase
    .from('teachers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (teacherRow) {
    redirect('/dashboard')
  }

  // Fetch parent's bookings with teacher info
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, student_name, subject, booking_date, start_time, status, teachers(full_name, slug)')
    .eq('parent_id', user.id)
    .order('booking_date', { ascending: true })

  const todayStr = new Date().toISOString().slice(0, 10)
  const upcoming = bookings?.filter(
    (b) => b.booking_date >= todayStr && b.status === 'confirmed'
  ) ?? []
  const past = bookings?.filter(
    (b) => b.booking_date < todayStr || b.status === 'completed'
  ) ?? []

  return (
    <main className="min-h-screen max-w-2xl mx-auto px-4 py-10 space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Sessions</h1>
        <form action={signOut}>
          <button
            type="submit"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            Sign out
          </button>
        </form>
      </div>

      {/* Upcoming */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="text-muted-foreground text-sm">No upcoming sessions yet.</p>
        ) : (
          <div className="space-y-3">
            {upcoming.map((booking) => {
              const teacher = booking.teachers as unknown as { full_name: string; slug: string }
              return (
                <div key={booking.id} className="border rounded-lg p-4 space-y-1">
                  <p className="font-medium">{booking.student_name} — {booking.subject}</p>
                  <p className="text-sm text-muted-foreground">
                    {booking.booking_date} at {booking.start_time.slice(0, 5)}
                  </p>
                  <p className="text-sm text-muted-foreground">with {teacher.full_name}</p>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Past */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Past</h2>
        {past.length === 0 ? (
          <p className="text-muted-foreground text-sm">No past sessions.</p>
        ) : (
          <div className="space-y-3">
            {past.map((booking) => {
              const teacher = booking.teachers as unknown as { full_name: string; slug: string }
              const rebookUrl = `/${teacher.slug}?subject=${encodeURIComponent(booking.subject)}#booking`
              return (
                <div key={booking.id} className="border rounded-lg p-4 space-y-2">
                  <p className="font-medium">{booking.student_name} — {booking.subject}</p>
                  <p className="text-sm text-muted-foreground">
                    {booking.booking_date} at {booking.start_time.slice(0, 5)}
                  </p>
                  <p className="text-sm text-muted-foreground">with {teacher.full_name}</p>
                  <a
                    href={rebookUrl}
                    className="inline-block text-sm font-medium underline underline-offset-2 hover:opacity-80 transition-opacity"
                  >
                    Rebook
                  </a>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
