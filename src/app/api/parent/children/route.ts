import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/service'

const CreateChildSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  grade: z.string().max(50, 'Grade must be 50 characters or less').optional(),
})

/**
 * GET /api/parent/children
 * Returns the authenticated parent's children, ordered by created_at.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: children, error } = await supabaseAdmin
    .from('children')
    .select('id, name, grade, created_at')
    .eq('parent_id', user.id)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[GET /api/parent/children] Query failed:', error)
    return NextResponse.json({ error: 'Failed to fetch children' }, { status: 500 })
  }

  return NextResponse.json(children)
}

/**
 * POST /api/parent/children
 * Creates a new child for the authenticated parent.
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = CreateChildSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { name, grade } = parsed.data

  const { data: child, error } = await supabaseAdmin
    .from('children')
    .insert({ parent_id: user.id, name, grade: grade ?? null })
    .select('id, name, grade, created_at')
    .single()

  if (error) {
    console.error('[POST /api/parent/children] Insert failed:', error)
    return NextResponse.json({ error: 'Failed to create child' }, { status: 500 })
  }

  return NextResponse.json(child, { status: 201 })
}
