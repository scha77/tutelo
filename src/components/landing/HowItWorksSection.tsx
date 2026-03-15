import { UserPlus, Share2, CalendarCheck } from 'lucide-react'

const steps = [
  {
    number: '01',
    icon: UserPlus,
    title: 'Sign up & customize',
    description:
      'Create your account, add your subjects, credentials, rates, and availability. Your professional page is ready to share.',
  },
  {
    number: '02',
    icon: Share2,
    title: 'Share your link',
    description:
      'Send your personal tutelo.app link to students and parents. One clean URL that works anywhere — text, email, social.',
  },
  {
    number: '03',
    icon: CalendarCheck,
    title: 'Get booked',
    description:
      'Students book directly from your page. You manage requests, confirm sessions, and build your practice on your terms.',
  },
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

        {/* Steps */}
        <div className="grid gap-8 md:grid-cols-3 md:gap-6">
          {steps.map((step, i) => (
            <div key={step.number} className="group relative">
              {/* Connector line on desktop */}
              {i < steps.length - 1 && (
                <div className="absolute top-10 right-0 hidden h-px w-[calc(100%-3rem)] translate-x-1/2 bg-gradient-to-r from-[#3b4d3e]/15 to-[#3b4d3e]/5 md:block" />
              )}

              <div className="relative rounded-2xl border border-[#3b4d3e]/6 bg-[#f6f5f0]/50 p-8 transition-all hover:border-[#3b4d3e]/12 hover:bg-[#f6f5f0]">
                {/* Step number + icon */}
                <div className="mb-6 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#3b4d3e] text-[#f6f5f0]">
                    <step.icon className="h-5 w-5" strokeWidth={1.75} />
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
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
