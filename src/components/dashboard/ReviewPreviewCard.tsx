'use client'

import { format } from 'date-fns'

interface ReviewPreviewCardProps {
  rating: number
  text: string | null
  reviewerName: string | null
  createdAt: string
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`h-4 w-4 ${filled ? 'text-yellow-400' : 'text-gray-200'}`}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
    </svg>
  )
}

export function ReviewPreviewCard({ rating, text, reviewerName, createdAt }: ReviewPreviewCardProps) {
  const excerpt = text && text.length > 100 ? text.slice(0, 100) + '…' : text

  const formattedDate = format(new Date(createdAt), 'MMM yyyy')

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-1">
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }, (_, i) => (
            <StarIcon key={i} filled={i < rating} />
          ))}
        </div>
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
