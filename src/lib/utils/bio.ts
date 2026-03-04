export interface BioTeacher {
  full_name: string
  subjects: string[]
  grade_levels: string[]
  school: string | null
  years_experience: number | null
}

export function generateBio(teacher: BioTeacher): string {
  const subjectStr =
    teacher.subjects && teacher.subjects.length > 0
      ? teacher.subjects.slice(0, 2).join(' and ')
      : 'various subjects'

  const gradeStr =
    teacher.grade_levels && teacher.grade_levels.length > 0
      ? teacher.grade_levels.join(', ')
      : 'multiple grade levels'

  const expStr = teacher.years_experience
    ? `${teacher.years_experience} years of teaching experience`
    : 'years of experience teaching'

  const schoolStr = teacher.school ? ` at ${teacher.school}` : ''

  return `Hi! I'm ${teacher.full_name}, a passionate educator${schoolStr} with ${expStr}. I specialize in ${subjectStr} for grades ${gradeStr}. I'd love to help your student thrive!`
}
