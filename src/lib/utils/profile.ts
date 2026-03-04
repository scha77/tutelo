/**
 * Utility functions for profile page visibility logic.
 * Extracted for testability — used by /[slug]/page.tsx.
 */

export interface DraftCheckParams {
  is_published: boolean
  preview: string | undefined
}

/**
 * Returns true if the profile should show the "Page not available" draft state.
 * Draft state = teacher is not published AND visitor is not using preview mode.
 */
export function isDraftPage({ is_published, preview }: DraftCheckParams): boolean {
  return !is_published && preview !== 'true'
}

/**
 * Functional alias matching the two-argument signature used in test assertions.
 */
export function shouldShowDraft(
  isPublished: boolean,
  preview: string | undefined
): boolean {
  return isDraftPage({ is_published: isPublished, preview })
}
