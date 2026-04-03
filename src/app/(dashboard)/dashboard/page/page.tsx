import { redirect } from 'next/navigation'
import { getTeacher } from '@/lib/supabase/auth-cache'
import { PageSettings } from '@/components/dashboard/PageSettings'

export default async function DashboardPageSection() {
  const { teacher: baseTeacher, supabase, userId } = await getTeacher()
  if (!baseTeacher || !userId) redirect('/login')

  // Page settings needs extra columns not in the cached teacher
  const { data: teacher } = await supabase
    .from('teachers')
    .select('is_published, accent_color, headline, photo_url, banner_url, social_instagram, social_email, social_website')
    .eq('user_id', userId)
    .maybeSingle()

  if (!teacher) redirect('/onboarding')

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Page Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Customize your public profile — headline, banner, accent color, and social links.</p>
      </div>
      <PageSettings teacher={teacher} />
    </div>
  )
}
