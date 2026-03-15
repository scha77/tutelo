'use client'

import * as m from 'motion/react-client'
import type { Variants } from 'motion/react'
import { fadeSlideUp, VIEWPORT_ONCE } from '@/lib/animation'

interface AnimatedSectionProps {
  children: React.ReactNode
  className?: string
  delay?: number
  variants?: Variants
  /** When true, uses variant-based stagger mode (hidden/visible) instead of direct props. */
  stagger?: boolean
}

/**
 * Thin client wrapper that scroll-reveals its children using whileInView.
 * Default animation is fadeSlideUp; pass `variants` + `stagger` for stagger containers.
 */
export function AnimatedSection({
  children,
  className,
  delay = 0,
  variants,
  stagger = false,
}: AnimatedSectionProps) {
  if (stagger && variants) {
    return (
      <m.div
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT_ONCE}
        variants={variants}
        className={className}
      >
        {children}
      </m.div>
    )
  }

  return (
    <m.div
      initial={fadeSlideUp.initial}
      whileInView={fadeSlideUp.animate}
      viewport={VIEWPORT_ONCE}
      transition={{
        ...fadeSlideUp.transition,
        delay,
      }}
      className={className}
    >
      {children}
    </m.div>
  )
}
