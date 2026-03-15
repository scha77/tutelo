'use client'

import * as m from 'motion/react-client'
import { AnimatePresence } from 'motion/react'
import { pageFade } from '@/lib/animation'

interface PageTransitionProps {
  children: React.ReactNode
  transitionKey: string
}

/**
 * Reusable page transition wrapper.
 *
 * Pair with template.tsx (which remounts on every navigation) to get
 * AnimatePresence-driven fade transitions between routes.
 */
export function PageTransition({ children, transitionKey }: PageTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      <m.div key={transitionKey} {...pageFade}>
        {children}
      </m.div>
    </AnimatePresence>
  )
}
