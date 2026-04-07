'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'

interface FlyerPreviewProps {
  slug: string
}

export function FlyerPreview({ slug }: FlyerPreviewProps) {
  const [loaded, setLoaded] = useState(false)

  const flyerUrl = `/api/flyer/${slug}`

  return (
    <div className="rounded-lg border bg-card p-6 space-y-4 animate-list-item">
      <h2 className="text-lg font-semibold text-foreground mb-1">Mini-Flyer</h2>
      <p className="text-sm text-muted-foreground">
        Download a print-ready flyer with your QR code, name, subjects, and rate.
      </p>

      {/* Preview */}
      <div className="flex justify-center">
        <div className="relative max-w-sm w-full aspect-[3/4] rounded-lg overflow-hidden border shadow-sm">
          {!loaded && (
            <div className="absolute inset-0 bg-muted animate-pulse" />
          )}
          <img
            src={flyerUrl}
            alt="Mini-flyer preview"
            className="w-full h-full object-cover"
            onLoad={() => setLoaded(true)}
          />
        </div>
      </div>

      {/* Download */}
      <div className="flex justify-center">
        <a
          href={flyerUrl}
          download={`tutelo-flyer-${slug}.png`}
          className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-transform transition-colors hover:scale-[1.02] active:scale-[0.97]"
        >
          <Download className="h-4 w-4" />
          Download Flyer
        </a>
      </div>
    </div>
  )
}
