'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { submitReview } from '@/actions/reviews'

interface ReviewFormProps {
  reviewId: string
}

export function ReviewForm({ reviewId }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [text, setText] = useState('')
  const [firstName, setFirstName] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  if (submitted) {
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 p-6 text-center">
        <p className="text-green-800 font-medium">Thank you! Your review has been posted.</p>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0) return
    setLoading(true)
    const result = await submitReview(reviewId, rating, text || null, firstName || null)
    setLoading(false)
    if ('error' in result) {
      toast.error(result.error)
    } else {
      setSubmitted(true)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Star rating */}
      <div>
        <label className="block text-sm font-medium mb-2">Rating *</label>
        <div className="flex gap-1" onMouseLeave={() => setHovered(0)}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={`text-3xl transition-colors ${
                star <= (hovered || rating) ? 'text-yellow-400' : 'text-gray-300'
              }`}
              onMouseEnter={() => setHovered(star)}
              onClick={() => setRating(star)}
              aria-label={`${star} star${star !== 1 ? 's' : ''}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      {/* Optional text */}
      <div>
        <label htmlFor="review-text" className="block text-sm font-medium mb-1">
          Comments (optional)
        </label>
        <textarea
          id="review-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          placeholder="What did you think of the session?"
        />
      </div>

      {/* Optional first name */}
      <div>
        <label htmlFor="reviewer-name" className="block text-sm font-medium mb-1">
          Your first name (optional)
        </label>
        <input
          id="reviewer-name"
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="e.g. Sarah"
        />
      </div>

      <button
        type="submit"
        disabled={rating === 0 || loading}
        className="w-full rounded-md bg-primary text-primary-foreground py-2.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
      >
        {loading ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  )
}
