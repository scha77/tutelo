'use client'

import { useRef, useCallback } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import * as m from 'motion/react-client'
import { Download } from 'lucide-react'
import { fadeSlideUp, microPress } from '@/lib/animation'

interface QRCodeCardProps {
  slug: string
}

export function QRCodeCard({ slug }: QRCodeCardProps) {
  const hiddenCanvasRef = useRef<HTMLDivElement>(null)

  const profileUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://tutelo.app'}/${slug}`

  const handleDownload = useCallback(() => {
    const container = hiddenCanvasRef.current
    if (!container) return

    const canvas = container.querySelector('canvas')
    if (!canvas) return

    const dataUrl = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `tutelo-qr-${slug}.png`
    link.href = dataUrl
    link.click()
  }, [slug])

  return (
    <m.div
      className="rounded-lg border bg-card p-6 shadow-sm"
      {...fadeSlideUp}
    >
      <h2 className="text-lg font-semibold text-foreground mb-1">Your QR Code</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Students can scan this to visit your profile at{' '}
        <span className="font-medium text-foreground">{profileUrl}</span>
      </p>

      {/* Visible preview */}
      <div className="flex justify-center mb-4">
        <div className="rounded-lg bg-white p-3">
          <QRCodeCanvas
            value={profileUrl}
            size={192}
            level="H"
            marginSize={0}
          />
        </div>
      </div>

      {/* Hidden high-res canvas for download */}
      <div ref={hiddenCanvasRef} className="hidden" aria-hidden="true">
        <QRCodeCanvas
          value={profileUrl}
          size={512}
          level="H"
          marginSize={2}
        />
      </div>

      <div className="flex justify-center">
        <m.button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          {...microPress}
        >
          <Download className="h-4 w-4" />
          Download QR Code
        </m.button>
      </div>
    </m.div>
  )
}
