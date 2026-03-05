import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/dashboard/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Auth check — require authenticated user
  const { data: claimsData } = await supabase.auth.getClaims()
  if (!claimsData?.claims) {
    redirect('/login')
  }

  const userId = claimsData.claims.sub

  // Fetch teacher row for the logged-in user
  const { data: teacher } = await supabase
    .from('teachers')
    .select('id, full_name, slug, is_published')
    .eq('user_id', userId)
    .maybeSingle()

  // If no teacher row, send to onboarding
  if (!teacher) {
    redirect('/onboarding')
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar teacherName={teacher.full_name} teacherSlug={teacher.slug} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
