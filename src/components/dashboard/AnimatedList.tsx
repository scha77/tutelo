import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface AnimatedListProps {
  children: ReactNode
  className?: string
}

/** Staggered list — children fade+slide in via CSS with nth-child delays. */
export function AnimatedList({ children, className }: AnimatedListProps) {
  return <ul className={cn('animate-list', className)}>{children}</ul>
}

interface AnimatedListItemProps {
  children: ReactNode
  className?: string
}

/** Single item inside an AnimatedList. */
export function AnimatedListItem({ children, className }: AnimatedListItemProps) {
  return <li className={cn('animate-list-item', className)}>{children}</li>
}
