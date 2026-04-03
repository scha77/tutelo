'use client'

import * as m from 'motion/react-client'
import { staggerContainer, staggerItem } from '@/lib/animation'
import { DollarSign, CalendarCheck, Users } from 'lucide-react'

interface StatsBarProps {
  totalEarnedCents: number
  upcomingCount: number
  studentCount: number
}

export function StatsBar({ totalEarnedCents, upcomingCount, studentCount }: StatsBarProps) {
  const totalEarned = (totalEarnedCents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  })

  return (
    <m.div
      className="grid grid-cols-1 gap-4 md:grid-cols-3"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <m.div variants={staggerItem} className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="rounded-lg p-2"
            style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 12%, transparent)' }}
          >
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">Total Earned</span>
        </div>
        <p className="text-2xl font-bold text-foreground mt-2">{totalEarned}</p>
      </m.div>

      <m.div variants={staggerItem} className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="rounded-lg p-2"
            style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 12%, transparent)' }}
          >
            <CalendarCheck className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">Upcoming Sessions</span>
        </div>
        <p className="text-2xl font-bold text-foreground mt-2">{upcomingCount}</p>
      </m.div>

      <m.div variants={staggerItem} className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="rounded-lg p-2"
            style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 12%, transparent)' }}
          >
            <Users className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">Students</span>
        </div>
        <p className="text-2xl font-bold text-foreground mt-2">{studentCount}</p>
      </m.div>
    </m.div>
  )
}
