'use client'

import { useEffect } from 'react'

interface ViewTrackerProps {
  teacherId: string
}

/**
 * Invisible client component that fires a fire-and-forget POST to /api/track-view.
 * Moved from server-side inline tracking to remove the headers() dynamic API call
 * that was blocking ISR on the public teacher profile page.
 */
export function ViewTracker({ teacherId }: ViewTrackerProps) {
  useEffect(() => {
    fetch('/api/track-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherId }),
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
