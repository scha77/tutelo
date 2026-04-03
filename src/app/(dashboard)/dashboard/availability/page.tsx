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
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Availability</h1>
        <p className="mt-1 text-sm text-muted-foreground">Set your weekly schedule and add date-specific overrides.</p>
      </div>
      <AvailabilityEditor
        initialSlots={teacher.availability ?? []}
        initialOverrides={teacher.availability_overrides ?? []}
      />
    </div>
  )
}
