import Link from 'next/link'
import { XCircle } from 'lucide-react'

export default function BookingCancelledPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full rounded-xl border bg-card p-8 shadow-sm text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
          <XCircle className="h-7 w-7 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">Booking cancelled</h1>
        <p className="text-muted-foreground mb-6">
          Your payment was not processed. No charges were made.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Back to Home
        </Link>
      </div>
    </div>
  )
}
