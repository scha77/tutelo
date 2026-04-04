import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createClient } from './server'

/**
 * Cached auth user — deduplicated per request via React.cache.
 *
 * Uses getClaims() (local JWT decode, ~0ms) instead of getUser()
 * (network round-trip, ~200ms). This is safe because the proxy
 * already verified and refreshed the session via getUser() on
 * this same request. The proxy is the only layer that can set
 * cookies for token refresh; the layout just needs the user ID.
 */
export const getAuthUser = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  const user = data?.claims?.sub ? { id: data.claims.sub as string } : null
  return { user, error, supabase }
})

/** Teacher columns fetched by getTeacher — keep in sync with the select. */
const TEACHER_SELECT =
  'id, full_name, slug, timezone, is_published, stripe_charges_enabled, capacity_limit' as const

/**
 * Cross-request cache for the teacher row.
 * Keyed by user_id so each teacher gets their own entry.
 * Revalidates every 60 s or when a `teacher-<uid>` tag is invalidated.
 *
 * Uses supabaseAdmin (service role) because unstable_cache callbacks
 * run outside the request context where cookies() is unavailable.
 * Safe because the query filters by user_id explicitly.
 */
function getCachedTeacherData(userId: string) {
  return unstable_cache(
    async () => {
      const { supabaseAdmin } = await import('./service')
      const { data } = await supabaseAdmin
        .from('teachers')
        .select(TEACHER_SELECT)
        .eq('user_id', userId)
        .maybeSingle()
      return data
    },
    [`teacher-${userId}`],
    { revalidate: 60, tags: [`teacher-${userId}`] },
  )()
}

/**
 * Cached teacher row — deduplicated per request via React.cache,
 * AND across requests via unstable_cache (60 s TTL).
 *
 * Returns { teacher, supabase, userId }.  The Supabase client
 * is always fresh (cookie-based RLS), only the teacher row is cached.
 */
export const getTeacher = cache(async () => {
  const { user, supabase } = await getAuthUser()
  if (!user) return { teacher: null, supabase }

  const teacher = await getCachedTeacherData(user.id)
  return { teacher, supabase, userId: user.id }
})

/**
 * Cached pending booking count — used by layout Suspense components.
 * Deduped per request so sidebar, mobile nav, and banner share one query.
 */
export const getPendingCount = cache(async () => {
  const { teacher, supabase } = await getTeacher()
  if (!teacher) return 0

  const { count } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('teacher_id', teacher.id)
    .eq('status', 'requested')

  return count ?? 0
})
