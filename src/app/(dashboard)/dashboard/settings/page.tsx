import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AccountSettings } from '@/components/dashboard/AccountSettings'

export default async function DashboardSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const userId = user.id

  const { data: teacher } = await supabase
    .from('teachers')
    .select('full_name, school, city, state, years_experience, photo_url, subjects, grade_levels, timezone, phone_number, sms_opt_in')
    .eq('user_id', userId)
    .maybeSingle()

  if (!teacher) redirect('/onboarding')

  return <AccountSettings teacher={teacher} />
}
