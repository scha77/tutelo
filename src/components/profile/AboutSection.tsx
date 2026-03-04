import { generateBio } from '@/lib/utils/bio'

interface AboutSectionProps {
  teacher: {
    full_name: string
    bio: string | null
    subjects: string[]
    grade_levels: string[]
    school: string | null
    years_experience: number | null
  }
}

export function AboutSection({ teacher }: AboutSectionProps) {
  const bioText = teacher.bio && teacher.bio.trim().length > 0
    ? teacher.bio
    : generateBio(teacher)

  return (
    <section className="mx-auto max-w-3xl px-4 py-6">
      <h2 className="mb-3 text-xl font-semibold">About</h2>
      <p className="leading-relaxed text-muted-foreground">{bioText}</p>
    </section>
  )
}
