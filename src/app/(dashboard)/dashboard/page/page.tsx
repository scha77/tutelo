import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageSettings } from '@/components/dashboard/PageSettings'

export default async function DashboardPageSection() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) redirect('/login')

  const { data: teacher } = await supabase
    .from('teachers')
    .select('is_published, accent_color, headline, banner_url, social_instagram, social_email, social_website')
    .eq('user_id', userId)
    .maybeSingle()

  if (!teacher) redirect('/onboarding')

  return <PageSettings teacher={teacher} />
}
