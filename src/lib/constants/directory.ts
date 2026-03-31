/**
 * Shared constants for the teacher directory — subjects and grade levels.
 * Used by DirectoryFilters (client) and /tutors page query (server).
 */

export const SUBJECT_LIST = [
  'Math',
  'Reading',
  'Writing',
  'Science',
  'History',
  'English',
  'Spanish',
  'French',
  'SAT Prep',
  'ACT Prep',
  'Chemistry',
  'Biology',
  'Physics',
  'Algebra',
  'Geometry',
  'Calculus',
  'Computer Science',
  'Art',
  'Music',
] as const

export const GRADE_LEVELS = [
  'Kindergarten',
  '1st Grade',
  '2nd Grade',
  '3rd Grade',
  '4th Grade',
  '5th Grade',
  '6th Grade',
  '7th Grade',
  '8th Grade',
  '9th Grade',
  '10th Grade',
  '11th Grade',
  '12th Grade',
  'College',
] as const

export type Subject = (typeof SUBJECT_LIST)[number]
export type GradeLevel = (typeof GRADE_LEVELS)[number]

export const PRICE_RANGES = [
  { label: 'Any price',    min: null,  max: null  },
  { label: 'Under $30',   min: null,  max: 29    },
  { label: '$30 – $60',   min: 30,    max: 60    },
  { label: '$60 – $100',  min: 61,    max: 100   },
  { label: '$100+',       min: 101,   max: null  },
] as const
