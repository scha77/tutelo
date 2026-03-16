'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { ExternalLink, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from '@/actions/auth'
import { navItems, isActivePath } from '@/lib/nav'

interface SidebarProps {
  teacherName: string
  teacherSlug: string
  pendingCount: number
}

export function Sidebar({ teacherName, teacherSlug, pendingCount }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden w-56 flex-shrink-0 border-r bg-muted/20 md:flex md:flex-col">
      {/* Teacher identity + view page */}
      <div className="border-b p-4">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            width={28}
            height={28}
            alt="Tutelo"
            sizes="28px"
            className="flex-shrink-0 rounded"
          />
          <p className="truncate text-sm font-semibold">{teacherName}</p>
        </div>
        <a
          href={`/${teacherSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>View Page</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3">
        <ul className="space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = isActivePath(pathname, href)
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-background font-medium text-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
                  )}
                >
                  <span className="relative flex-shrink-0">
                    <Icon className="h-4 w-4" />
                    {href === '/dashboard/requests' && pendingCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 ring-1 ring-background animate-pulse" />
                    )}
                  </span>
                  {label}
                  {href === '/dashboard/requests' && pendingCount > 0 && (
                    <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-green-500 px-1.5 text-[11px] font-semibold text-white">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Sign out */}
      <div className="border-t p-3">
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-background/60 hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
