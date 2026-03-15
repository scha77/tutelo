'use client'

import * as m from 'motion/react-client'
import { staggerContainerSlow, staggerItem, VIEWPORT_ONCE } from '@/lib/animation'
import type { StepData } from './HowItWorksSection'

interface AnimatedStepsProps {
  steps: StepData[]
  stepIcons: React.ReactNode[]
}

/**
 * Client wrapper that renders the "How it works" step cards
 * with stagger-in animation on scroll.
 */
export function AnimatedSteps({ steps, stepIcons }: AnimatedStepsProps) {
  return (
    <m.div
      className="grid gap-8 md:grid-cols-3 md:gap-6"
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT_ONCE}
      variants={staggerContainerSlow}
    >
      {steps.map((step, i) => (
        <m.div key={step.number} className="group relative" variants={staggerItem}>
          {/* Connector line on desktop */}
          {i < steps.length - 1 && (
            <div className="absolute top-10 right-0 hidden h-px w-[calc(100%-3rem)] translate-x-1/2 bg-gradient-to-r from-[#3b4d3e]/15 to-[#3b4d3e]/5 md:block" />
          )}

          <div className="relative rounded-2xl border border-[#3b4d3e]/6 bg-[#f6f5f0]/50 p-8 transition-all hover:border-[#3b4d3e]/12 hover:bg-[#f6f5f0]">
            {/* Step number + icon */}
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#3b4d3e] text-[#f6f5f0]">
                {stepIcons[i]}
              </div>
              <span className="font-mono text-xs font-medium tracking-wider text-[#3b4d3e]/30">
                STEP {step.number}
              </span>
            </div>

            {/* Content */}
            <h3 className="mb-2 text-lg font-semibold text-[#3b4d3e]">
              {step.title}
            </h3>
            <p className="text-sm leading-relaxed text-[#3b4d3e]/55">
              {step.description}
            </p>
          </div>
        </m.div>
      ))}
    </m.div>
  )
}
