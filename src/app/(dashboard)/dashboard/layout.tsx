import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getTeacher, getPendingCount } from '@/lib/supabase/auth-cache'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { MobileHeader } from '@/components/dashboard/MobileHeader'
import { MobileBottomNav } from '@/components/dashboard/MobileBottomNav'

/**
 * Async sub-component that resolves teacher data + pending count,
 * then renders the full sidebar. Wrapped in Suspense so the layout
 * shell streams immediately.
 */
async function DashboardSidebar() {
  const { teacher } = await getTeacher()
  if (!teacher) redirect('/onboarding')
  const pending = await getPendingCount()
  return <Sidebar teacherName={teacher.full_name} teacherSlug={teacher.slug} pendingCount={pending} />
}

async function DashboardMobileHeader() {
  const { teacher } = await getTeacher()
  if (!teacher) return null
  return <MobileHeader teacherName={teacher.full_name} teacherSlug={teacher.slug} />
}

async function DashboardMobileNav() {
  const { teacher } = await getTeacher()
  if (!teacher) return null
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

/**
 * Skeleton sidebar for the Suspense fallback — matches Sidebar layout
 * so there's no layout shift when the real sidebar streams in.
 */
function SidebarSkeleton() {
  return (
    <aside className="hidden md:flex md:w-56 md:flex-col md:border-r md:bg-white">
      <div className="p-4 animate-pulse">
        <div className="h-8 w-32 rounded bg-muted-foreground/10 mb-6" />
        <div className="space-y-3">
          <div className="h-8 w-full rounded bg-muted-foreground/10" />
          <div className="h-8 w-full rounded bg-muted-foreground/10" />
          <div className="h-8 w-full rounded bg-muted-foreground/10" />
          <div className="h-8 w-full rounded bg-muted-foreground/10" />
        </div>
      </div>
    </aside>
  )
}

/**
 * Skeleton mobile header — matches MobileHeader height so content
 * doesn't jump when the real header streams in.
 */
function MobileHeaderSkeleton() {
  return (
    <header className="fixed top-0 left-0 right-0 z-30 md:hidden bg-white border-b h-14">
      <div className="flex items-center justify-between h-full px-4 animate-pulse">
        <div className="h-6 w-24 rounded bg-muted-foreground/10" />
        <div className="h-6 w-6 rounded bg-muted-foreground/10" />
      </div>
    </header>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Auth redirect is handled by the proxy (src/proxy.ts) at the edge.
  // By the time we reach this layout, the user is authenticated.
  //
  // Teacher data (name, slug) and pending count are fetched inside
  // Suspense-wrapped async components so the layout shell streams
  // immediately — the sidebar, header, and nav stream in as data resolves.
  // On a warm cache (unstable_cache 60s TTL), this is nearly instant.

  return (
    <div className="flex min-h-screen">
      <Suspense fallback={<SidebarSkeleton />}>
        <DashboardSidebar />
      </Suspense>

      <Suspense fallback={<MobileHeaderSkeleton />}>
        <DashboardMobileHeader />
      </Suspense>

      <main className="flex-1 overflow-auto pt-14 pb-safe-nav md:pt-0 md:pb-0">
        <Suspense fallback={null}>
          <StripeBanner />
        </Suspense>
        {children}
      </main>

      <Suspense fallback={<MobileBottomNav pendingCount={0} />}>
        <DashboardMobileNav />
      </Suspense>
    </div>
  )
}
