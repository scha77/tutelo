/**
 * E2E test data seeding helpers.
 *
 * Uses supabaseAdmin (service role) to create/clean test fixtures.
 * All helpers throw on error with context — a seed failure means
 * the test can't run, so fail fast.
 */
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_SECRET_KEY
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_SECRET_KEY — cannot seed test data'
    )
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export const TEST_TEACHER_SLUG = 'e2e-test-teacher'
export const TEST_TEACHER_EMAIL = 'e2e-teacher@delivered.resend.dev'
export const TEST_TEACHER_PASSWORD = 'E2eTestP@ss2026!'

interface SeedTeacherResult {
  teacherId: string
  userId: string
}

/**
 * Upserts a test teacher with a linked auth user.
 * Uses the service role to create the auth user and teacher row.
 * Idempotent — safe to call multiple times.
 */
export async function seedTestTeacher(): Promise<SeedTeacherResult> {
  const supabase = getSupabaseAdmin()
  const stripeAccountId = process.env.E2E_STRIPE_CONNECTED_ACCOUNT_ID
  if (!stripeAccountId) {
    throw new Error(
      'E2E_STRIPE_CONNECTED_ACCOUNT_ID env var is required for seeding test teacher'
    )
  }

  // 1. Find or create auth user for the teacher
  const { data: listData } = await supabase.auth.admin.listUsers()
  const users = (listData?.users ?? []) as Array<{ id: string; email?: string }>
  const existingUser = users.find((u) => u.email === TEST_TEACHER_EMAIL)

  let userId: string
  if (existingUser) {
    userId = existingUser.id
  } else {
    const { data: newUser, error: createErr } =
      await supabase.auth.admin.createUser({
        email: TEST_TEACHER_EMAIL,
        password: TEST_TEACHER_PASSWORD,
        email_confirm: true,
      })
    if (createErr || !newUser.user) {
      throw new Error(
        `Failed to create test teacher auth user: ${createErr?.message}`
      )
    }
    userId = newUser.user.id
  }

  // 2. Upsert teacher row
  const { data: teacher, error: teacherErr } = await supabase
    .from('teachers')
    .upsert(
      {
        user_id: userId,
        slug: TEST_TEACHER_SLUG,
        full_name: 'E2E Test Teacher',
        school: 'Test Academy',
        city: 'Test City',
        state: 'NY',
        subjects: ['Math', 'Science'],
        grade_levels: ['9th', '10th'],
        hourly_rate: 50,
        bio: 'Automated E2E test teacher profile.',
        is_published: true,
        timezone: 'America/New_York',
        wizard_step: 6,
        stripe_account_id: stripeAccountId,
        stripe_charges_enabled: true,
      },
      { onConflict: 'slug' }
    )
    .select('id')
    .single()

  if (teacherErr || !teacher) {
    throw new Error(
      `Failed to upsert test teacher: ${teacherErr?.message} (userId=${userId})`
    )
  }

  return { teacherId: teacher.id, userId }
}

/**
 * Seeds availability slots for every day of the week (0–6),
 * 9:00–17:00, so an available date always exists.
 */
export async function seedAvailability(teacherId: string): Promise<void> {
  const supabase = getSupabaseAdmin()

  // Delete existing availability for this teacher first
  const { error: delErr } = await supabase
    .from('availability')
    .delete()
    .eq('teacher_id', teacherId)

  if (delErr) {
    throw new Error(
      `Failed to clear availability for teacher ${teacherId}: ${delErr.message}`
    )
  }

  // Insert 9am-5pm for every day (0=Sun through 6=Sat)
  const rows = Array.from({ length: 7 }, (_, day) => ({
    teacher_id: teacherId,
    day_of_week: day,
    start_time: '09:00',
    end_time: '17:00',
  }))

  const { error: insErr } = await supabase.from('availability').insert(rows)

  if (insErr) {
    throw new Error(
      `Failed to seed availability for teacher ${teacherId}: ${insErr.message}`
    )
  }
}

/**
 * Cleans up test data: bookings, availability, and optionally the teacher row.
 * Does NOT delete the auth user — use cleanupTestUser for that.
 */
export async function cleanupTestData(
  teacherSlug: string,
  deleteTeacher = false
): Promise<void> {
  const supabase = getSupabaseAdmin()

  // Find teacher by slug
  const { data: teacher } = await supabase
    .from('teachers')
    .select('id')
    .eq('slug', teacherSlug)
    .maybeSingle()

  if (!teacher) return // nothing to clean

  // Delete bookings for this teacher
  await supabase.from('bookings').delete().eq('teacher_id', teacher.id)

  // Delete availability
  await supabase.from('availability').delete().eq('teacher_id', teacher.id)

  // Delete session types if any
  await supabase.from('session_types').delete().eq('teacher_id', teacher.id)

  if (deleteTeacher) {
    await supabase.from('teachers').delete().eq('id', teacher.id)
  }
}
