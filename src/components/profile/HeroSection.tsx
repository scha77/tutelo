import Image from 'next/image'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface HeroSectionProps {
  teacher: {
    full_name: string
    headline: string | null
    photo_url: string | null
    banner_url: string | null
    accent_color: string
    social_instagram: string | null
    social_email: string | null
    social_website: string | null
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

export function HeroSection({ teacher }: HeroSectionProps) {
  return (
    <div className="relative">
      {/* Banner */}
      <div
        className="relative h-40 w-full overflow-hidden md:h-56"
        style={
          !teacher.banner_url
            ? { backgroundColor: teacher.accent_color }
            : undefined
        }
      >
        {teacher.banner_url && (
          <Image
            src={teacher.banner_url}
            alt="Profile banner"
            fill
            className="object-cover"
            priority
          />
        )}
        {/* Gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
      </div>

      {/* Avatar overlapping banner */}
      <div className="mx-auto max-w-3xl px-4">
        <div className="-mt-10 flex items-end gap-4">
          <Avatar className="h-20 w-20 border-4 border-background shadow-md">
            <AvatarImage src={teacher.photo_url ?? undefined} alt={teacher.full_name} />
            <AvatarFallback
              className="text-xl font-semibold text-white"
              style={{ backgroundColor: teacher.accent_color }}
            >
              {getInitials(teacher.full_name)}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Name and tagline */}
        <div className="mt-3 space-y-1 pb-4">
          <h1 className="text-2xl font-bold tracking-tight">{teacher.full_name}</h1>
          {teacher.headline && (
            <p className="text-muted-foreground">{teacher.headline}</p>
          )}
        </div>
      </div>
    </div>
  )
}
