export default function ChildrenLoading() {
  return (
    <div className="p-6 max-w-3xl space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-32 rounded bg-muted-foreground/10" />
        <div className="h-4 w-56 rounded bg-muted-foreground/10" />
      </div>

      {/* Children cards skeleton */}
      <div className="space-y-4">
        <div className="h-20 w-full rounded-xl bg-muted-foreground/10" />
        <div className="h-20 w-full rounded-xl bg-muted-foreground/10" />
      </div>
    </div>
  )
}
