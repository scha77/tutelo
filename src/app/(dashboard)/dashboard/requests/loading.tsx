export default function RequestsLoading() {
  return (
    <div className="p-6 max-w-2xl space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-52 rounded bg-muted-foreground/10" />
        <div className="h-4 w-80 rounded bg-muted-foreground/10" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-5 w-32 rounded bg-muted-foreground/10" />
              <div className="h-4 w-20 rounded bg-muted-foreground/10" />
            </div>
            <div className="h-4 w-48 rounded bg-muted-foreground/10" />
            <div className="flex gap-2">
              <div className="h-9 w-24 rounded-md bg-muted-foreground/10" />
              <div className="h-9 w-24 rounded-md bg-muted-foreground/10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
