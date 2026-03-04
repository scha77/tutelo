import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Check if teacher profile exists — redirect to /dashboard or /onboarding
      // try/catch: teachers table does not exist yet (Plan 03 creates schema)
      try {
        const { data } = await supabase.auth.getClaims()
        const claims = data?.claims ?? null

        if (claims?.sub) {
          const { data: teacher } = await supabase
            .from('teachers')
            .select('id')
            .eq('user_id', claims.sub)
            .single()

          if (teacher) {
            return NextResponse.redirect(`${origin}/dashboard`)
          }
        }
      } catch {
        // teachers table doesn't exist yet — fall through to /onboarding
      }

      return NextResponse.redirect(`${origin}/onboarding`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
