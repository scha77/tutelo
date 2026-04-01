'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Loader2, Users } from 'lucide-react'

interface Child {
  id: string
  name: string
  grade: string | null
  created_at: string
}

export default function ChildrenPage() {
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingChild, setEditingChild] = useState<Child | null>(null)
  const [formName, setFormName] = useState('')
  const [formGrade, setFormGrade] = useState('')
  const [saving, setSaving] = useState(false)

  // Delete confirmation
  const [deletingChild, setDeletingChild] = useState<Child | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchChildren = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from('children')
        .select('id, name, grade, created_at')
        .order('created_at', { ascending: true })

      if (fetchError) throw fetchError
      setChildren(data ?? [])
    } catch {
      setError('Failed to load children. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchChildren()
  }, [fetchChildren])

  const resetForm = () => {
    setShowForm(false)
    setEditingChild(null)
    setFormName('')
    setFormGrade('')
  }

  const handleEdit = (child: Child) => {
    setEditingChild(child)
    setFormName(child.name)
    setFormGrade(child.grade ?? '')
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) return

    setSaving(true)
    try {
      const supabase = createClient()

      if (editingChild) {
        // Update
        const { error: updateError } = await supabase
          .from('children')
          .update({ name: formName.trim(), grade: formGrade.trim() || null })
          .eq('id', editingChild.id)

        if (updateError) throw updateError
      } else {
        // Insert — parent_id is set via RLS (auth.uid())
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const { error: insertError } = await supabase
          .from('children')
          .insert({ parent_id: user.id, name: formName.trim(), grade: formGrade.trim() || null })

        if (insertError) throw insertError
      }

      resetForm()
      await fetchChildren()
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingChild) return

    setDeleting(true)
    try {
      const supabase = createClient()
      const { error: deleteError } = await supabase
        .from('children')
        .delete()
        .eq('id', deletingChild.id)

      if (deleteError) throw deleteError

      setDeletingChild(null)
      await fetchChildren()
    } catch {
      setError('Failed to delete. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="p-6 md:p-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Children</h1>
          <p className="text-muted-foreground mt-1">
            Manage your children&apos;s profiles for booking sessions.
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Child
          </Button>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive flex items-center justify-between">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={fetchChildren}>
            Retry
          </Button>
        </div>
      )}

      {/* Add/Edit form */}
      {showForm && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="text-lg font-semibold">
                {editingChild ? 'Edit Child' : 'Add a Child'}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="child-name">Name *</Label>
                  <Input
                    id="child-name"
                    placeholder="Child's name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="child-grade">Grade (optional)</Label>
                  <Input
                    id="child-grade"
                    placeholder="e.g. 5th Grade"
                    value={formGrade}
                    onChange={(e) => setFormGrade(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving || !formName.trim()}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingChild ? 'Save Changes' : 'Add Child'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!loading && children.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h2 className="text-lg font-semibold">No children added yet</h2>
          <p className="text-muted-foreground mt-1 max-w-sm">
            Add your children to easily select them when booking tutoring sessions.
          </p>
          {!showForm && (
            <Button className="mt-4" onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Child
            </Button>
          )}
        </div>
      )}

      {/* Children list */}
      {!loading && children.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {children.map((child) => (
            <Card key={child.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{child.name}</h3>
                    {child.grade && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {child.grade}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Added {new Date(child.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(child)}
                      aria-label={`Edit ${child.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingChild(child)}
                      aria-label={`Delete ${child.name}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deletingChild} onOpenChange={(open) => !open && setDeletingChild(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Child</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{' '}
              <strong>{deletingChild?.name}</strong>? This action cannot be
              undone. Existing bookings will keep the child reference.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingChild(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
