'use client'

import * as m from 'motion/react-client'
import { microPress } from '@/lib/animation'

interface AnimatedButtonProps {
  children: React.ReactNode
  className?: string
}

/**
 * Micro-interaction wrapper for primary action buttons.
 *
 * Wraps children in a motion.div that applies:
 * - Scale to 0.97 on tap (press feedback)
 * - Scale to 1.02 on hover (subtle lift)
 * - Spring transition for snappy feel
 *
 * This is a wrapper, not a replacement — place it around existing
 * <Button>, <button>, or <Link> elements.
 */
export function AnimatedButton({ children, className }: AnimatedButtonProps) {
  return (
    <m.div
      whileTap={microPress.whileTap}
      whileHover={{ scale: 1.02 }}
      transition={microPress.transition}
      className={className}
    >
      {children}
    </m.div>
  )
}
