import { z } from 'zod'

export const Step1Schema = z.object({
  full_name: z.string().min(2, 'Name required'),
  school: z.string().min(2, 'School name required'),
  city: z.string().min(2, 'City required'),
  state: z.string().length(2, 'Use 2-letter state code'),
  years_experience: z.coerce.number().int().min(0).max(50),
  photo_url: z.string().url().optional().or(z.literal('')),
})

export const Step2Schema = z.object({
  subjects: z.array(z.string()).min(1, 'Select at least one subject'),
  grade_levels: z.array(z.string()).min(1, 'Select at least one grade range'),
  hourly_rate: z.coerce.number().min(10).max(500),
})

export const Step3Schema = z.object({
  slug: z.string().min(3).max(60).regex(/^[a-z0-9-]+$/, 'URL-safe characters only'),
  timezone: z.string().min(1, 'Timezone required'),
  availability: z.array(z.object({
    day_of_week: z.number().int().min(0).max(6),
    start_time: z.string(), // "HH:MM"
    end_time: z.string(),
  })).min(1, 'Set at least one available time'),
})

export const FullOnboardingSchema = Step1Schema.merge(Step2Schema).merge(Step3Schema)
export type FullOnboardingData = z.infer<typeof FullOnboardingSchema>
