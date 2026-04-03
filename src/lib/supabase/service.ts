import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_SECRET_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
