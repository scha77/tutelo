import { redirect } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import { getTeacher } from '@/lib/supabase/auth-cache'

/** Grouped students derived from completed bookings, cached for 30 s. */
function getCachedStudentsData(teacherId: string) {
  return unstable_cache(
    async () => {
      const { supabaseAdmin: supabase } = await import('@/lib/supabase/service')

      const { data: completedBookings } = await supabase
        .from('bookings')
        .select('student_name, parent_email, subject')
        .eq('teacher_id', teacherId)
        .eq('status', 'completed')

      // Group by (student_name, parent_email)
      const studentMap = new Map<
        string,
        { name: string; email: string; subjects: Set<string>; count: number }
      >()

      for (const b of completedBookings ?? []) {
        const key = `${b.student_name}|${b.parent_email}`
        const existing = studentMap.get(key)
        if (existing) {
          existing.subjects.add(b.subject)
          existing.count++
        } else {
          studentMap.set(key, {
            name: b.student_name,
            email: b.parent_email,
            subjects: new Set([b.subject]),
            count: 1,
          })
        }
      }

      return Array.from(studentMap.values())
        .map((v) => ({ name: v.name, email: v.email, subjects: Array.from(v.subjects), count: v.count }))
        .sort((a, b) => b.count - a.count)
    },
    [`students-${teacherId}`],
    { revalidate: 30, tags: [`students-${teacherId}`] },
  )()
}

export default async function StudentsPage() {
  const { teacher } = await getTeacher()
  if (!teacher) redirect('/login')

  const students = await getCachedStudentsData(teacher.id)

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Students</h1>
        <p className="mt-1 text-sm text-muted-foreground">All students you&apos;ve tutored, grouped by completed sessions.</p>
      </div>

      {students.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No students yet. Sessions will appear here after they are completed.
        </p>
      ) : (
        <div className="space-y-2">
          {students.map((student) => (
            <div
              key={`${student.name}|${student.email}`}
              className="rounded-xl border bg-card px-4 py-3 flex items-center gap-4 shadow-sm"
            >
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary shrink-0">
                {student.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">{student.name}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {student.subjects.join(', ')}
                </p>
              </div>
              <span className="text-sm text-muted-foreground shrink-0">
                {student.count} {student.count === 1 ? 'session' : 'sessions'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
