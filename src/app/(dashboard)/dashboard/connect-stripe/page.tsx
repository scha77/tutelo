import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Shield } from 'lucide-react'
import { ConnectStripeButton } from './ConnectStripeButton'

export default async function ConnectStripePage() {
  const supabase = await createClient()

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData?.user) redirect('/login')

  const userId = userData.user.id

  const { data: teacher } = await supabase
    .from('teachers')
    .select('stripe_charges_enabled')
    .eq('user_id', userId)
    .maybeSingle()

  // Guard: already connected
  if (teacher?.stripe_charges_enabled) redirect('/dashboard')

  return (
    <div className="p-6 max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Connect Stripe</h1>
        <p className="mt-1 text-sm text-muted-foreground">Set up payments to start accepting bookings.</p>
      </div>

      <div className="rounded-xl border bg-card p-8 shadow-sm space-y-6">
        <div className="flex items-start gap-3">
          <Shield className="h-6 w-6 text-primary shrink-0 mt-0.5" />
          <div>
            <h2 className="font-semibold text-foreground">Get paid for your sessions</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Connect Stripe to confirm your pending bookings and receive payments directly. Takes 2–3
              minutes. Tutelo charges a 7% platform fee — parents are never surprised.
            </p>
          </div>
        </div>
        <ConnectStripeButton />
      </div>
    </div>
  )
}
