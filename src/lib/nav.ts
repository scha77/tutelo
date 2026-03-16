/**
 * Shared navigation items and helpers for the dashboard.
 *
 * Used by both `Sidebar` (desktop) and `MobileBottomNav` (mobile)
 * to keep nav definitions in sync.
 */

import {
  Inbox,
  CalendarCheck,
  Users,
  FileText,
  Calendar,
  Settings,
  LayoutDashboard,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

export const navItems: NavItem[] = [
  { href: '/dashboard',              label: 'Overview',     icon: LayoutDashboard },
  { href: '/dashboard/requests',     label: 'Requests',     icon: Inbox           },
  { href: '/dashboard/sessions',     label: 'Sessions',     icon: CalendarCheck   },
  { href: '/dashboard/students',     label: 'Students',     icon: Users           },
  { href: '/dashboard/page',         label: 'Page',         icon: FileText        },
  { href: '/dashboard/availability', label: 'Availability', icon: Calendar        },
  { href: '/dashboard/settings',     label: 'Settings',     icon: Settings        },
]

/**
 * Determine if a nav item is active based on the current pathname.
 *
 * The `/dashboard` overview is exact-match only; all other items
 * also match child routes (e.g. `/dashboard/requests/123`).
 */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === '/dashboard') {
    return pathname === '/dashboard'
  }
  return pathname === href || pathname.startsWith(href + '/')
}
