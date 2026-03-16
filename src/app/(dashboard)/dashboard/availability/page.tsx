import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AvailabilityEditor } from '@/components/dashboard/AvailabilityEditor'

export default async function DashboardAvailabilityPage() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) redirect('/login')

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
