import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { QRCodeCard } from '@/components/dashboard/QRCodeCard'
import { FlyerPreview } from '@/components/dashboard/FlyerPreview'
import { SwipeFileSection } from './SwipeFileSection'

export default async function PromotePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: teacher } = await supabase
    .from('teachers')
    .select(
      'slug, full_name, subjects, hourly_rate, school, bio, headline, grade_levels, city, state'
    )
    .eq('user_id', user.id)
    .maybeSingle()

  if (!teacher) redirect('/onboarding')

  return (
    <div className="p-6 max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Promote Your Page</h1>
        <p className="mt-1 text-sm text-muted-foreground">QR codes, printable flyers, and ready-to-send messages to share with parents.</p>
      </div>

      <QRCodeCard slug={teacher.slug} />

      <FlyerPreview slug={teacher.slug} />

      <SwipeFileSection
        teacherData={{
          full_name: teacher.full_name,
          slug: teacher.slug,
          subjects: teacher.subjects,
          hourly_rate: teacher.hourly_rate,
          school: teacher.school ?? null,
          city: teacher.city ?? null,
          state: teacher.state ?? null,
          bio: teacher.bio ?? null,
          headline: teacher.headline ?? null,
          grade_levels: teacher.grade_levels ?? null,
        }}
      />
    </div>
  )
}
