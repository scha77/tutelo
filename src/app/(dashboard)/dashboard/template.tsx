'use client'

import { usePathname } from 'next/navigation'
import { PageTransition } from '@/components/shared/PageTransition'

/**
 * Dashboard page transition template.
 *
 * template.tsx remounts on every navigation (unlike layout.tsx), giving
 * AnimatePresence the key change it needs for exit → enter animations.
 * The Sidebar lives in layout.tsx and is unaffected.
 */
export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <PageTransition transitionKey={pathname}>
      {children}
    </PageTransition>
  )
}
