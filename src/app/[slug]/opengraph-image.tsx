import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

// SEO-01: Dynamic OG image for teacher profile pages
// Edge runtime — no cookies() or Node.js-only APIs
export const runtime = 'edge'
export const alt = 'Teacher profile on Tutelo'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default async function OGImage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // Anonymous Supabase client for edge runtime (no cookies needed — public read)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )

  const { data: teacher } = await supabase
    .from('teachers')
    .select('full_name, photo_url, subjects, school, city, state')
    .eq('slug', slug)
    .single()

  // Load Inter font for consistent typography
  const interBold = await fetch(
    'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZhrib2Bg-4.ttf'
  ).then((res) => res.arrayBuffer())

  const interRegular = await fetch(
    'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf'
  ).then((res) => res.arrayBuffer())

  const fonts = [
    { name: 'Inter', data: interBold, weight: 700 as const, style: 'normal' as const },
    { name: 'Inter', data: interRegular, weight: 400 as const, style: 'normal' as const },
  ]

  // Generic fallback card for invalid slugs
  if (!teacher) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #3b4d3e 0%, #2a3a2d 100%)',
            fontFamily: 'Inter',
          }}
        >
          <div style={{ fontSize: 72, fontWeight: 700, color: '#ffffff', marginBottom: 16 }}>
            Tutelo
          </div>
          <div style={{ fontSize: 28, color: '#d1d5db' }}>
            Professional tutoring pages for teachers
          </div>
        </div>
      ),
      { ...size, fonts }
    )
  }

  const locationParts = [teacher.city, teacher.state].filter(Boolean)
  const location = locationParts.join(', ')
  const subjects: string[] = teacher.subjects ?? []
  const initials = getInitials(teacher.full_name ?? 'T')
  const hasPhoto = !!teacher.photo_url

  // Build info lines array (avoid conditional JSX children which confuse Satori)
  const infoElements: React.ReactElement[] = []

  // Name is always present
  infoElements.push(
    <div
      key="name"
      style={{ fontSize: 52, fontWeight: 700, color: '#ffffff', lineHeight: 1.1, marginBottom: 12 }}
    >
      {teacher.full_name}
    </div>
  )

  if (teacher.school) {
    infoElements.push(
      <div key="school" style={{ fontSize: 24, color: '#d1d5db', marginBottom: 8 }}>
        {teacher.school}
      </div>
    )
  }

  if (location) {
    infoElements.push(
      <div key="location" style={{ fontSize: 22, color: '#9ca3af', marginBottom: 24 }}>
        {location}
      </div>
    )
  }

  if (subjects.length > 0) {
    infoElements.push(
      <div key="subjects" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {subjects.slice(0, 5).map((subject) => (
          <div
            key={subject}
            style={{
              background: 'rgba(255,255,255,0.15)',
              borderRadius: 20,
              padding: '8px 20px',
              fontSize: 20,
              color: '#e5e7eb',
              fontWeight: 400,
            }}
          >
            {subject}
          </div>
        ))}
      </div>
    )
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: 'linear-gradient(135deg, #3b4d3e 0%, #2a3a2d 100%)',
          fontFamily: 'Inter',
          padding: 60,
          position: 'relative',
        }}
      >
        {/* Left: Photo or Initials */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 50,
            flexShrink: 0,
          }}
        >
          {hasPhoto ? (
            <img
              src={teacher.photo_url!}
              width={220}
              height={220}
              style={{
                borderRadius: 110,
                objectFit: 'cover',
                border: '4px solid rgba(255,255,255,0.2)',
              }}
            />
          ) : (
            <div
              style={{
                width: 220,
                height: 220,
                borderRadius: 110,
                background: 'linear-gradient(135deg, #6b8f71 0%, #4a6b4f 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '4px solid rgba(255,255,255,0.2)',
                fontSize: 80,
                fontWeight: 700,
                color: '#ffffff',
              }}
            >
              {initials}
            </div>
          )}
        </div>

        {/* Right: Info */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            flex: 1,
          }}
        >
          {infoElements}
        </div>

        {/* Branding — bottom right */}
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            right: 40,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>
            tutelo.app
          </div>
        </div>
      </div>
    ),
    { ...size, fonts }
  )
}
