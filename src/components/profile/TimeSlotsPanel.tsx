'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import type { TimeSlot } from '@/lib/utils/slots'

interface TimeSlotsPanelProps {
  selectedDate: Date
  timeSlotsForDay: TimeSlot[]
  accentColor: string
  onSlotClick: (slot: TimeSlot) => void
}

export function TimeSlotsPanel({
  selectedDate,
  timeSlotsForDay,
  accentColor,
  onSlotClick,
}: TimeSlotsPanelProps) {
  return (
    <div className="w-full md:w-64 border-t md:border-t-0 p-6 bg-muted/20">
      <h3 className="font-semibold mb-4 text-sm">
        {format(selectedDate, 'EEEE, MMMM d')}
      </h3>
      {timeSlotsForDay.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No times available for this day.
        </p>
      ) : (
        <div className="space-y-2">
          {timeSlotsForDay.map((slot) => (
            <TimeSlotButton
              key={slot.slotId}
              slot={slot}
              accentColor={accentColor}
              onClick={() => onSlotClick(slot)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Separate component to cleanly handle hover state
function TimeSlotButton({
  slot,
  accentColor,
  onClick,
}: {
  slot: TimeSlot
  accentColor: string
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full rounded-lg border-2 py-2.5 px-4 text-center text-sm font-semibold transition-colors"
      style={{
        borderColor: accentColor,
        backgroundColor: hovered ? accentColor : 'transparent',
        color: hovered ? 'white' : accentColor,
      }}
    >
      {slot.startDisplay}
    </button>
  )
}
