'use client'

const ACCENT = '#10B981'

const subjects = [
  { name: 'AP Calculus', rate: '$65/hr' },
  { name: 'Algebra II', rate: '$55/hr' },
  { name: 'SAT Math Prep', rate: '$70/hr' },
]

const credentials = ['M.Ed Mathematics', 'AP Certified', '8+ Years Teaching']

const availability = [
  { day: 'Mon', slots: [true, false, true] },
  { day: 'Tue', slots: [true, true, false] },
  { day: 'Wed', slots: [false, true, true] },
  { day: 'Thu', slots: [true, true, true] },
  { day: 'Fri', slots: [true, false, false] },
]

export function TeacherMockSection() {
  return (
    <section className="bg-white py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <div className="mx-auto mb-16 max-w-2xl text-center md:mb-20">
          <p className="mb-3 text-sm font-semibold tracking-widest text-[#3b4d3e]/50 uppercase">
            Your page
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-[#3b4d3e] md:text-4xl">
            A professional page that works for you
          </h2>
          <p className="mt-4 text-lg text-[#3b4d3e]/55">
            Everything parents need to book — all in one link.
          </p>
        </div>

        {/* Browser mock */}
        <div className="mx-auto max-w-2xl">
          <div className="overflow-hidden rounded-2xl border border-[#3b4d3e]/10 bg-white shadow-2xl shadow-[#3b4d3e]/8">
            {/* Chrome bar */}
            <div className="flex items-center gap-3 border-b border-[#3b4d3e]/6 bg-[#fafaf7] px-4 py-3">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-[#3b4d3e]/10" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#3b4d3e]/10" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#3b4d3e]/10" />
              </div>
              <div className="flex flex-1 items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm">
                <svg
                  className="h-3.5 w-3.5 text-[#3b4d3e]/30"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                  />
                </svg>
                <span className="text-[#3b4d3e]/50">tutelo.app/</span>
                <span className="font-medium text-[#3b4d3e]">ms-johnson</span>
              </div>
            </div>

            {/* Page content */}
            <div>
              {/* Banner */}
              <div
                className="h-32 w-full md:h-40"
                style={{ backgroundColor: ACCENT }}
              />

              {/* Profile info */}
              <div className="px-6 md:px-8">
                <div className="-mt-8 flex items-end gap-4">
                  {/* Avatar */}
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-white text-xl font-bold text-white shadow-md"
                    style={{ backgroundColor: ACCENT }}
                  >
                    SJ
                  </div>
                </div>

                <div className="mt-3 pb-4">
                  <h3 className="text-lg font-bold text-[#3b4d3e]">
                    Sarah Johnson
                  </h3>
                  <p className="text-sm text-[#3b4d3e]/55">
                    High school math teacher helping students build confidence
                    and master challenging concepts.
                  </p>
                </div>

                {/* Credentials */}
                <div className="flex flex-wrap gap-2 pb-5">
                  {credentials.map((cred) => (
                    <span
                      key={cred}
                      className="rounded-full px-3 py-1 text-xs font-medium transition-transform hover:scale-105"
                      style={{
                        backgroundColor: `${ACCENT}15`,
                        color: ACCENT,
                      }}
                    >
                      {cred}
                    </span>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-[#3b4d3e]/6" />

              {/* Subjects */}
              <div className="px-6 py-5 md:px-8">
                <h4 className="mb-3 text-xs font-semibold tracking-wider text-[#3b4d3e]/40 uppercase">
                  Subjects
                </h4>
                <div className="space-y-2">
                  {subjects.map((subj) => (
                    <div
                      key={subj.name}
                      className="flex items-center justify-between rounded-lg border border-[#3b4d3e]/6 px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-[#3b4d3e]/12 hover:shadow-sm"
                    >
                      <span className="text-sm font-medium text-[#3b4d3e]">
                        {subj.name}
                      </span>
                      <span className="text-sm text-[#3b4d3e]/50">
                        {subj.rate}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-[#3b4d3e]/6" />

              {/* Availability grid */}
              <div className="px-6 py-5 md:px-8">
                <h4 className="mb-3 text-xs font-semibold tracking-wider text-[#3b4d3e]/40 uppercase">
                  This week
                </h4>
                <div className="flex gap-2">
                  {availability.map((day) => (
                    <div key={day.day} className="flex flex-1 flex-col items-center gap-1.5">
                      <span className="text-[10px] font-medium text-[#3b4d3e]/40 uppercase">
                        {day.day}
                      </span>
                      {day.slots.map((open, i) => (
                        <div
                          key={i}
                          className="h-2.5 w-full rounded-sm transition-transform hover:scale-110"
                          style={{
                            backgroundColor: open
                              ? `${ACCENT}30`
                              : '#3b4d3e08',
                          }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Book button */}
              <div className="px-6 py-5 md:px-8">
                <button
                  type="button"
                  className="w-full cursor-pointer rounded-xl py-3 text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.99]"
                  style={{ backgroundColor: ACCENT }}
                >
                  Book a session
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
