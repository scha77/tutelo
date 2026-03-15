/**
 * Shared animation constants for Tutelo.
 *
 * All motion variants, transition presets, and viewport configs live here so
 * every animated surface stays visually consistent.
 *
 * Import from "motion/react-client" in consumer components (App Router
 * optimised client bundle).
 */

import type { Variants, Transition } from 'motion/react'

/* ------------------------------------------------------------------ */
/*  Transitions                                                        */
/* ------------------------------------------------------------------ */

/** Standard enter transition — used for section reveals. */
export const enterTransition: Transition = {
  duration: 0.4,
  ease: 'easeOut',
}

/** Fast enter — used for micro-interactions & page fades. */
export const fastTransition: Transition = {
  duration: 0.25,
  ease: 'easeOut',
}

/** Interactive spring — buttons, toggles, press feedback. */
export const springTransition: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 20,
}

/* ------------------------------------------------------------------ */
/*  Section reveal — fadeSlideUp                                       */
/* ------------------------------------------------------------------ */

/** Fade + slide up for scroll-triggered section reveals. */
export const fadeSlideUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { ...enterTransition },
} as const

/* ------------------------------------------------------------------ */
/*  Stagger containers                                                 */
/* ------------------------------------------------------------------ */

/** Stagger container for list items (fast). */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
    },
  },
}

/** Stagger container for landing sections (slightly slower). */
export const staggerContainerSlow: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

/** Child variant for use inside stagger containers. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { ...enterTransition },
  },
}

/* ------------------------------------------------------------------ */
/*  Page transitions — pageFade                                        */
/* ------------------------------------------------------------------ */

/** Full-page fade for route transitions via template.tsx. */
export const pageFade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { ...fastTransition },
} as const

/* ------------------------------------------------------------------ */
/*  Onboarding — slideStep                                             */
/* ------------------------------------------------------------------ */

/** Directional slide for onboarding wizard steps. */
export const slideStep: Variants = {
  initial: (direction: number) => ({
    x: direction > 0 ? 30 : -30,
    opacity: 0,
  }),
  animate: {
    x: 0,
    opacity: 1,
    transition: { ...enterTransition },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -30 : 30,
    opacity: 0,
    transition: { duration: 0.25, ease: 'easeIn' },
  }),
}

/* ------------------------------------------------------------------ */
/*  Micro-interactions — microPress                                    */
/* ------------------------------------------------------------------ */

/** Press feedback for buttons and interactive elements. */
export const microPress = {
  whileTap: { scale: 0.97 },
  transition: { ...springTransition },
} as const

/* ------------------------------------------------------------------ */
/*  Viewport config                                                    */
/* ------------------------------------------------------------------ */

/** Shared viewport config — animate once, with negative margin for early trigger. */
export const VIEWPORT_ONCE = { once: true, margin: '-50px' as const }
