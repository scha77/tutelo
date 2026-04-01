import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Check if teacher profile exists — route teachers to /dashboard, parents to /parent
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          const { data: teacher } = await supabase
            .from('teachers')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle()

          if (teacher) {
            return NextResponse.redirect(`${origin}/dashboard`)
          }

          // Non-teacher user → parent dashboard
          return NextResponse.redirect(`${origin}/parent`)
        }
      } catch {
        // Fallback: send to /parent if teacher check fails
      }

      return NextResponse.redirect(`${origin}/parent`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
