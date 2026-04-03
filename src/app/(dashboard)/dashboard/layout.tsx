import { redirect } from 'next/navigation'
import { getAuthUser, getTeacher } from '@/lib/supabase/auth-cache'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { MobileHeader } from '@/components/dashboard/MobileHeader'
import { MobileBottomNav } from '@/components/dashboard/MobileBottomNav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Cached — child pages calling getAuthUser()/getTeacher() reuse this result.
  const { user, error: userError } = await getAuthUser()
  if (userError || !user) {
    redirect('/login')
  }

  const { teacher, supabase } = await getTeacher()

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
