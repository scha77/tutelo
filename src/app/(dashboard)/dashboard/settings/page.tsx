import { redirect } from 'next/navigation'
import { getTeacher } from '@/lib/supabase/auth-cache'
import { AccountSettings } from '@/components/dashboard/AccountSettings'
import { CapacitySettings } from '@/components/dashboard/CapacitySettings'
import { SessionTypeManager } from '@/components/dashboard/SessionTypeManager'
import { SchoolEmailVerification } from '@/components/dashboard/SchoolEmailVerification'

export default async function DashboardSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string; error?: string }>
}) {
  const { teacher: baseTeacher, supabase, userId } = await getTeacher()
  if (!baseTeacher || !userId) redirect('/login')

  // Settings needs extra columns not in the cached teacher
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
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="px-6 pt-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account, capacity, session types, and verification.</p>
      </div>
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
