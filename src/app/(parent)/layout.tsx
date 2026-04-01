import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ParentSidebar } from '@/components/parent/ParentSidebar'
import { ParentMobileNav } from '@/components/parent/ParentMobileNav'

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData?.user) {
    redirect('/login?redirect=/parent')
  }

  const userId = userData.user.id
  const userEmail = userData.user.email ?? ''

  // Check if user also has a teacher role (for dual-role cross-link)
  const { data: teacher } = await supabase
    .from('teachers')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  // Count children for sidebar badge
  const { count: childrenCount } = await supabase
    .from('children')
    .select('id', { count: 'exact', head: true })
    .eq('parent_id', userId)

  return (
    <div className="flex min-h-screen">
      <ParentSidebar
        userName={userEmail}
        childrenCount={childrenCount ?? 0}
        hasTeacherRole={!!teacher}
      />

      <main className="flex-1 overflow-auto pt-14 pb-16 md:pt-0 md:pb-0">
        {children}
      </main>

      <ParentMobileNav />
    </div>
  )
}
