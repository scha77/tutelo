import { cache } from 'react'
import { createClient } from './server'

/**
 * Cached auth user — deduplicated per request via React.cache.
 *
 * The layout calls getUser() to verify the session. Every child page
 * that also needs the user ID can call this instead of making another
 * round-trip to Supabase Auth. Within a single RSC render pass,
 * React.cache ensures this function only executes once.
 */
export const getAuthUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error, supabase }
})

/**
 * Cached teacher row — deduplicated per request via React.cache.
 *
 * Returns the teacher row for the authenticated user. The first call
 * fetches from Supabase; subsequent calls within the same request
 * return the cached result. Accepts an optional `select` string but
 * defaults to the columns needed by most pages.
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
