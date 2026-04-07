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

  // Auth redirect is handled by middleware (src/middleware.ts) at the edge.
  // By the time we reach this layout, the user is authenticated.
  // getClaims() is still used to extract user ID and email for the layout data queries.
  const { data: claimsData } = await supabase.auth.getClaims()
  if (!claimsData?.claims?.sub) {
    // Defensive fallback — should not happen since middleware verified auth
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
