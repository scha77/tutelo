export default function PromoteLoading() {
  return (
    <div className="p-6 max-w-3xl space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-36 rounded bg-muted-foreground/10" />
        <div className="h-4 w-64 rounded bg-muted-foreground/10" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-48 rounded-xl bg-muted-foreground/10" />
        <div className="h-48 rounded-xl bg-muted-foreground/10" />
      </div>
    </div>
  )
}
