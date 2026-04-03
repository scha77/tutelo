export default function PageSettingsLoading() {
  return (
    <div className="p-6 max-w-3xl space-y-8 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-40 rounded bg-muted-foreground/10" />
        <div className="h-4 w-80 rounded bg-muted-foreground/10" />
      </div>
      {/* Toggle section */}
      <div className="rounded-lg border p-4 flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-5 w-28 rounded bg-muted-foreground/10" />
          <div className="h-3 w-56 rounded bg-muted-foreground/10" />
        </div>
        <div className="h-6 w-11 rounded-full bg-muted-foreground/10" />
      </div>
      {/* Color section */}
      <div className="space-y-3">
        <div className="h-5 w-28 rounded bg-muted-foreground/10" />
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-9 w-9 rounded-full bg-muted-foreground/10" />
          ))}
        </div>
      </div>
      {/* Photo section */}
      <div className="space-y-3">
        <div className="h-5 w-28 rounded bg-muted-foreground/10" />
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full bg-muted-foreground/10" />
          <div className="h-9 w-28 rounded-md bg-muted-foreground/10" />
        </div>
      </div>
      {/* Banner section */}
      <div className="space-y-3">
        <div className="h-5 w-28 rounded bg-muted-foreground/10" />
        <div className="h-24 w-full rounded-md bg-muted-foreground/10" />
      </div>
    </div>
  )
}
