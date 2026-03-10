import { format } from 'date-fns'

interface Review {
  rating: number
  review_text: string | null
  reviewer_name: string | null
  created_at: string
}

interface ReviewsSectionProps {
  reviews: Review[]
}

function renderStars(rating: number) {
  return Array.from({ length: 5 }, (_, i) => (
    <span key={i} className={i < rating ? 'text-yellow-400' : 'text-gray-300'}>
      ★
    </span>
  ))
}

// Exported for testability
export function firstNameFromEmail(email: string): string {
  const prefix = email.split('@')[0]
  const name = prefix.split(/[._\-0-9]/)[0]
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
}

export function ReviewsSection({ reviews }: ReviewsSectionProps) {
  if (reviews.length === 0) return null

  const avgRating = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)

  return (
    <section className="mx-auto max-w-3xl px-4 mt-8">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xl font-semibold">{avgRating} ★</span>
        <span className="text-muted-foreground">
          ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
        </span>
      </div>
      <div className="space-y-4">
        {reviews.slice(0, 5).map((review, i) => (
          <div key={i} className="rounded-lg border p-4">
            <div className="flex items-center gap-1 mb-1">{renderStars(review.rating)}</div>
            {review.review_text && (
              <p className="text-sm mt-1">{review.review_text}</p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {review.reviewer_name ?? 'Anonymous'} &middot;{' '}
              {format(new Date(review.created_at), 'MMMM yyyy')}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
