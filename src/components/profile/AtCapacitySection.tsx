import { Clock } from 'lucide-react'
import { WaitlistForm } from './WaitlistForm'

interface AtCapacitySectionProps {
  teacherName: string
  teacherId: string
  accentColor: string
}

export function AtCapacitySection({ teacherName, teacherId, accentColor }: AtCapacitySectionProps) {
  const firstName = teacherName.split(' ')[0]

  return (
    <section className="mx-auto max-w-3xl px-4 py-8">
      <h2 className="text-2xl font-semibold mb-1">Book a Session</h2>
      <div className="mt-6 rounded-xl border bg-muted/30 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: `${accentColor}20` }}
          >
            <Clock className="h-5 w-5" style={{ color: accentColor }} />
          </div>
          <div>
            <p className="font-medium text-foreground">Currently at capacity</p>
            <p className="text-sm text-muted-foreground">
              {firstName} is currently at full capacity.
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Leave your email below to be notified when a spot opens up.
        </p>
        <WaitlistForm teacherId={teacherId} accentColor={accentColor} />
      </div>
    </section>
  )
}
