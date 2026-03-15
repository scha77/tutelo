'use client'

import { usePathname } from 'next/navigation'
import { PageTransition } from '@/components/shared/PageTransition'

/**
 * Root-level page transition template.
 *
 * Provides fade transitions between landing page ↔ login ↔ onboarding.
 * Dashboard routes have their own template.tsx, so this only applies
 * to the root layout level.
 */
export default function RootTemplate({
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
