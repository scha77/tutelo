import { CheckCircle, MapPin, Clock } from 'lucide-react'

interface CredentialsBarProps {
  teacher: {
    subjects: string[]
    grade_levels: string[]
    years_experience: number | null
    hourly_rate: number | null
    city: string | null
    state: string | null
  }
  isVerified: boolean
}

export function CredentialsBar({ teacher, isVerified }: CredentialsBarProps) {
  const hasSubjectsOrGrades =
    teacher.subjects.length > 0 || teacher.grade_levels.length > 0
  const hasMeta =
    isVerified ||
    teacher.years_experience != null ||
    teacher.city ||
    teacher.state ||
    teacher.hourly_rate != null

  if (!hasSubjectsOrGrades && !hasMeta) return null

  return (
    <div className="border-y bg-muted/30 py-4">
      <div className="mx-auto max-w-3xl space-y-3 px-4">
        {/* Row 1: Subject + Grade chips */}
        {hasSubjectsOrGrades && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Accent-colored subject chips — use color-mix on CSS variable */}
            {teacher.subjects.map((subject) => (
              <span
                key={subject}
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                style={{
                  backgroundColor:
                    'color-mix(in srgb, var(--accent) 15%, transparent)',
                  color: 'var(--accent)',
                }}
              >
                {subject}
              </span>
            ))}

            {/* Lighter grade-level chips */}
            {teacher.grade_levels.map((grade) => (
              <span
                key={grade}
                className="inline-flex items-center rounded-full border border-border/60 bg-muted/50 px-3 py-1 text-xs text-muted-foreground"
              >
                {grade}
              </span>
            ))}
          </div>
        )}

        {/* Row 2: Meta items — verified, experience, location, rate */}
        {hasMeta && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            {/* Verified badge with subtle background pill */}
            {isVerified && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                <CheckCircle className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Verified</span>
              </span>
            )}

            {/* Years experience */}
            {teacher.years_experience != null && (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {teacher.years_experience} yr
                  {teacher.years_experience !== 1 ? 's' : ''} exp
                </span>
              </span>
            )}

            {/* Location */}
            {(teacher.city || teacher.state) && (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span>
                  {[teacher.city, teacher.state].filter(Boolean).join(', ')}
                </span>
              </span>
            )}

            {/* Hourly rate — prominent with tabular-nums */}
            {teacher.hourly_rate != null && (
              <span className="ml-auto inline-flex items-center gap-1.5 text-base font-semibold tabular-nums">
                <span>${teacher.hourly_rate}/hr</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
