'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useRef, useTransition } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SUBJECT_LIST, GRADE_LEVELS, PRICE_RANGES } from '@/lib/constants/directory'

export function DirectoryFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const subject  = searchParams.get('subject') ?? ''
  const grade    = searchParams.get('grade') ?? ''
  const city     = searchParams.get('city') ?? ''
  const priceKey = searchParams.get('price') ?? ''
  const q        = searchParams.get('q') ?? ''

  // Build a new URLSearchParams with one key updated or removed.
  function buildParams(key: string, value: string | null): string {
    const next = new URLSearchParams(searchParams.toString())
    if (value) {
      next.set(key, value)
    } else {
      next.delete(key)
    }
    // Reset to page 1 when filters change (future-proof)
    next.delete('page')
    return next.toString()
  }

  function navigate(key: string, value: string | null) {
    const qs = buildParams(key, value)
    startTransition(() => {
      router.push(`${pathname}${qs ? '?' + qs : ''}`)
    })
  }

  function clearAll() {
    startTransition(() => {
      router.push(pathname)
    })
  }

  const hasFilters = !!(subject || grade || city || priceKey || q)

  // Active filter chips for visible feedback
  const activeChips: { label: string; onRemove: () => void }[] = []
  if (q)       activeChips.push({ label: `"${q}"`,    onRemove: () => navigate('q', null)       })
  if (subject) activeChips.push({ label: subject,     onRemove: () => navigate('subject', null) })
  if (grade)   activeChips.push({ label: grade,       onRemove: () => navigate('grade', null)   })
  if (city)    activeChips.push({ label: city,        onRemove: () => navigate('city', null)    })
  if (priceKey) {
    const range = PRICE_RANGES.find((r) => priceKey === priceRangeKey(r))
    if (range) activeChips.push({ label: range.label, onRemove: () => navigate('price', null) })
  }

  return (
    <div className="space-y-4">
      {/* Filter controls row */}
      <div className="flex flex-wrap gap-3">
        {/* Search — debounced full-text search input */}
        <SearchInput defaultValue={q} onCommit={(v) => navigate('q', v || null)} />

        {/* Subject */}
        <Select
          value={subject || '__all__'}
          onValueChange={(v) => navigate('subject', v === '__all__' ? null : v)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All subjects</SelectItem>
            {SUBJECT_LIST.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Grade level */}
        <Select
          value={grade || '__all__'}
          onValueChange={(v) => navigate('grade', v === '__all__' ? null : v)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Grade level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All grades</SelectItem>
            {GRADE_LEVELS.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Price range */}
        <Select
          value={priceKey || '__all__'}
          onValueChange={(v) => navigate('price', v === '__all__' ? null : v)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Price" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Any price</SelectItem>
            {PRICE_RANGES.filter((r) => r.min !== null || r.max !== null).map((r) => (
              <SelectItem key={priceRangeKey(r)} value={priceRangeKey(r)}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* City search — debounced to avoid a navigation on every keystroke */}
        <CityInput defaultValue={city} onCommit={(v) => navigate('city', v || null)} />

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1.5 text-muted-foreground">
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Active filter chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeChips.map((chip) => (
            <Badge
              key={chip.label}
              variant="secondary"
              className="cursor-pointer gap-1 pr-1.5"
              onClick={chip.onRemove}
            >
              {chip.label}
              <X className="h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

// ── helpers ──────────────────────────────────────────────────────────────────

type PriceRange = (typeof PRICE_RANGES)[number]

function priceRangeKey(r: PriceRange): string {
  return `${r.min ?? '0'}-${r.max ?? 'inf'}`
}

// ── SearchInput ───────────────────────────────────────────────────────────────
// Full-text search input — uncontrolled, debounced.

interface SearchInputProps {
  defaultValue: string
  onCommit: (value: string) => void
}

function SearchInput({ defaultValue, onCommit }: SearchInputProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onCommit(value), 300)
  }

  return (
    <Input
      type="search"
      placeholder="Search tutors..."
      defaultValue={defaultValue}
      className="w-52"
      onChange={handleChange}
    />
  )
}

// ── CityInput ─────────────────────────────────────────────────────────────────

interface CityInputProps {
  defaultValue: string
  onCommit: (value: string) => void
}

function CityInput({ defaultValue, onCommit }: CityInputProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onCommit(value), 300)
  }

  return (
    <Input
      type="text"
      placeholder="City..."
      defaultValue={defaultValue}
      className="w-36"
      onChange={handleChange}
    />
  )
}
