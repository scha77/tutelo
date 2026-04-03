export default function DashboardLoading() {
  return (
    <div className="p-6 max-w-3xl space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-40 rounded bg-muted" />
        <div className="h-4 w-72 rounded bg-muted" />
      </div>

      {/* Content skeleton */}
      <div className="space-y-4">
        <div className="h-24 w-full rounded-xl bg-muted" />
        <div className="h-24 w-full rounded-xl bg-muted" />
        <div className="h-16 w-full rounded-xl bg-muted" />
      </div>
    </div>
  )
}
