'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CreditCard, Loader2, Trash2 } from 'lucide-react'
import Link from 'next/link'

interface SavedCard {
  brand: string | null
  last4: string
  exp_month: number
  exp_year: number
}

function brandDisplayName(brand: string | null): string {
  if (!brand) return 'Card'
  const map: Record<string, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'American Express',
    discover: 'Discover',
    diners: 'Diners Club',
    jcb: 'JCB',
    unionpay: 'UnionPay',
  }
  return map[brand.toLowerCase()] ?? brand.charAt(0).toUpperCase() + brand.slice(1)
}

export default function PaymentPage() {
  const [card, setCard] = useState<SavedCard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)
  const [removing, setRemoving] = useState(false)

  const fetchCard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/parent/payment-method')
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setCard(data.card ?? null)
    } catch {
      setError('Failed to load payment method. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCard()
  }, [fetchCard])

  const handleRemove = async () => {
    setRemoving(true)
    try {
      const res = await fetch('/api/parent/payment-method', { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to remove')
      setCard(null)
      setShowRemoveDialog(false)
    } catch {
      setError('Failed to remove card. Please try again.')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="p-6 md:p-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payment</h1>
        <p className="text-muted-foreground mt-1">
          Manage your saved payment method for booking sessions.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive flex items-center justify-between">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={fetchCard}>
            Retry
          </Button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Card on file */}
      {!loading && card && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-muted p-3">
                  <CreditCard className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold">{brandDisplayName(card.brand)}</p>
                  <p className="text-sm text-muted-foreground">
                    •••• {card.last4}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Expires {String(card.exp_month).padStart(2, '0')}/{card.exp_year}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRemoveDialog(true)}
                aria-label="Remove saved card"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!loading && !card && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CreditCard className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h2 className="text-lg font-semibold">No saved payment method</h2>
          <p className="text-muted-foreground mt-1 max-w-sm">
            Your card will be automatically saved when you complete your first booking.
          </p>
          <Link href="/search">
            <Button className="mt-4" variant="outline">
              Find a Tutor
            </Button>
          </Link>
        </div>
      )}

      {/* Remove confirmation dialog */}
      <Dialog open={showRemoveDialog} onOpenChange={(open) => !open && setShowRemoveDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Card</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove your saved card ending in{' '}
              <strong>{card?.last4}</strong>? You&apos;ll need to enter your card
              details again on your next booking.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRemoveDialog(false)}
              disabled={removing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={removing}
            >
              {removing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
