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

  // Fast local JWT decode — proxy already verified/refreshed the session
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  if (claimsError || !claimsData?.claims?.sub) {
    redirect('/login?redirect=/parent')
  }

  const userId = claimsData.claims.sub as string
  const userEmail = (claimsData.claims.email as string) ?? ''

  // Parallelize the two independent queries
  const [teacherResult, childrenResult] = await Promise.all([
    supabase.from('teachers').select('id').eq('user_id', userId).maybeSingle(),
    supabase.from('children').select('id', { count: 'exact', head: true }).eq('parent_id', userId),
  ])

  const teacher = teacherResult.data
  const childrenCount = childrenResult.count

  return (
    <div className="flex min-h-screen">
      <ParentSidebar
        userName={userEmail}
        childrenCount={childrenCount ?? 0}
        hasTeacherRole={!!teacher}
      />

      <main className="flex-1 overflow-auto pt-14 pb-safe-nav md:pt-0 md:pb-0">
        {children}
      </main>

      <ParentMobileNav />
    </div>
  )
}
