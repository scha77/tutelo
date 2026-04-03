'use client'

import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useState } from 'react'
import { Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Destination charge (no on_behalf_of) — PI is on the platform account, use platform key only
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface PaymentStepProps {
  clientSecret: string
  accentColor: string
  onSuccess: () => void
  onError: (msg: string) => void
  onBookAnother: () => void
}

export function PaymentStep({ clientSecret, accentColor, onSuccess, onError, onBookAnother }: PaymentStepProps) {
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutForm accentColor={accentColor} onSuccess={onSuccess} onError={onError} onBookAnother={onBookAnother} />
    </Elements>
  )
}

interface CheckoutFormProps {
  accentColor: string
  onSuccess: () => void
  onError: (msg: string) => void
  onBookAnother: () => void
}

function CheckoutForm({ accentColor, onSuccess, onError, onBookAnother }: CheckoutFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setSubmitting(true)
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/booking-confirmed` },
      redirect: 'if_required',
    })
    setSubmitting(false)
    if (error) {
      onError(error.message ?? 'Payment failed. Please try again.')
    } else if (paymentIntent?.status === 'requires_capture') {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4 max-w-md mx-auto">
      <h3 className="text-lg font-semibold">Complete your booking</h3>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Shield className="h-3.5 w-3.5" />
        <span>Secure payment via Stripe</span>
      </div>
      <PaymentElement />
      <Button
        type="submit"
        size="lg"
        disabled={submitting || !stripe || !elements}
        className="w-full font-semibold"
        style={{ backgroundColor: accentColor, color: 'white' }}
      >
        {submitting ? 'Processing…' : 'Confirm & Pay'}
      </Button>
      <button
        type="button"
        onClick={onBookAnother}
        className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
      >
        Book another time
      </button>
    </form>
  )
}
