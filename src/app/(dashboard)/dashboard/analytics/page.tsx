import { redirect } from 'next/navigation'
import { TrendingUp, Eye, BookOpen, CheckCircle2, BarChart3 } from 'lucide-react'
import { getTeacher } from '@/lib/supabase/auth-cache'

export default async function AnalyticsPage() {
  const { teacher, supabase } = await getTeacher()
  if (!teacher) redirect('/login')

  // ── Analytics queries (all parallel) ────────────────────────────────────
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: totalViews },
    { count: recentViews },
    { count: completedBookings },
    { count: activeBookings },
  ] = await Promise.all([
    supabase
      .from('page_views')
      .select('id', { count: 'exact', head: true })
      .eq('teacher_id', teacher.id)
      .eq('is_bot', false),
    supabase
      .from('page_views')
      .select('id', { count: 'exact', head: true })
      .eq('teacher_id', teacher.id)
      .eq('is_bot', false)
      .gte('viewed_at', thirtyDaysAgo),
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('teacher_id', teacher.id)
      .eq('status', 'completed'),
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('teacher_id', teacher.id)
      .in('status', ['requested', 'pending', 'confirmed']),
  ])

  // Conversion rate: completed bookings / total views
  const conversionRate =
    totalViews && totalViews > 0
      ? ((completedBookings ?? 0) / totalViews) * 100
      : null

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          How parents are finding and booking with you.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Eye}
          label="Total page views"
          value={formatCount(totalViews)}
          sub="All time, bots excluded"
        />
        <StatCard
          icon={TrendingUp}
          label="Views (last 30 days)"
          value={formatCount(recentViews)}
          sub="Rolling 30-day window"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed bookings"
          value={formatCount(completedBookings)}
          sub="All time"
        />
        <StatCard
          icon={BarChart3}
          label="Conversion rate"
          value={conversionRate != null ? `${conversionRate.toFixed(1)}%` : '—'}
          sub="Completed bookings / views"
        />
      </div>

      {/* Funnel */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="mb-4 text-base font-semibold">Booking funnel</h2>
        <div className="space-y-3">
          <FunnelRow
            label="Profile views"
            count={totalViews ?? 0}
            max={totalViews ?? 0}
            color="bg-blue-500"
          />
          <FunnelRow
            label="Booking form opens"
            count={null}
            max={totalViews ?? 0}
            color="bg-indigo-500"
            placeholder="Coming soon"
          />
          <FunnelRow
            label="Active bookings"
            count={activeBookings ?? 0}
            max={totalViews ?? 0}
            color="bg-violet-500"
          />
          <FunnelRow
            label="Completed sessions"
            count={completedBookings ?? 0}
            max={totalViews ?? 0}
            color="bg-emerald-500"
          />
        </div>
      </div>

      {/* Empty state nudge if no views yet */}
      {(totalViews ?? 0) === 0 && (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <BookOpen className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">No views yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Share your page link or QR code to start tracking visits.
          </p>
          <a
            href={`/dashboard/promote`}
            className="mt-4 inline-block text-sm font-medium text-primary underline underline-offset-4"
          >
            Go to Promote
          </a>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function formatCount(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

interface StatCardProps {
  icon: React.ElementType
  label: string
  value: string
  sub: string
}

function StatCard({ icon: Icon, label, value, sub }: StatCardProps) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  )
}

interface FunnelRowProps {
  label: string
  count: number | null
  max: number
  color: string
  placeholder?: string
}

function FunnelRow({ label, count, max, color, placeholder }: FunnelRowProps) {
  const pct = count != null && max > 0 ? Math.min((count / max) * 100, 100) : 0
  const display = count != null ? count.toLocaleString() : placeholder ?? '—'

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={count == null ? 'text-muted-foreground text-xs italic' : 'font-medium'}>
          {display}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        {count != null && (
          <div
            className={`h-2 rounded-full ${color} transition-all`}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
    </div>
  )
}
