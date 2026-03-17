import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageSettings } from '@/components/dashboard/PageSettings'

export default async function DashboardPageSection() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const userId = user.id

  const { data: teacher } = await supabase
    .from('teachers')
    .select('is_published, accent_color, headline, banner_url, social_instagram, social_email, social_website')
    .eq('user_id', userId)
    .maybeSingle()

  if (!teacher) redirect('/onboarding')

  return <PageSettings teacher={teacher} />
}
