import { X, Check } from 'lucide-react'

const beforeItems = [
  'Venmo requests lost in chat history',
  'Scheduling over text messages and sticky notes',
  'No-shows with no system to manage them',
  'No professional presence — just a phone number',
  'Juggling multiple subjects across apps',
]

const afterItems = [
  'One link for bookings, payments, and your schedule',
  'Professional page that builds trust instantly',
  'Organized requests you can accept or decline',
  'Your own URL: tutelo.app/your-name',
  'All subjects, rates, and availability in one place',
]

export function ProblemSolutionSection() {
  return (
    <section className="bg-[#f6f5f0] py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <div className="mx-auto mb-16 max-w-2xl text-center md:mb-20">
          <p className="mb-3 text-sm font-semibold tracking-widest text-[#3b4d3e]/50 uppercase">
            Why Tutelo
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-[#3b4d3e] md:text-4xl">
            Stop stitching together your practice
          </h2>
          <p className="mt-4 text-lg text-[#3b4d3e]/55">
            You already know how to teach. Now get the tools to run the business
            side.
          </p>
        </div>

        {/* Before / After grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Before */}
          <div className="rounded-2xl border border-red-200/60 bg-white p-8 md:p-10">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold tracking-wide text-red-600/80 uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
              Before Tutelo
            </div>
            <ul className="space-y-4">
              {beforeItems.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100">
                    <X className="h-3 w-3 text-red-500" strokeWidth={2.5} />
                  </span>
                  <span className="text-sm leading-relaxed text-[#3b4d3e]/70">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* After */}
          <div className="rounded-2xl border border-[#3b4d3e]/10 bg-white p-8 shadow-sm md:p-10">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#3b4d3e]/8 px-3 py-1 text-xs font-semibold tracking-wide text-[#3b4d3e] uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3b4d3e]" />
              With Tutelo
            </div>
            <ul className="space-y-4">
              {afterItems.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#3b4d3e]/10">
                    <Check
                      className="h-3 w-3 text-[#3b4d3e]"
                      strokeWidth={2.5}
                    />
                  </span>
                  <span className="text-sm leading-relaxed text-[#3b4d3e]/80">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
