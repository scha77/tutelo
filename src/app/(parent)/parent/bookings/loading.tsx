export default function BookingsLoading() {
  return (
    <div className="p-6 max-w-3xl space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-36 rounded bg-muted-foreground/10" />
        <div className="h-4 w-64 rounded bg-muted-foreground/10" />
      </div>

      {/* Booking cards skeleton */}
      <div className="space-y-4">
        <div className="h-28 w-full rounded-xl bg-muted-foreground/10" />
        <div className="h-28 w-full rounded-xl bg-muted-foreground/10" />
        <div className="h-28 w-full rounded-xl bg-muted-foreground/10" />
      </div>
    </div>
  )
}
