import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getAuthUser, getTeacher, getPendingCount } from '@/lib/supabase/auth-cache'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { MobileHeader } from '@/components/dashboard/MobileHeader'
import { MobileBottomNav } from '@/components/dashboard/MobileBottomNav'

/** Edge runtime eliminates serverless cold starts (~500-1500 ms). */
export const runtime = 'edge'

/**
 * Async sub-components rendered inside Suspense so the layout shell
 * paints immediately. The pending count query streams in after.
 */
async function PendingBadgeSidebar({ teacherName, teacherSlug }: { teacherName: string; teacherSlug: string }) {
  const pending = await getPendingCount()
  return <Sidebar teacherName={teacherName} teacherSlug={teacherSlug} pendingCount={pending} />
}

async function PendingBadgeMobileNav() {
  const pending = await getPendingCount()
  return <MobileBottomNav pendingCount={pending} />
}

async function StripeBanner() {
  const { teacher } = await getTeacher()
  if (!teacher || teacher.stripe_charges_enabled) return null

  const pending = await getPendingCount()

  return (
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
  )
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Auth gate — must complete before the shell renders.
  const { user, error: userError } = await getAuthUser()
  if (userError || !user) redirect('/login')

  const { teacher } = await getTeacher()
  if (!teacher) redirect('/onboarding')

  return (
    <div className="flex min-h-screen">
      {/* Sidebar: shows immediately with 0 badge, then streams in real count */}
      <Suspense fallback={<Sidebar teacherName={teacher.full_name} teacherSlug={teacher.slug} pendingCount={0} />}>
        <PendingBadgeSidebar teacherName={teacher.full_name} teacherSlug={teacher.slug} />
      </Suspense>

      <MobileHeader teacherName={teacher.full_name} teacherSlug={teacher.slug} />

      <main className="flex-1 overflow-auto pt-14 pb-safe-nav md:pt-0 md:pb-0">
        <Suspense fallback={null}>
          <StripeBanner />
        </Suspense>
        {children}
      </main>

      <Suspense fallback={<MobileBottomNav pendingCount={0} />}>
        <PendingBadgeMobileNav />
      </Suspense>
    </div>
  )
}
