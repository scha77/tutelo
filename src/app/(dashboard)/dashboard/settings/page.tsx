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

  // Settings needs extra columns not in the cached teacher — run all 3 queries in parallel
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  const ninetyDaysAgoStr = ninetyDaysAgo.toISOString().split('T')[0]

  const [teacherResult, bookingsResult, sessionTypesResult] = await Promise.all([
    supabase
      .from('teachers')
      .select('id, full_name, school, city, state, years_experience, photo_url, subjects, grade_levels, timezone, phone_number, sms_opt_in, verified_at, capacity_limit')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('bookings')
      .select('student_name')
      .eq('teacher_id', userId)
      .in('status', ['confirmed', 'completed'])
      .gte('booking_date', ninetyDaysAgoStr),
    supabase
      .from('session_types')
      .select('id, label, price, duration_minutes, sort_order')
      .eq('teacher_id', baseTeacher.id)
      .order('sort_order'),
  ])

  const teacher = teacherResult.data
  if (!teacher) redirect('/onboarding')

  const activeStudentCount = bookingsResult.data
    ? new Set(bookingsResult.data.map((b: { student_name: string }) => b.student_name)).size
    : 0
  const sessionTypes = sessionTypesResult.data

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
