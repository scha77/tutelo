import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LoginForm from '@/components/auth/LoginForm'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // Teacher → dashboard, parent → parent dashboard
    const { data: teacher } = await supabase
      .from('teachers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    redirect(teacher ? '/dashboard' : '/parent')
  }

  const { redirect: redirectTo } = await searchParams

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Tutelo</h1>
        <p className="text-muted-foreground text-sm">Your tutoring page in 7 minutes.</p>
      </div>
      <LoginForm redirectTo={redirectTo} />
    </div>
  )
}
