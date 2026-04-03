import Link from 'next/link'
import { AnimatedButton } from '@/components/shared/AnimatedButton'

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#f6f5f0] pt-32 pb-24 md:pt-44 md:pb-32">
      {/* Subtle grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, #3b4d3e 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          {/* Eyebrow */}
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#3b4d3e]/12 bg-white/60 px-4 py-1.5 text-sm font-medium text-[#3b4d3e]/70 backdrop-blur-sm">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#3b4d3e]" />
            Built for classroom teachers
          </p>

          {/* Headline */}
          <h1 className="text-[2.75rem] leading-[1.1] font-bold tracking-tight text-[#3b4d3e] md:text-6xl md:leading-[1.08]">
            Your professional tutoring page,{' '}
            <span className="relative">
              ready in minutes
              <svg
                className="absolute -bottom-1 left-0 w-full"
                viewBox="0 0 300 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
              >
                <path
                  d="M2 8.5C50 3 100 2 150 4C200 6 250 3 298 7"
                  stroke="#3b4d3e"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeOpacity="0.25"
                />
              </svg>
            </span>
          </h1>

          {/* Sub-headline */}
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[#3b4d3e]/60 md:text-xl">
            Create a shareable booking page, manage your schedule, and get paid
            — completely free to start. No credit card required.
          </p>

          {/* CTA */}
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <AnimatedButton className="inline-block">
              <Link
                href="/login"
                className="group inline-flex items-center gap-2 rounded-full bg-[#3b4d3e] px-8 py-3.5 text-base font-medium text-[#f6f5f0] transition-all hover:bg-[#2d3b30] hover:shadow-xl hover:shadow-[#3b4d3e]/25"
              >
                Start your page
                <svg
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </Link>
            </AnimatedButton>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#3b4d3e]/8 px-3.5 py-1 text-sm text-[#3b4d3e]/45">
              <svg className="h-3.5 w-3.5 text-[#3b4d3e]/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Free forever · No hidden fees
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
