import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LoginForm from '@/components/auth/LoginForm'

export default async function LoginPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims ?? null

  if (claims) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Tutelo</h1>
        <p className="text-muted-foreground text-sm">Your tutoring page in 7 minutes.</p>
      </div>
      <LoginForm />
    </div>
  )
}
