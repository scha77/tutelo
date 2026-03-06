import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { connectStripe } from '@/actions/stripe'

export default async function ConnectStripePage() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  if (!claimsData?.claims) redirect('/login')

  const userId = claimsData.claims.sub
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
      <form action={connectStripe}>
        <button
          type="submit"
          className="bg-[#635BFF] hover:bg-[#5249d6] text-white font-semibold px-6 py-3 rounded-lg w-full transition-colors"
        >
          Connect with Stripe
        </button>
      </form>
    </div>
  )
}
