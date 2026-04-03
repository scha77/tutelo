'use client'

import * as m from 'motion/react-client'

interface PageTransitionProps {
  children: React.ReactNode
  transitionKey: string
}

/**
 * Reusable page transition wrapper.
 *
 * Uses a simple fade-in on mount. No exit animation — the incoming page
 * renders immediately without waiting for the outgoing page to animate out.
 * This eliminates the perceived "lag" that mode="wait" AnimatePresence caused.
 */
export function PageTransition({ children, transitionKey }: PageTransitionProps) {
  return (
    <m.div
      key={transitionKey}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
    >
      {children}
    </m.div>
  )
}
