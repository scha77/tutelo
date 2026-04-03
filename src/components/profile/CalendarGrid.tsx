'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { isSameDay, format } from 'date-fns'

interface SessionType {
  id: string
  label: string
  price: number
  duration_minutes: number | null
  sort_order: number
}

const DAY_HEADERS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

interface CalendarGridProps {
  calendarDays: Date[]
  currentMonth: Date
  selectedDate: Date | null
  today: Date
  accentColor: string
  hasSessionTypes: boolean
  selectedSessionType: SessionType | null
  isAvailable: (date: Date) => boolean
  onDateClick: (date: Date) => void
  onPrevMonth: () => void
  onNextMonth: () => void
  onChangeSessionType: () => void
}

export function CalendarGrid({
  calendarDays,
  currentMonth,
  selectedDate,
  today,
  accentColor,
  hasSessionTypes,
  selectedSessionType,
  isAvailable,
  onDateClick,
  onPrevMonth,
  onNextMonth,
  onChangeSessionType,
}: CalendarGridProps) {
  return (
    <div className={`flex-1 p-6 ${selectedDate ? 'md:border-r' : ''}`}>
      {/* Session type change link */}
      {hasSessionTypes && selectedSessionType && (
        <button
          onClick={onChangeSessionType}
          className="mb-3 text-xs underline underline-offset-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Change session type ({selectedSessionType.label})
        </button>
      )}

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={onPrevMonth}
          className="p-1.5 rounded-md hover:bg-muted transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="font-semibold text-base">
          {format(currentMonth, 'MMMM yyyy')}
        </span>
        <button
          onClick={onNextMonth}
          className="p-1.5 rounded-md hover:bg-muted transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-medium text-muted-foreground py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((date) => {
          const inMonth = date.getMonth() === currentMonth.getMonth()
          const available = isAvailable(date)
          const isSelected = selectedDate ? isSameDay(date, selectedDate) : false
          const isToday = isSameDay(date, today)

          return (
            <div
              key={date.toISOString()}
              className="flex items-center justify-center p-0.5"
            >
              <button
                onClick={() => onDateClick(date)}
                disabled={!available}
                className={[
                  'h-9 w-9 rounded-full text-sm transition-all select-none',
                  !inMonth && 'opacity-30',
                  isSelected
                    ? 'font-bold text-white shadow'
                    : available
                    ? 'font-semibold hover:bg-muted'
                    : 'text-muted-foreground cursor-default',
                  isToday && !isSelected
                    ? 'ring-1 ring-inset ring-current'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={isSelected ? { backgroundColor: accentColor } : undefined}
              >
                {format(date, 'd')}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
