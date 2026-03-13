'use client'

import { useState } from 'react'

export function ConnectStripeButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConnect() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/connect-stripe', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong')
        setLoading(false)
        return
      }

      if (data.redirect) {
        window.location.href = data.redirect
        return
      }

      setError('Unexpected response')
      setLoading(false)
    } catch {
      setError('Network error — please try again')
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleConnect}
        disabled={loading}
        className="bg-[#635BFF] hover:bg-[#5249d6] text-white font-semibold px-6 py-3 rounded-lg w-full transition-colors disabled:opacity-50"
      >
        {loading ? 'Connecting...' : 'Connect with Stripe'}
      </button>
      {error && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
