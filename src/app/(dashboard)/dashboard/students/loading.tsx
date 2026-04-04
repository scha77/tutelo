export default function StudentsLoading() {
  return (
    <div className="p-6 max-w-3xl space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-36 rounded bg-muted-foreground/10" />
        <div className="h-4 w-64 rounded bg-muted-foreground/10" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-muted-foreground/10" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 rounded bg-muted-foreground/10" />
              <div className="h-3 w-28 rounded bg-muted-foreground/10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
