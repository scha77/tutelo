'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { LogOut, ArrowLeftRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from '@/actions/auth'
import { parentNavItems, isParentActivePath } from '@/lib/parent-nav'
import { Badge } from '@/components/ui/badge'

interface ParentSidebarProps {
  userName: string
  childrenCount: number
  hasTeacherRole: boolean
}

export function ParentSidebar({ userName, childrenCount, hasTeacherRole }: ParentSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden w-56 flex-shrink-0 border-r bg-muted/20 md:flex md:flex-col">
      {/* User identity */}
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
          <p className="truncate text-sm font-semibold">{userName}</p>
        </div>
        {hasTeacherRole && (
          <Link
            href="/dashboard"
            className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeftRight className="h-3 w-3" />
            <span>Go to Teacher Dashboard</span>
          </Link>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3">
        <ul className="space-y-1">
          {parentNavItems.map(({ href, label, icon: Icon }) => {
            const isActive = isParentActivePath(pathname, href)
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
                  {href === '/parent/children' && childrenCount > 0 && (
                    <Badge variant="secondary" className="ml-auto text-[11px]">
                      {childrenCount}
                    </Badge>
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
