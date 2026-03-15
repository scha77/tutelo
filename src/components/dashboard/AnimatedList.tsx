'use client'

import * as m from 'motion/react-client'
import { staggerContainer, staggerItem } from '@/lib/animation'
import type { ReactNode } from 'react'

interface AnimatedListProps {
  children: ReactNode
  className?: string
}

/** Staggered list container — wraps items in a motion.ul with stagger timing. */
export function AnimatedList({ children, className }: AnimatedListProps) {
  return (
    <m.ul
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </m.ul>
  )
}

interface AnimatedListItemProps {
  children: ReactNode
  className?: string
}

/** Single item inside an AnimatedList — fades + slides up with stagger delay. */
export function AnimatedListItem({ children, className }: AnimatedListItemProps) {
  return (
    <m.li variants={staggerItem} className={className}>
      {children}
    </m.li>
  )
}
