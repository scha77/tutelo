export default function PaymentLoading() {
  return (
    <div className="p-6 max-w-3xl space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-44 rounded bg-muted-foreground/10" />
        <div className="h-4 w-60 rounded bg-muted-foreground/10" />
      </div>

      {/* Payment info skeleton */}
      <div className="space-y-4">
        <div className="h-24 w-full rounded-xl bg-muted-foreground/10" />
        <div className="h-16 w-full rounded-xl bg-muted-foreground/10" />
      </div>
    </div>
  )
}
