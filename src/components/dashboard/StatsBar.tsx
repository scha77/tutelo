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
      <m.div variants={staggerItem} className="rounded-lg bg-muted/30 p-4 shadow-sm">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <DollarSign className="h-4 w-4" />
          <span className="text-sm font-medium">Total Earned</span>
        </div>
        <p className="text-2xl font-bold text-foreground">{totalEarned}</p>
      </m.div>

      <m.div variants={staggerItem} className="rounded-lg bg-muted/30 p-4 shadow-sm">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <CalendarCheck className="h-4 w-4" />
          <span className="text-sm font-medium">Upcoming Sessions</span>
        </div>
        <p className="text-2xl font-bold text-foreground">{upcomingCount}</p>
      </m.div>

      <m.div variants={staggerItem} className="rounded-lg bg-muted/30 p-4 shadow-sm">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <Users className="h-4 w-4" />
          <span className="text-sm font-medium">Students</span>
        </div>
        <p className="text-2xl font-bold text-foreground">{studentCount}</p>
      </m.div>
    </m.div>
  )
}
