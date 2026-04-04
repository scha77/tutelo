export default function ConnectStripeLoading() {
  return (
    <div className="p-6 max-w-3xl space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-48 rounded bg-muted-foreground/10" />
        <div className="h-4 w-72 rounded bg-muted-foreground/10" />
      </div>
      <div className="h-40 rounded-xl bg-muted-foreground/10" />
    </div>
  )
}
