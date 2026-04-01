/**
 * Shared navigation items for the parent dashboard.
 *
 * Used by both `ParentSidebar` (desktop) and `ParentMobileNav` (mobile)
 * to keep nav definitions in sync.
 */

import { LayoutDashboard, Users, CalendarCheck } from 'lucide-react'
import type { NavItem } from '@/lib/nav'

export const parentNavItems: NavItem[] = [
  { href: '/parent',          label: 'Overview',    icon: LayoutDashboard },
  { href: '/parent/children', label: 'My Children', icon: Users           },
  { href: '/parent/bookings', label: 'My Bookings', icon: CalendarCheck   },
]

/**
 * Determine if a parent nav item is active based on the current pathname.
 *
 * The `/parent` overview is exact-match only; all other items
 * also match child routes.
 */
export function isParentActivePath(pathname: string, href: string): boolean {
  if (href === '/parent') {
    return pathname === '/parent'
  }
  return pathname === href || pathname.startsWith(href + '/')
}
