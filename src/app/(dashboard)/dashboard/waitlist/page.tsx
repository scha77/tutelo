import { redirect } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import { getTeacher } from '@/lib/supabase/auth-cache'
import { WaitlistEntryRow } from '@/components/dashboard/WaitlistEntryRow'
import { removeWaitlistEntry } from '@/actions/waitlist'
import { ClipboardList } from 'lucide-react'
import Link from 'next/link'

/** Waitlist entries cached for 30 s. */
function getCachedWaitlistData(teacherId: string) {
  return unstable_cache(
    async () => {
      const { supabaseAdmin: supabase } = await import('@/lib/supabase/service')

      const { data } = await supabase
        .from('waitlist')
        .select('id, parent_email, created_at, notified_at')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: true })

      return data ?? []
    },
    [`waitlist-${teacherId}`],
    { revalidate: 30, tags: [`waitlist-${teacherId}`] },
  )()
}

export default async function WaitlistPage() {
  const { teacher } = await getTeacher()
  if (!teacher) redirect('/login')

  const entries = await getCachedWaitlistData(teacher.id)

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Waitlist</h1>
        <p className="mt-1 text-sm text-muted-foreground">Parents waiting for an open spot in your schedule.</p>
      </div>

      {teacher.capacity_limit == null ? (
        <p className="text-sm text-muted-foreground">
          Set a capacity limit in{' '}
          <Link href="/dashboard/settings" className="underline hover:text-foreground transition-colors">
            Settings
          </Link>{' '}
          to enable the waitlist feature.
        </p>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <ClipboardList className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            No one on your waitlist yet.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <WaitlistEntryRow
              key={entry.id}
              entry={entry}
              removeAction={removeWaitlistEntry}
            />
          ))}
        </div>
      )}
    </div>
  )
}
