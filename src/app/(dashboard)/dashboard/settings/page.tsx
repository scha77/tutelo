import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AccountSettings } from '@/components/dashboard/AccountSettings'
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
    .select('id, full_name, school, city, state, years_experience, photo_url, subjects, grade_levels, timezone, phone_number, sms_opt_in, verified_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (!teacher) redirect('/onboarding')

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
      <SessionTypeManager sessionTypes={sessionTypes ?? []} />
      <SchoolEmailVerification
        isVerified={!!teacher.verified_at}
        verifiedParam={params.verified === 'true'}
        errorParam={params.error}
      />
    </div>
  )
}
