'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut } from 'lucide-react'
import * as m from 'motion/react-client'
import { cn } from '@/lib/utils'
import { signOut } from '@/actions/auth'
import { parentNavItems, isParentActivePath } from '@/lib/parent-nav'
import { slideFromBottom } from '@/lib/animation'

export function ParentMobileNav() {
  const pathname = usePathname()

  return (
    <m.nav
      {...slideFromBottom}
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background md:hidden"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <div className="flex items-center">
        {parentNavItems.map(({ href, label, icon: Icon }) => {
          const isActive = isParentActivePath(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] transition-colors',
                isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground active:text-foreground'
              )}
            >
              {isActive && (
                <span className="absolute top-1 h-1 w-1 rounded-full bg-foreground" />
              )}
              <Icon className="mt-1 h-5 w-5" />
              <span className="sr-only">{label}</span>
            </Link>
          )
        })}

        {/* Sign out tab */}
        <form action={signOut} className="flex flex-1">
          <button
            type="submit"
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] text-muted-foreground active:text-foreground transition-colors"
          >
            <LogOut className="mt-1 h-5 w-5" />
            <span className="sr-only">Sign out</span>
          </button>
        </form>
      </div>
    </m.nav>
  )
}
