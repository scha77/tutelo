import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/service'
import { checkDateConflicts } from '@/lib/utils/recurring'
import { z } from 'zod'

const CheckConflictsSchema = z.object({
  teacherId: z.string().uuid(),
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1).max(26),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
})

/**
 * POST /api/direct-booking/check-conflicts
 *
 * Read-only pre-check: accepts a list of candidate dates and returns
 * which are available and which are skipped (with reasons).
 * Auth required — parent must be logged in.
 */
export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const parsed = CheckConflictsSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { teacherId, dates, startTime, endTime } = parsed.data
  const result = await checkDateConflicts(teacherId, dates, startTime, endTime, supabaseAdmin)

  return Response.json(result)
}
