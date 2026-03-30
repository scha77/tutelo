import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AccountSettings } from '@/components/dashboard/AccountSettings'
import { CapacitySettings } from '@/components/dashboard/CapacitySettings'
import { SessionTypeManager } from '@/components/dashboard/SessionTypeManager'
import { SchoolEmailVerification } from '@/components/dashboard/SchoolEmailVerification'

export default async function DashboardSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string; error?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const userId = user.id

  const { data: teacher } = await supabase
    .from('teachers')
    .select('id, full_name, school, city, state, years_experience, photo_url, subjects, grade_levels, timezone, phone_number, sms_opt_in, verified_at, capacity_limit')
    .eq('user_id', userId)
    .maybeSingle()

  if (!teacher) redirect('/onboarding')

  // Count distinct active students (confirmed/completed bookings in last 90 days)
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  const ninetyDaysAgoStr = ninetyDaysAgo.toISOString().split('T')[0]

  const { data: bookings } = await supabase
    .from('bookings')
    .select('student_name')
    .eq('teacher_id', userId)
    .in('status', ['confirmed', 'completed'])
    .gte('booking_date', ninetyDaysAgoStr)

  const activeStudentCount = bookings
    ? new Set(bookings.map((b: { student_name: string }) => b.student_name)).size
    : 0

  // Fetch session types for this teacher (uses teacher.id PK, not auth UID)
  const { data: sessionTypes } = await supabase
    .from('session_types')
    .select('id, label, price, duration_minutes, sort_order')
    .eq('teacher_id', teacher.id)
    .order('sort_order')

  const params = await searchParams

  return (
    <div className="space-y-8">
      <AccountSettings teacher={teacher} />
      <CapacitySettings
        capacityLimit={teacher.capacity_limit ?? null}
        activeStudentCount={activeStudentCount}
      />
      <SessionTypeManager sessionTypes={sessionTypes ?? []} />
      <SchoolEmailVerification
        isVerified={!!teacher.verified_at}
        verifiedParam={params.verified === 'true'}
        errorParam={params.error}
      />
    </div>
  )
}
