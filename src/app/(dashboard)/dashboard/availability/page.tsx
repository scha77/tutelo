import { redirect } from 'next/navigation'
import { getTeacher } from '@/lib/supabase/auth-cache'
import { AvailabilityEditor } from '@/components/dashboard/AvailabilityEditor'

export default async function DashboardAvailabilityPage() {
  const { teacher, supabase, userId } = await getTeacher()
  if (!teacher || !userId) redirect('/login')

  // Availability needs relation joins — re-query with the cached supabase client
  const { data: teacherWithAvailability } = await supabase
    .from('teachers')
    .select('id, availability(*), availability_overrides(*)')
    .eq('user_id', userId)
    .maybeSingle()

  if (!teacherWithAvailability) redirect('/onboarding')

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Availability</h1>
        <p className="mt-1 text-sm text-muted-foreground">Set your weekly schedule and add date-specific overrides.</p>
      </div>
      <AvailabilityEditor
        initialSlots={teacherWithAvailability.availability ?? []}
        initialOverrides={teacherWithAvailability.availability_overrides ?? []}
      />
    </div>
  )
}
