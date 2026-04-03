export default function SettingsLoading() {
  return (
    <div className="p-6 max-w-2xl space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-28 rounded bg-muted-foreground/10" />
        <div className="h-4 w-64 rounded bg-muted-foreground/10" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-24 rounded bg-muted-foreground/10" />
            <div className="h-10 w-full rounded-md bg-muted-foreground/10" />
          </div>
        ))}
      </div>
    </div>
  )
}
