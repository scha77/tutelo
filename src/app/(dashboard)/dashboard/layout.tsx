import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { MobileHeader } from '@/components/dashboard/MobileHeader'
import { MobileBottomNav } from '@/components/dashboard/MobileBottomNav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Auth check — use getUser() for verified identity (makes API call to Supabase Auth).
  // getClaims() reads only from cookies and can fail on server-action POST re-renders.
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData?.user) {
    redirect('/login')
  }

  const userId = userData.user.id

  // Fetch teacher row for the logged-in user (includes stripe_charges_enabled for banner)
  const { data: teacher } = await supabase
    .from('teachers')
    .select('id, full_name, slug, is_published, stripe_charges_enabled')
    .eq('user_id', userId)
    .maybeSingle()

  // If no teacher row, send to onboarding
  if (!teacher) {
    redirect('/onboarding')
  }

  // Count pending booking requests for badge + banner
  const { count: pendingCount } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('teacher_id', teacher.id)
    .eq('status', 'requested')

  const pending = pendingCount ?? 0

  return (
    <div className="flex min-h-screen">
      <Sidebar
        teacherName={teacher.full_name}
        teacherSlug={teacher.slug}
        pendingCount={pending}
      />

      {/* Mobile header — fixed top bar, hidden on desktop */}
      <MobileHeader
        teacherName={teacher.full_name}
        teacherSlug={teacher.slug}
      />

      <main className="flex-1 overflow-auto pt-14 pb-safe-nav md:pt-0 md:pb-0">
        {!teacher.stripe_charges_enabled && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center justify-between gap-4">
            <p className="text-sm text-amber-800 font-medium">
              {pending > 0
                ? `You have ${pending} pending request${pending !== 1 ? 's' : ''}! Connect Stripe to confirm ${pending === 1 ? 'it' : 'them'}.`
                : 'Connect Stripe to start accepting payments from parents.'}
            </p>
            <a
              href="/dashboard/connect-stripe"
              className="shrink-0 rounded-md bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700 transition-colors"
            >
              Activate Payments →
            </a>
          </div>
        )}
        {children}
      </main>

      {/* Mobile bottom nav — fixed bottom bar, hidden on desktop */}
      <MobileBottomNav pendingCount={pending} />
    </div>
  )
}
