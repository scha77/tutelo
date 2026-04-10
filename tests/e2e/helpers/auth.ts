/**
 * E2E auth cleanup helper.
 *
 * Deletes test auth users from Supabase using the admin API.
 * Throws on failure — cleanup errors should be visible.
 */
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_SECRET_KEY
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_SECRET_KEY — cannot clean up auth users'
    )
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/**
 * Deletes a Supabase auth user by email address.
 * No-op if the user doesn't exist.
 */
export async function cleanupTestUser(email: string): Promise<void> {
  const supabase = getSupabaseAdmin()

  const { data: listData, error: listErr } =
    await supabase.auth.admin.listUsers()
  if (listErr) {
    throw new Error(`Failed to list users for cleanup: ${listErr.message}`)
  }

  const users = (listData?.users ?? []) as Array<{ id: string; email?: string }>
  const user = users.find((u) => u.email === email)
  if (!user) return // already gone

  const { error: delErr } = await supabase.auth.admin.deleteUser(user.id)
  if (delErr) {
    throw new Error(
      `Failed to delete test user ${email} (${user.id}): ${delErr.message}`
    )
  }
}
