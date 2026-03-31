import { supabaseAdmin } from '@/lib/supabase/service'
import { CancelSeriesForm } from './CancelSeriesForm'

// ---------------------------------------------------------------------------
// ManagePage — RSC shell (resolves cancel_token, handles error states)
// No auth required — the token IS the authentication.
// ---------------------------------------------------------------------------
export default async function ManagePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  // Look up schedule by cancel_token
  const { data: schedule } = await supabaseAdmin
    .from('recurring_schedules')
    .select('id, teacher_id, student_name, subject, start_time')
    .eq('cancel_token', token)
    .maybeSingle()

  if (!schedule) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-2">
          <h1 className="text-xl font-semibold">Invalid or expired link</h1>
          <p className="text-muted-foreground">
            This manage link is invalid or has expired. Please check the link in
            your email and try again.
          </p>
        </div>
      </main>
    )
  }

  // Fetch teacher name for display
  const { data: teacher } = await supabaseAdmin
    .from('teachers')
    .select('full_name')
    .eq('id', schedule.teacher_id)
    .single()

  const teacherName = teacher?.full_name ?? 'your teacher'

  const todayStr = new Date().toISOString().split('T')[0]

  // Fetch all non-cancelled future bookings for this schedule
  const { data: futureBookings } = await supabaseAdmin
    .from('bookings')
    .select('id, student_name, subject, booking_date, start_time, status')
    .eq('recurring_schedule_id', schedule.id)
    .gte('booking_date', todayStr)
    .in('status', ['requested', 'confirmed', 'payment_failed'])
    .order('booking_date', { ascending: true })

  const sessions = futureBookings ?? []

  if (sessions.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-2">
          <h1 className="text-xl font-semibold">All sessions cancelled</h1>
          <p className="text-muted-foreground">
            All sessions in this series have already been cancelled or completed.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Manage Your Series</h1>
          <p className="text-muted-foreground">
            {schedule.student_name}&apos;s {schedule.subject} sessions with{' '}
            {teacherName}
          </p>
        </div>
        <CancelSeriesForm
          sessions={sessions}
          token={token}
          teacherName={teacherName}
        />
      </div>
    </main>
  )
}
