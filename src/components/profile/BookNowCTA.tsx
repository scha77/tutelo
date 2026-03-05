'use client'

import { Button } from '@/components/ui/button'

export function BookNowCTA() {
  function handleClick() {
    document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      {/* Mobile: sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background p-3 md:hidden">
        <Button
          onClick={handleClick}
          className="w-full font-semibold"
          style={{ backgroundColor: 'var(--accent)', color: 'white' }}
        >
          Book Now
        </Button>
      </div>

      {/* Desktop: inline CTA below availability */}
      <div className="mx-auto hidden max-w-3xl px-4 pb-16 md:block">
        <Button
          onClick={handleClick}
          size="lg"
          className="font-semibold"
          style={{ backgroundColor: 'var(--accent)', color: 'white' }}
        >
          Book Now
        </Button>
      </div>

      {/* Bottom spacer for mobile sticky bar */}
      <div className="h-16 md:hidden" />
    </>
  )
}
