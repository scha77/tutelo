import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/service'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const UpdateChildSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  grade: z.string().max(50, 'Grade must be 50 characters or less').optional().nullable(),
})

type RouteParams = { params: Promise<{ id: string }> }

/**
 * PUT /api/parent/children/[id]
 * Updates a child — verifies ownership before update.
 */
export async function PUT(req: Request, { params }: RouteParams) {
  const { id } = await params
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: 'Invalid child ID' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify ownership
  const { data: existing } = await supabaseAdmin
    .from('children')
    .select('id, parent_id')
    .eq('id', id)
    .single()

  if (!existing || existing.parent_id !== user.id) {
    return NextResponse.json({ error: 'Child not found' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = UpdateChildSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { name, grade } = parsed.data

  const { data: updated, error } = await supabaseAdmin
    .from('children')
    .update({ name, grade: grade ?? null })
    .eq('id', id)
    .select('id, name, grade, created_at')
    .single()

  if (error) {
    console.error('[PUT /api/parent/children/[id]] Update failed:', error)
    return NextResponse.json({ error: 'Failed to update child' }, { status: 500 })
  }

  return NextResponse.json(updated)
}

/**
 * DELETE /api/parent/children/[id]
 * Deletes a child — verifies ownership before delete.
 */
export async function DELETE(_req: Request, { params }: RouteParams) {
  const { id } = await params
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: 'Invalid child ID' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify ownership
  const { data: existing } = await supabaseAdmin
    .from('children')
    .select('id, parent_id')
    .eq('id', id)
    .single()

  if (!existing || existing.parent_id !== user.id) {
    return NextResponse.json({ error: 'Child not found' }, { status: 404 })
  }

  const { error } = await supabaseAdmin
    .from('children')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[DELETE /api/parent/children/[id]] Delete failed:', error)
    return NextResponse.json({ error: 'Failed to delete child' }, { status: 500 })
  }

  return new Response(null, { status: 204 })
}
