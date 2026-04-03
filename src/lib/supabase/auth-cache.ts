import { cache } from 'react'
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

/**
 * Cached teacher row — deduplicated per request via React.cache.
 *
 * Returns the teacher row for the authenticated user. The first call
 * fetches from Supabase; subsequent calls within the same request
 * return the cached result.
 */
export const getTeacher = cache(async () => {
  const { user, supabase } = await getAuthUser()
  if (!user) return { teacher: null, supabase }

  const { data: teacher } = await supabase
    .from('teachers')
    .select('id, full_name, slug, timezone, is_published, stripe_charges_enabled, capacity_limit')
    .eq('user_id', user.id)
    .maybeSingle()

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
