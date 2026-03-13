import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-2">Get paid for your sessions</h1>
      <p className="text-muted-foreground mb-6">
        Connect Stripe to confirm your pending bookings and receive payments directly. Takes 2–3
        minutes. Tutelo charges a 7% platform fee — parents are never surprised.
      </p>
      <ConnectStripeButton />
    </div>
  )
}
