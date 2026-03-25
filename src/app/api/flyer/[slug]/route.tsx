import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'
import QRCode from 'qrcode'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // Anonymous Supabase client — public read, same pattern as opengraph-image.tsx
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )

  const { data: teacher, error } = await supabase
    .from('teachers')
    .select('full_name, slug, subjects, hourly_rate')
    .eq('slug', slug)
    .single()

  if (error || !teacher) {
    return new Response('Not found', { status: 404 })
  }

  // Generate QR code data URI
  const profileUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://tutelo.app'}/${teacher.slug}`
  const qrDataUri = await QRCode.toDataURL(profileUrl, { width: 200, margin: 1 })

  // Load Inter fonts (same URLs as opengraph-image.tsx)
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

  const subjects: string[] = teacher.subjects ?? []
  const rate = teacher.hourly_rate ? `$${teacher.hourly_rate}/hr` : null

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
          padding: 60,
        }}
      >
        {/* Branding */}
        <div
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.5)',
            marginBottom: 60,
          }}
        >
          Tutelo
        </div>

        {/* Teacher name */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: '#ffffff',
            lineHeight: 1.1,
            marginBottom: 24,
            textAlign: 'center',
          }}
        >
          {teacher.full_name}
        </div>

        {/* Subject pills */}
        {subjects.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 12,
              marginBottom: 20,
            }}
          >
            {subjects.slice(0, 5).map((subject) => (
              <div
                key={subject}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  borderRadius: 24,
                  padding: '10px 24px',
                  fontSize: 22,
                  color: '#e5e7eb',
                  fontWeight: 400,
                }}
              >
                {subject}
              </div>
            ))}
          </div>
        )}

        {/* Hourly rate */}
        {rate && (
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: '#ffffff',
              marginBottom: 48,
            }}
          >
            {rate}
          </div>
        )}

        {/* QR Code */}
        <img
          src={qrDataUri}
          width={280}
          height={280}
          style={{
            borderRadius: 16,
            background: '#ffffff',
            padding: 16,
          }}
        />

        {/* CTA */}
        <div
          style={{
            fontSize: 24,
            color: '#d1d5db',
            marginTop: 28,
            marginBottom: 16,
          }}
        >
          Scan to book a session
        </div>

        {/* URL */}
        <div
          style={{
            fontSize: 20,
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          tutelo.app/{slug}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 1600,
      fonts,
    }
  )
}
