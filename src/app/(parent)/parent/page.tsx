import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, CalendarCheck, History, Plus, Search } from 'lucide-react'

export const metadata = { title: 'Parent Dashboard — Tutelo' }

export default async function ParentOverviewPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/parent')

  const userId = user.id

  // Parallel queries for stats
  const [childrenResult, upcomingResult, pastResult] = await Promise.all([
    supabase
      .from('children')
      .select('id', { count: 'exact', head: true })
      .eq('parent_id', userId),
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('parent_id', userId)
      .in('status', ['confirmed', 'requested']),
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('parent_id', userId)
      .eq('status', 'completed'),
  ])

  const childrenCount = childrenResult.count ?? 0
  const upcomingCount = upcomingResult.count ?? 0
  const pastCount = pastResult.count ?? 0

  return (
    <div className="p-6 md:p-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome back!</h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s an overview of your family&apos;s tutoring activity.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Children
            </CardTitle>
            <div className="rounded-lg p-2" style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 12%, transparent)' }}>
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{childrenCount}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Upcoming Sessions
            </CardTitle>
            <div className="rounded-lg p-2" style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 12%, transparent)' }}>
              <CalendarCheck className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{upcomingCount}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Past Sessions
            </CardTitle>
            <div className="rounded-lg p-2" style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 12%, transparent)' }}>
              <History className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pastCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/parent/children">
            <Plus className="mr-2 h-4 w-4" />
            Add a Child
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/tutors">
            <Search className="mr-2 h-4 w-4" />
            Find a Tutor
          </Link>
        </Button>
      </div>
    </div>
  )
}
