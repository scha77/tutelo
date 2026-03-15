'use client'

import * as m from 'motion/react-client'
import { fadeSlideUp, VIEWPORT_ONCE } from '@/lib/animation'
import type { ReactNode } from 'react'

interface AnimatedProfileProps {
  children: ReactNode
  /** Stagger delay in seconds (e.g. 0, 0.1, 0.15, 0.2). */
  delay?: number
  className?: string
}

/**
 * Thin wrapper that adds a scroll-triggered fade + slide-up reveal to a
 * profile section.  Only adds opacity/transform — never touches colour,
 * layout, or accent styling.
 */
export function AnimatedProfile({ children, delay = 0, className }: AnimatedProfileProps) {
  return (
    <m.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT_ONCE}
      transition={{ ...fadeSlideUp.transition, delay }}
      className={className}
    >
      {children}
    </m.div>
  )
}
