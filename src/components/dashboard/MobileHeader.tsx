'use client'

import Image from 'next/image'
import { ExternalLink } from 'lucide-react'

interface MobileHeaderProps {
  teacherName: string
  teacherSlug: string
}

export function MobileHeader({ teacherName, teacherSlug }: MobileHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-border bg-background px-4 md:hidden">
      {/* Logo + teacher name */}
      <div className="flex items-center gap-2 overflow-hidden">
        <Image
          src="/logo.png"
          width={28}
          height={28}
          alt="Tutelo"
          sizes="28px"
          className="flex-shrink-0 rounded"
        />
        <span className="truncate text-sm font-semibold">{teacherName}</span>
      </div>

      {/* View page link */}
      <a
        href={`/${teacherSlug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>View Page</span>
        <ExternalLink className="h-3 w-3" />
      </a>
    </header>
  )
}
