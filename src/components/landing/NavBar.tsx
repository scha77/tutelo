import Image from 'next/image'
import Link from 'next/link'

export function NavBar() {
  return (
    <nav className="fixed top-0 right-0 left-0 z-50 border-b border-[#3b4d3e]/8 bg-[#f6f5f0]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="Tutelo"
            width={32}
            height={32}
            className="rounded-lg"
          />
          <span className="text-lg font-semibold tracking-tight text-[#3b4d3e]">
            Tutelo
          </span>
        </Link>

        {/* Nav actions */}
        <div className="flex items-center gap-6">
          <Link
            href="/login"
            className="hidden text-sm font-medium text-[#3b4d3e]/70 transition-colors hover:text-[#3b4d3e] sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="rounded-full bg-[#3b4d3e] px-5 py-2 text-sm font-medium text-[#f6f5f0] transition-all hover:bg-[#2d3b30] hover:shadow-lg hover:shadow-[#3b4d3e]/20"
          >
            Start your page
          </Link>
        </div>
      </div>
    </nav>
  )
}
