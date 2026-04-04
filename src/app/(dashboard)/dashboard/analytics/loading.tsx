export default function AnalyticsLoading() {
  return (
    <div className="p-6 max-w-3xl space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-36 rounded bg-muted-foreground/10" />
        <div className="h-4 w-64 rounded bg-muted-foreground/10" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-muted-foreground/10" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-muted-foreground/10" />
    </div>
  )
}
