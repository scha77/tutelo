export default function AvailabilityLoading() {
  return (
    <div className="p-6 max-w-3xl space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-36 rounded bg-muted-foreground/10" />
        <div className="h-4 w-72 rounded bg-muted-foreground/10" />
      </div>
      {/* Day rows */}
      <div className="space-y-3">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="flex items-center gap-4 rounded-lg border p-3">
            <div className="h-5 w-12 rounded bg-muted-foreground/10" />
            <div className="flex-1 h-9 rounded-md bg-muted-foreground/10" />
            <div className="h-9 w-9 rounded bg-muted-foreground/10" />
          </div>
        ))}
      </div>
    </div>
  )
}
