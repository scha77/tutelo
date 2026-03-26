import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WaitlistEntryRow } from '@/components/dashboard/WaitlistEntryRow'
import { removeWaitlistEntry } from '@/actions/waitlist'
import Link from 'next/link'

export default async function WaitlistPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: teacher } = await supabase
    .from('teachers')
    .select('id, capacity_limit')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!teacher) redirect('/onboarding')

  const { data: entries } = await supabase
    .from('waitlist')
    .select('id, parent_email, created_at, notified_at')
    .eq('teacher_id', teacher.id)
    .order('created_at', { ascending: true })

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-foreground mb-6">Waitlist</h1>

      {teacher.capacity_limit == null ? (
        <p className="text-sm text-muted-foreground">
          Set a capacity limit in{' '}
          <Link href="/dashboard/settings" className="underline hover:text-foreground transition-colors">
            Settings
          </Link>{' '}
          to enable the waitlist feature.
        </p>
      ) : !entries || entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No one on your waitlist yet.
        </p>
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
