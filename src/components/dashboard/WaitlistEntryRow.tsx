'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'

interface WaitlistEntryRowProps {
  entry: {
    id: string
    parent_email: string
    created_at: string
    notified_at: string | null
  }
  removeAction: (id: string) => Promise<{ success?: true; error?: string }>
}

export function WaitlistEntryRow({ entry, removeAction }: WaitlistEntryRowProps) {
  const [isPending, startTransition] = useTransition()

  function handleRemove() {
    const confirmed = window.confirm('Remove this entry from your waitlist?')
    if (!confirmed) return

    startTransition(async () => {
      const result = await removeAction(entry.id)
      if (result.error) {
        toast.error(`Failed to remove: ${result.error}`)
      } else {
        toast.success('Removed from waitlist')
      }
    })
  }

  return (
    <div className="rounded-xl border bg-card px-4 py-3 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground truncate">{entry.parent_email}</p>
        <p className="text-sm text-muted-foreground">
          Joined {new Date(entry.created_at).toLocaleDateString()}
        </p>
      </div>

      {entry.notified_at ? (
        <span className="rounded-full px-2 py-0.5 text-xs font-medium text-green-700 bg-green-50 shrink-0">
          Notified
        </span>
      ) : (
        <span
          className="rounded-full px-2 py-0.5 text-xs font-medium text-primary shrink-0"
          style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 12%, transparent)' }}
        >
          Pending
        </span>
      )}

      <button
        onClick={handleRemove}
        disabled={isPending}
        className="rounded-md border border-red-300 bg-transparent px-3 py-1 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
      >
        {isPending ? 'Removing…' : 'Remove'}
      </button>
    </div>
  )
}
