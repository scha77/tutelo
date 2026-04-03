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
  ListOrdered,
  FileText,
  Calendar,
  Settings,
  LayoutDashboard,
  Megaphone,
  BarChart2,
  MessageSquare,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  description?: string
}

export const navItems: NavItem[] = [
  { href: '/dashboard',              label: 'Overview',     icon: LayoutDashboard },
  { href: '/dashboard/requests',     label: 'Requests',     icon: Inbox           },
  { href: '/dashboard/sessions',     label: 'Sessions',     icon: CalendarCheck   },
  { href: '/dashboard/students',     label: 'Students',     icon: Users,          description: 'Manage your enrolled students'        },
  { href: '/dashboard/waitlist',     label: 'Waitlist',     icon: ListOrdered,    description: 'View parents waiting for availability' },
  { href: '/dashboard/page',         label: 'Page',         icon: FileText,       description: 'Edit your public profile page'         },
  { href: '/dashboard/availability', label: 'Availability', icon: Calendar        },
  { href: '/dashboard/promote',      label: 'Promote',      icon: Megaphone,      description: 'Flyers, QR codes, and share links'    },
  { href: '/dashboard/analytics',    label: 'Analytics',    icon: BarChart2,      description: 'Traffic and booking stats'             },
  { href: '/dashboard/messages',     label: 'Messages',     icon: MessageSquare,  description: 'Chat with parents'                    },
  { href: '/dashboard/settings',     label: 'Settings',     icon: Settings,       description: 'Account, rate, and preferences'       },
]

/** Primary tabs shown in the mobile bottom nav bar. */
export const primaryNavItems: NavItem[] = [
  navItems[0], // Overview
  navItems[1], // Requests
  navItems[2], // Sessions
  navItems[6], // Availability
]

/** Items shown in the mobile "More" menu panel. */
export const moreNavItems: NavItem[] = [
  navItems[3], // Students
  navItems[4], // Waitlist
  navItems[5], // Page
  navItems[7], // Promote
  navItems[8], // Analytics
  navItems[9], // Messages
  navItems[10], // Settings
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
