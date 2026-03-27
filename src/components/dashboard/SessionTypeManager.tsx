'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, Clock, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createSessionType,
  updateSessionType,
  deleteSessionType,
} from '@/actions/session-types'
import type { SessionType } from '@/actions/session-types'

interface SessionTypeManagerProps {
  sessionTypes: SessionType[]
}

interface FormState {
  label: string
  price: string
  duration_minutes: string
}

const emptyForm: FormState = { label: '', price: '', duration_minutes: '60' }

export function SessionTypeManager({ sessionTypes }: SessionTypeManagerProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [isPending, startTransition] = useTransition()

  function handleEdit(st: SessionType) {
    setEditingId(st.id)
    setForm({
      label: st.label,
      price: String(st.price),
      duration_minutes: String(st.duration_minutes),
    })
    setShowForm(true)
  }

  function handleCancel() {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  function handleSubmit() {
    const price = parseFloat(form.price)
    const duration = parseInt(form.duration_minutes, 10)
    if (!form.label.trim()) {
      toast.error('Label is required')
      return
    }
    if (isNaN(price) || price <= 0) {
      toast.error('Price must be a positive number')
      return
    }
    if (isNaN(duration) || duration < 15) {
      toast.error('Duration must be at least 15 minutes')
      return
    }

    startTransition(async () => {
      const payload = { label: form.label.trim(), price, duration_minutes: duration }
      const result = editingId
        ? await updateSessionType(editingId, payload)
        : await createSessionType(payload)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(editingId ? 'Session type updated' : 'Session type created')
        handleCancel()
      }
    })
  }

  function handleDelete(id: string, label: string) {
    if (!confirm(`Delete "${label}"? This cannot be undone.`)) return

    startTransition(async () => {
      const result = await deleteSessionType(id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Session type deleted')
      }
    })
  }

  return (
    <section className="rounded-xl border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Session Types</h2>
          <p className="text-sm text-muted-foreground">
            Define session types with custom pricing for parents to choose from.
          </p>
        </div>
        {!showForm && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setEditingId(null); setForm(emptyForm); setShowForm(true) }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        )}
      </div>

      {/* Existing session types */}
      {sessionTypes.length > 0 && (
        <div className="space-y-2">
          {sessionTypes.map((st) => (
            <div
              key={st.id}
              className="flex items-center justify-between rounded-lg border px-4 py-3"
            >
              <div className="space-y-0.5">
                <p className="font-medium">{st.label}</p>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5" />
                    {Number(st.price).toFixed(2)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {st.duration_minutes} min
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => handleEdit(st)}
                  disabled={isPending}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(st.id, st.label)}
                  disabled={isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {sessionTypes.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground italic">
          No session types yet. Parents will see your subjects and hourly rate.
        </p>
      )}

      {/* Create/Edit form */}
      {showForm && (
        <div className="rounded-lg border p-4 space-y-4 bg-muted/30">
          <h3 className="text-sm font-medium">
            {editingId ? 'Edit Session Type' : 'New Session Type'}
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="st-label">Label</Label>
              <Input
                id="st-label"
                placeholder="e.g. SAT Prep"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="st-price">Price ($)</Label>
              <Input
                id="st-price"
                type="number"
                step="0.01"
                min="0.50"
                placeholder="60.00"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="st-duration">Duration (min)</Label>
              <Input
                id="st-duration"
                type="number"
                step="15"
                min="15"
                placeholder="60"
                value={form.duration_minutes}
                onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isPending}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingId ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
