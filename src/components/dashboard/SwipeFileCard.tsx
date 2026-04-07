'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

interface SwipeFileCardProps {
  title: string
  description: string
  content: string
}

export function SwipeFileCard({ title, description, content }: SwipeFileCardProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select text from a temporary textarea
      const textarea = document.createElement('textarea')
      textarea.value = content
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>

      <pre className="whitespace-pre-wrap break-words rounded-md bg-muted/50 p-4 text-sm text-foreground font-sans leading-relaxed mb-4">
        {content}
      </pre>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-transform transition-colors hover:scale-[1.02] active:scale-[0.97]"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-green-600" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy
            </>
          )}
        </button>
      </div>
    </div>
  )
}
