import { format } from 'date-fns'

interface Review {
  rating: number
  review_text: string | null
  reviewer_name: string | null
  created_at: string
}

interface ReviewsSectionProps {
  reviews: Review[]
  accentColor?: string | null
}

/** Inline SVG star — filled (yellow-400) or empty (gray-200). */
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

function renderStars(rating: number) {
  return Array.from({ length: 5 }, (_, i) => (
    <StarIcon key={i} filled={i < rating} />
  ))
}

// Exported for testability
export function firstNameFromEmail(email: string): string {
  const prefix = email.split('@')[0]
  const name = prefix.split(/[._\-0-9]/)[0]
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
}

/** Reviewer initial avatar — accent-colored circle with first letter of name. */
function ReviewerAvatar({
  name,
  accentColor,
}: {
  name: string
  accentColor?: string | null
}) {
  const initial = name.charAt(0).toUpperCase() || 'A'
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
      style={{
        backgroundColor: accentColor || 'var(--accent, #6366f1)',
      }}
    >
      {initial}
    </div>
  )
}

export function ReviewsSection({ reviews, accentColor }: ReviewsSectionProps) {
  if (reviews.length === 0) return null

  const avgRating = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)

  return (
    <section className="mx-auto max-w-3xl px-4 mt-8">
      {/* Aggregate rating header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex items-center gap-1" aria-label={`${avgRating} out of 5 stars`}>
          {renderStars(Math.round(Number(avgRating)))}
        </div>
        <span className="text-2xl font-bold tracking-tight">{avgRating}</span>
        <span className="text-muted-foreground text-sm">
          ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
        </span>
      </div>

      {/* Review cards */}
      <div className="space-y-4">
        {reviews.slice(0, 5).map((review, i) => (
          <div
            key={i}
            className="rounded-xl border bg-card shadow-sm p-5 transition-shadow hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <ReviewerAvatar
                name={review.reviewer_name ?? 'Anonymous'}
                accentColor={accentColor}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-1">
                  {renderStars(review.rating)}
                </div>
                {review.review_text && (
                  <p
                    className="text-sm mt-1 text-foreground/90"
                    style={{ textWrap: 'pretty' } as React.CSSProperties}
                  >
                    {review.review_text}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {review.reviewer_name ?? 'Anonymous'} &middot;{' '}
                  {format(new Date(review.created_at), 'MMMM yyyy')}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
