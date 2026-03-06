'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ExternalLink, Inbox, FileText, Calendar, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  teacherName: string
  teacherSlug: string
  pendingCount: number
}

const navItems = [
  {
    href: '/dashboard/requests',
    label: 'Requests',
    icon: Inbox,
  },
  {
    href: '/dashboard/page',
    label: 'Page',
    icon: FileText,
  },
  {
    href: '/dashboard/availability',
    label: 'Availability',
    icon: Calendar,
  },
  {
    href: '/dashboard/settings',
    label: 'Settings',
    icon: Settings,
  },
]

export function Sidebar({ teacherName, teacherSlug, pendingCount }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden w-56 flex-shrink-0 border-r bg-muted/20 md:flex md:flex-col">
      {/* Teacher identity + view page */}
      <div className="border-b p-4">
        <p className="truncate text-sm font-semibold">{teacherName}</p>
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
            const isActive = pathname === href || pathname.startsWith(href + '/')
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
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {label}
                  {href === '/dashboard/requests' && pendingCount > 0 && (
                    <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold text-white">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
