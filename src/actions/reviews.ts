'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase/service'

export async function submitReview(
  reviewId: string,
  rating: number,
  text: string | null,
  reviewerName: string | null
): Promise<{ success: true } | { error: string }> {
  if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    return { error: 'Rating must be a whole number between 1 and 5' }
  }

  const { data, error } = await supabaseAdmin
    .from('reviews')
    .update({
      rating,
      review_text: text ?? null,
      reviewer_name: reviewerName ?? null,
      token_used_at: new Date().toISOString(),
    })
    .eq('id', reviewId)
    .is('token_used_at', null) // idempotency guard — only update if not yet submitted
    .select('id')

  if (error) return { error: error.message }
  if (!data || data.length === 0) return { error: 'Review already submitted or not found' }

  // Revalidate teacher's public profile so new review appears immediately
  const { data: review } = await supabaseAdmin
    .from('reviews')
    .select('teachers(slug)')
    .eq('id', reviewId)
    .single()

  const teacherSlug = (review?.teachers as unknown as { slug: string } | null)?.slug
  if (teacherSlug) {
    revalidatePath(`/${teacherSlug}`)
  }
  revalidatePath('/', 'layout') // fallback bust

  return { success: true }
}
