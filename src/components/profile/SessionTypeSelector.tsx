'use client'

interface SessionType {
  id: string
  label: string
  price: number
  duration_minutes: number | null
  sort_order: number
}

interface SessionTypeSelectorProps {
  sessionTypes: SessionType[]
  accentColor: string
  onSelect: (st: SessionType) => void
}

export function SessionTypeSelector({
  sessionTypes,
  accentColor,
  onSelect,
}: SessionTypeSelectorProps) {
  return (
    <div className="p-6 space-y-4">
      <h3 className="font-semibold text-base">Choose a session type</h3>
      <div className="space-y-3">
        {sessionTypes.map((st) => (
          <button
            key={st.id}
            onClick={() => onSelect(st)}
            className="w-full text-left border rounded-xl px-5 py-4 shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">{st.label}</span>
              <span className="font-semibold text-sm" style={{ color: accentColor }}>
                ${Number(st.price).toFixed(0)}
              </span>
            </div>
            {st.duration_minutes && (
              <p className="text-xs text-muted-foreground mt-1">
                {st.duration_minutes} min
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
