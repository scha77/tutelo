import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AvailabilityEditor } from '@/components/dashboard/AvailabilityEditor'

export default async function DashboardAvailabilityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const userId = user.id

  const { data: teacher } = await supabase
    .from('teachers')
    .select('id, availability(*), availability_overrides(*)')
    .eq('user_id', userId)
    .maybeSingle()

  if (!teacher) redirect('/onboarding')

  return (
    <AvailabilityEditor
      initialSlots={teacher.availability ?? []}
      initialOverrides={teacher.availability_overrides ?? []}
    />
  )
}
