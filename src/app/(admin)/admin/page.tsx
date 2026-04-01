import { supabaseAdmin } from '@/lib/supabase/service'

type ActivityEvent = {
  type: 'signup' | 'booking' | 'completion'
  description: string
  timestamp: string
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60_000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const badgeStyles: Record<ActivityEvent['type'], string> = {
  signup: 'bg-green-50 text-green-700',
  booking: 'bg-blue-50 text-blue-700',
  completion: 'bg-purple-50 text-purple-700',
}

const badgeLabels: Record<ActivityEvent['type'], string> = {
  signup: 'Signup',
  booking: 'Booking',
  completion: 'Completed',
}

export default async function AdminPage() {
  // Fetch all metrics and activity data in parallel
  const [
    totalTeachersRes,
    activeTeachersRes,
    publishedTeachersRes,
    totalBookingsRes,
    completedBookingsRes,
    revenueRes,
    recentSignupsRes,
    recentBookingsRes,
    recentCompletionsRes,
  ] = await Promise.all([
    // Metric counts
    supabaseAdmin
      .from('teachers')
      .select('*', { count: 'exact', head: true }),
    supabaseAdmin
      .from('teachers')
      .select('*', { count: 'exact', head: true })
      .eq('stripe_charges_enabled', true),
    supabaseAdmin
      .from('teachers')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true),
    supabaseAdmin
      .from('bookings')
      .select('*', { count: 'exact', head: true }),
    supabaseAdmin
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed'),
    supabaseAdmin
      .from('bookings')
      .select('amount_cents')
      .eq('status', 'completed'),
    // Activity feed
    supabaseAdmin
      .from('teachers')
      .select('full_name, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    supabaseAdmin
      .from('bookings')
      .select('student_name, created_at, status')
      .order('created_at', { ascending: false })
      .limit(5),
    supabaseAdmin
      .from('bookings')
      .select('student_name, updated_at, status')
      .eq('status', 'completed')
      .order('updated_at', { ascending: false })
      .limit(5),
  ])

  // Compute revenue from completed bookings
  const totalCents =
    revenueRes.data?.reduce(
      (sum, row) => sum + (row.amount_cents ?? 0),
      0,
    ) ?? 0

  const revenue = (totalCents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  })

  // Build activity feed
  const events: ActivityEvent[] = []

  for (const t of recentSignupsRes.data ?? []) {
    events.push({
      type: 'signup',
      description: `${t.full_name} signed up as a teacher`,
      timestamp: t.created_at,
    })
  }

  for (const b of recentBookingsRes.data ?? []) {
    events.push({
      type: 'booking',
      description: `${b.student_name} booked a session (${b.status})`,
      timestamp: b.created_at,
    })
  }

  for (const c of recentCompletionsRes.data ?? []) {
    events.push({
      type: 'completion',
      description: `${c.student_name}'s session completed`,
      timestamp: c.updated_at,
    })
  }

  // Sort by timestamp descending, take first 15
  events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )
  const feed = events.slice(0, 15)

  const stats = [
    {
      label: 'Total Teachers',
      value: totalTeachersRes.count ?? 0,
      sub: null,
    },
    {
      label: 'Stripe Active',
      value: activeTeachersRes.count ?? 0,
      sub: 'charges enabled',
    },
    {
      label: 'Published',
      value: publishedTeachersRes.count ?? 0,
      sub: 'public profiles',
    },
    {
      label: 'Total Bookings',
      value: totalBookingsRes.count ?? 0,
      sub: null,
    },
    {
      label: 'Completed',
      value: completedBookingsRes.count ?? 0,
      sub: 'sessions done',
    },
    {
      label: 'Revenue',
      value: revenue,
      sub: 'from completed bookings',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <section>
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
          Platform Metrics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {stat.value}
              </p>
              {stat.sub && (
                <p className="mt-0.5 text-xs text-gray-400">{stat.sub}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Activity feed */}
      <section>
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
          Recent Activity
        </h2>
        {feed.length === 0 ? (
          <p className="text-sm text-gray-400">No activity yet.</p>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {feed.map((event, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badgeStyles[event.type]}`}
                >
                  {badgeLabels[event.type]}
                </span>
                <p className="flex-1 text-sm text-gray-700 truncate">
                  {event.description}
                </p>
                <time className="shrink-0 text-xs text-gray-400">
                  {formatRelativeTime(event.timestamp)}
                </time>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
