'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Ellipsis, LogOut } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-client'
import { cn } from '@/lib/utils'
import { signOut } from '@/actions/auth'
import { primaryNavItems, moreNavItems, isActivePath } from '@/lib/nav'
import { slideFromBottom } from '@/lib/animation'

interface MobileBottomNavProps {
  pendingCount: number
}

export function MobileBottomNav({ pendingCount }: MobileBottomNavProps) {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  // Detect if the current path matches any moreNavItem so we can highlight "More" tab
  const isMoreActive = moreNavItems.some((item) =>
    isActivePath(pathname, item.href)
  )

  return (
    <>
      {/* More panel overlay */}
      <AnimatePresence>
        {moreOpen && (
          <>
            {/* Backdrop */}
            <m.div
              key="more-backdrop"
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMoreOpen(false)}
            />

            {/* Panel */}
            <m.div
              key="more-panel"
              className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-50 rounded-t-2xl bg-background md:hidden"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
              </div>

              {/* Menu items */}
              <div className="px-4 pb-2">
                {moreNavItems.map(({ href, label, icon: Icon, description }) => {
                  const isActive = isActivePath(pathname, href)
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                        isActive
                          ? 'bg-accent text-foreground'
                          : 'text-muted-foreground active:bg-accent/50'
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-sm">{label}</div>
                        {description && (
                          <div className="text-xs text-muted-foreground truncate">
                            {description}
                          </div>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>

              {/* Sign Out */}
              <div className="border-t border-border px-4 py-2">
                <form action={signOut}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-colors active:bg-accent/50"
                  >
                    <LogOut className="h-5 w-5 shrink-0" />
                    <span className="font-medium text-sm">Sign Out</span>
                  </button>
                </form>
              </div>
            </m.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom nav bar */}
      <m.nav
        {...slideFromBottom}
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background md:hidden"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        }}
      >
        <div className="flex items-center">
          {primaryNavItems.map(({ href, label, icon: Icon }) => {
            const isActive = isActivePath(pathname, href)
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
                {/* Active indicator dot */}
                {isActive && (
                  <span className="absolute top-1 h-1 w-1 rounded-full bg-foreground" />
                )}

                <span className="relative mt-1">
                  <Icon className="h-5 w-5" />
                  {/* Pending badge on Requests tab */}
                  {href === '/dashboard/requests' && pendingCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 ring-1 ring-background animate-pulse" />
                  )}
                </span>

                <span className="text-[10px] leading-tight">{label}</span>
              </Link>
            )
          })}

          {/* More tab */}
          <button
            type="button"
            onClick={() => setMoreOpen((prev) => !prev)}
            className={cn(
              'relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] transition-colors',
              moreOpen || isMoreActive
                ? 'text-foreground'
                : 'text-muted-foreground active:text-foreground'
            )}
          >
            {/* Active indicator dot when a more-menu page is active */}
            {(moreOpen || isMoreActive) && (
              <span className="absolute top-1 h-1 w-1 rounded-full bg-foreground" />
            )}

            <Ellipsis className="mt-1 h-5 w-5" />
            <span className="text-[10px] leading-tight">More</span>
          </button>
        </div>
      </m.nav>
    </>
  )
}
