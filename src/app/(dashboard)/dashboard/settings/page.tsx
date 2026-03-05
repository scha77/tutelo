import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AccountSettings } from '@/components/dashboard/AccountSettings'

export default async function DashboardSettingsPage() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) redirect('/login')

  const { data: teacher } = await supabase
    .from('teachers')
    .select('full_name, school, city, state, years_experience, photo_url, subjects, grade_levels, timezone')
    .eq('user_id', userId)
    .maybeSingle()

  if (!teacher) redirect('/onboarding')

  return <AccountSettings teacher={teacher} />
}
