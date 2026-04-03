'use client'

import { usePathname } from 'next/navigation'
import { PageTransition } from '@/components/shared/PageTransition'

/**
 * Dashboard page transition template.
 *
 * template.tsx remounts on every navigation (unlike layout.tsx), giving
 * the PageTransition component a key change for enter animations.
 * Uses a simple fade-in (no exit animation) to keep nav transitions snappy.
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
