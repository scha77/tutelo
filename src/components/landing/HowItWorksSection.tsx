import { UserPlus, Share2, CalendarCheck } from 'lucide-react'
import { AnimatedSteps } from './AnimatedSteps'

export interface StepData {
  number: string
  title: string
  description: string
}

const steps: StepData[] = [
  {
    number: '01',
    title: 'Sign up & customize',
    description:
      'Create your account, add your subjects, credentials, rates, and availability. Your professional page is ready to share.',
  },
  {
    number: '02',
    title: 'Share your link',
    description:
      'Send your personal tutelo.app link to students and parents. One clean URL that works anywhere — text, email, social.',
  },
  {
    number: '03',
    title: 'Get booked',
    description:
      'Students book directly from your page. You manage requests, confirm sessions, and build your practice on your terms.',
  },
]

/** Pre-rendered icons as JSX — safe to pass to client components. */
const stepIcons = [
  <UserPlus key="1" className="h-5 w-5" strokeWidth={1.75} />,
  <Share2 key="2" className="h-5 w-5" strokeWidth={1.75} />,
  <CalendarCheck key="3" className="h-5 w-5" strokeWidth={1.75} />,
]

export function HowItWorksSection() {
  return (
    <section className="bg-white py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <div className="mx-auto mb-16 max-w-2xl text-center md:mb-20">
          <p className="mb-3 text-sm font-semibold tracking-widest text-[#3b4d3e]/50 uppercase">
            How it works
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-[#3b4d3e] md:text-4xl">
            Three steps to your tutoring practice
          </h2>
        </div>

        {/* Steps — animated stagger grid */}
        <AnimatedSteps steps={steps} stepIcons={stepIcons} />
      </div>
    </section>
  )
}
