import Link from 'next/link'
import Image from 'next/image'
import { BadgeCheck } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

interface TeacherCardProps {
  teacher: {
    id: string
    slug: string
    full_name: string
    photo_url: string | null
    subjects: string[]
    grade_levels: string[]
    city: string | null
    state: string | null
    hourly_rate: number | null
    school: string | null
    headline: string | null
    verified_at: string | null
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export function TeacherCard({ teacher }: TeacherCardProps) {
  const MAX_SUBJECTS = 3
  const visibleSubjects = teacher.subjects.slice(0, MAX_SUBJECTS)
  const overflowCount = teacher.subjects.length - MAX_SUBJECTS

  const location = [teacher.city, teacher.state].filter(Boolean).join(', ')

  return (
    <Link
      href={`/${teacher.slug}`}
      className="group flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Header: avatar + name + verified */}
      <div className="flex items-start gap-3">
        <Avatar className="h-14 w-14 shrink-0 border border-border">
          <AvatarImage src={teacher.photo_url ?? undefined} alt={teacher.full_name} />
          <AvatarFallback className="bg-muted text-base font-semibold text-muted-foreground">
            {getInitials(teacher.full_name)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-base font-semibold leading-snug text-foreground group-hover:text-primary transition-colors">
              {teacher.full_name}
            </span>
            {teacher.verified_at && (
              <BadgeCheck className="h-4 w-4 shrink-0 text-blue-500" aria-label="Verified teacher" />
            )}
          </div>

          {teacher.school && (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {teacher.school}
            </p>
          )}
        </div>
      </div>

      {/* Headline */}
      {teacher.headline && (
        <p className="line-clamp-2 text-sm text-muted-foreground leading-relaxed">
          {teacher.headline}
        </p>
      )}

      {/* Subject pills */}
      {teacher.subjects.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {visibleSubjects.map((subject) => (
            <Badge key={subject} variant="secondary" className="text-xs">
              {subject}
            </Badge>
          ))}
          {overflowCount > 0 && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              +{overflowCount} more
            </Badge>
          )}
        </div>
      )}

      {/* Footer: location + price */}
      <div className="mt-auto flex items-center justify-between pt-1">
        <span className="text-xs text-muted-foreground">
          {location || 'Location not set'}
        </span>
        {teacher.hourly_rate != null ? (
          <span className="text-sm font-semibold text-foreground">
            ${Number(teacher.hourly_rate).toFixed(0)}
            <span className="font-normal text-muted-foreground">/hr</span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Rate not set</span>
        )}
      </div>
    </Link>
  )
}
