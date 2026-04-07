import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/draft/[slug]?token=<DRAFT_MODE_SECRET>
 *
 * Enables Next.js draftMode cookie and redirects to the teacher profile page.
 * Replaces the ?preview=true query param pattern, which was blocking ISR by
 * making the profile page depend on searchParams (a dynamic API).
 *
 * The teacher profile page reads draftMode().isEnabled to decide whether to
 * show unpublished profiles.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const token = request.nextUrl.searchParams.get('token')

  if (!token || token !== process.env.DRAFT_MODE_SECRET) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  ;(await draftMode()).enable()

  redirect(`/${slug}`)
}
