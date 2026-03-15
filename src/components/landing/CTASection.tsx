import Link from 'next/link'

export function CTASection() {
  return (
    <section className="bg-white py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="relative overflow-hidden rounded-3xl bg-[#3b4d3e] px-8 py-16 md:px-16 md:py-24">
          {/* Background texture */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, #f6f5f0 1px, transparent 0)',
              backgroundSize: '24px 24px',
            }}
          />

          <div className="relative mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[#f6f5f0] md:text-4xl">
              Ready to launch your tutoring page?
            </h2>
            <p className="mt-4 text-lg text-[#f6f5f0]/60">
              Join teachers who are building their practice with a professional
              page they actually own.
            </p>

            {/* Slug showcase */}
            <div className="mx-auto mt-8 inline-flex items-center gap-2 rounded-full border border-[#f6f5f0]/15 bg-[#f6f5f0]/8 px-5 py-2.5 backdrop-blur-sm">
              <svg
                className="h-4 w-4 text-[#f6f5f0]/40"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
                />
              </svg>
              <span className="font-mono text-sm text-[#f6f5f0]/80">
                tutelo.app/
              </span>
              <span className="font-mono text-sm font-medium text-[#f6f5f0]">
                ms-johnson
              </span>
            </div>

            {/* CTA button */}
            <div className="mt-10">
              <Link
                href="/login"
                className="group inline-flex items-center gap-2 rounded-full bg-[#f6f5f0] px-8 py-3.5 text-base font-medium text-[#3b4d3e] transition-all hover:bg-white hover:shadow-xl hover:shadow-black/20"
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
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-[#3b4d3e]/40">
            © {new Date().getFullYear()} Tutelo. Built for teachers, by people
            who get it.
          </p>
        </div>
      </div>
    </section>
  )
}
