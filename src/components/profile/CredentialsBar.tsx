import { CheckCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface CredentialsBarProps {
  teacher: {
    subjects: string[]
    grade_levels: string[]
    years_experience: number | null
    hourly_rate: number | null
    city: string | null
    state: string | null
  }
}

export function CredentialsBar({ teacher }: CredentialsBarProps) {
  return (
    <div className="border-y bg-muted/30 py-3">
      <div className="mx-auto max-w-3xl px-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {/* Verified badge */}
          <div className="flex items-center gap-1 text-emerald-600">
            <CheckCircle className="h-4 w-4" />
            <span className="font-medium">Verified Teacher</span>
          </div>

          <span className="text-muted-foreground">·</span>

          {/* Years experience */}
          {teacher.years_experience != null && (
            <>
              <span className="text-muted-foreground">
                {teacher.years_experience} yr{teacher.years_experience !== 1 ? 's' : ''} experience
              </span>
              <span className="text-muted-foreground">·</span>
            </>
          )}

          {/* Location */}
          {(teacher.city || teacher.state) && (
            <>
              <span className="text-muted-foreground">
                {[teacher.city, teacher.state].filter(Boolean).join(', ')}
              </span>
              <span className="text-muted-foreground">·</span>
            </>
          )}

          {/* Subjects */}
          {teacher.subjects.map((subject) => (
            <Badge key={subject} variant="secondary" className="text-xs">
              {subject}
            </Badge>
          ))}

          {/* Grade levels */}
          {teacher.grade_levels.map((grade) => (
            <Badge key={grade} variant="outline" className="text-xs">
              {grade}
            </Badge>
          ))}

          {/* Hourly rate */}
          {teacher.hourly_rate != null && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="font-medium">${teacher.hourly_rate}/hr</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
