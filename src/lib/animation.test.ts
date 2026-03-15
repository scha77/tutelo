import { describe, it, expect } from 'vitest'
import {
  fadeSlideUp,
  staggerContainer,
  staggerContainerSlow,
  staggerItem,
  pageFade,
  slideStep,
  microPress,
  VIEWPORT_ONCE,
  enterTransition,
  fastTransition,
  springTransition,
} from './animation'

describe('animation constants', () => {
  describe('fadeSlideUp', () => {
    it('has initial with opacity 0 and positive y', () => {
      expect(fadeSlideUp.initial.opacity).toBe(0)
      expect(fadeSlideUp.initial.y).toBeGreaterThan(0)
    })

    it('has animate with opacity 1 and y 0', () => {
      expect(fadeSlideUp.animate.opacity).toBe(1)
      expect(fadeSlideUp.animate.y).toBe(0)
    })

    it('has a transition with duration and ease', () => {
      expect(fadeSlideUp.transition.duration).toBeGreaterThan(0)
      expect(fadeSlideUp.transition.ease).toBeDefined()
    })
  })

  describe('staggerContainer', () => {
    it('has hidden and visible keys', () => {
      expect(staggerContainer).toHaveProperty('hidden')
      expect(staggerContainer).toHaveProperty('visible')
    })

    it('visible transition has staggerChildren defined', () => {
      const visible = staggerContainer.visible as { transition: { staggerChildren: number } }
      expect(visible.transition.staggerChildren).toBeDefined()
      expect(visible.transition.staggerChildren).toBe(0.07)
    })
  })

  describe('staggerContainerSlow', () => {
    it('has staggerChildren of 0.1', () => {
      const visible = staggerContainerSlow.visible as { transition: { staggerChildren: number } }
      expect(visible.transition.staggerChildren).toBe(0.1)
    })
  })

  describe('staggerItem', () => {
    it('has hidden and visible keys', () => {
      expect(staggerItem).toHaveProperty('hidden')
      expect(staggerItem).toHaveProperty('visible')
    })

    it('hidden has opacity 0', () => {
      const hidden = staggerItem.hidden as { opacity: number }
      expect(hidden.opacity).toBe(0)
    })

    it('visible has opacity 1', () => {
      const visible = staggerItem.visible as { opacity: number }
      expect(visible.opacity).toBe(1)
    })
  })

  describe('pageFade', () => {
    it('has initial, animate, and exit keys', () => {
      expect(pageFade).toHaveProperty('initial')
      expect(pageFade).toHaveProperty('animate')
      expect(pageFade).toHaveProperty('exit')
    })

    it('initial opacity is 0, animate opacity is 1, exit opacity is 0', () => {
      expect(pageFade.initial.opacity).toBe(0)
      expect(pageFade.animate.opacity).toBe(1)
      expect(pageFade.exit.opacity).toBe(0)
    })

    it('has a transition', () => {
      expect(pageFade.transition.duration).toBeGreaterThan(0)
    })
  })

  describe('slideStep', () => {
    it('has initial, animate, and exit keys', () => {
      expect(slideStep).toHaveProperty('initial')
      expect(slideStep).toHaveProperty('animate')
      expect(slideStep).toHaveProperty('exit')
    })

    it('initial is a function that returns x and opacity', () => {
      expect(typeof slideStep.initial).toBe('function')
      const forward = (slideStep.initial as (d: number) => { x: number; opacity: number })(1)
      expect(forward.x).toBe(30)
      expect(forward.opacity).toBe(0)

      const backward = (slideStep.initial as (d: number) => { x: number; opacity: number })(-1)
      expect(backward.x).toBe(-30)
      expect(backward.opacity).toBe(0)
    })
  })

  describe('microPress', () => {
    it('whileTap scale is less than 1', () => {
      expect(microPress.whileTap.scale).toBeLessThan(1)
    })

    it('transition uses spring', () => {
      expect(microPress.transition.type).toBe('spring')
      expect(microPress.transition.stiffness).toBeGreaterThan(0)
      expect(microPress.transition.damping).toBeGreaterThan(0)
    })
  })

  describe('VIEWPORT_ONCE', () => {
    it('once is true', () => {
      expect(VIEWPORT_ONCE.once).toBe(true)
    })

    it('has a margin string', () => {
      expect(typeof VIEWPORT_ONCE.margin).toBe('string')
    })
  })

  describe('transitions', () => {
    it('enterTransition has positive duration', () => {
      expect(enterTransition.duration).toBeGreaterThan(0)
    })

    it('fastTransition is faster than enterTransition', () => {
      expect(fastTransition.duration).toBeLessThan(enterTransition.duration as number)
    })

    it('springTransition uses spring type', () => {
      expect(springTransition.type).toBe('spring')
    })
  })
})
