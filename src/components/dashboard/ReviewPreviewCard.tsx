'use client'

import { format } from 'date-fns'

interface ReviewPreviewCardProps {
  rating: number
  text: string | null
  reviewerName: string | null
  createdAt: string
}

export function ReviewPreviewCard({ rating, text, reviewerName, createdAt }: ReviewPreviewCardProps) {
  const stars = Array.from({ length: 5 }, (_, i) =>
    i < rating ? '★' : '☆'
  ).join('')

  const excerpt = text && text.length > 100 ? text.slice(0, 100) + '…' : text

  const formattedDate = format(new Date(createdAt), 'MMM yyyy')

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-yellow-400 text-sm">{stars}</span>
        <span className="text-sm font-medium text-foreground">{rating}/5</span>
      </div>
      {excerpt && (
        <p className="text-sm text-foreground mt-1">{excerpt}</p>
      )}
      <p className="text-xs text-muted-foreground mt-2">
        {reviewerName ?? 'Anonymous'} &middot; {formattedDate}
      </p>
    </div>
  )
}
