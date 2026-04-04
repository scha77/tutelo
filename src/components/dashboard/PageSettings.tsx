'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { updateProfile, updatePublishStatus, uploadBannerImage, uploadProfilePhoto } from '@/actions/profile'

const ACCENT_COLORS = [
  { value: '#3B82F6', label: 'Blue' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#10B981', label: 'Green' },
  { value: '#F59E0B', label: 'Amber' },
  { value: '#EF4444', label: 'Red' },
  { value: '#EC4899', label: 'Pink' },
]

interface Teacher {
  is_published: boolean
  accent_color: string
  headline: string | null
  photo_url: string | null
  banner_url: string | null
  social_instagram: string | null
  social_email: string | null
  social_website: string | null
}

interface PageSettingsProps {
  teacher: Teacher
}

export function PageSettings({ teacher }: PageSettingsProps) {
  const [isPublished, setIsPublished] = useState(teacher.is_published)
  const [accentColor, setAccentColor] = useState(teacher.accent_color)
  const [headline, setHeadline] = useState(teacher.headline ?? '')
  const [instagram, setInstagram] = useState(teacher.social_instagram ?? '')
  const [email, setEmail] = useState(teacher.social_email ?? '')
  const [website, setWebsite] = useState(teacher.social_website ?? '')
  const [photoPreview, setPhotoPreview] = useState(teacher.photo_url ?? '')
  const [bannerPreview, setBannerPreview] = useState(teacher.banner_url ?? '')
  const [isPending, startTransition] = useTransition()
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  async function handlePublishToggle() {
    const newValue = !isPublished
    setIsPublished(newValue)
    startTransition(async () => {
      const result = await updatePublishStatus(newValue)
      if (result.error) {
        setIsPublished(!newValue) // revert
        toast.error('Failed to update page status: ' + result.error)
      } else {
        toast.success(newValue ? 'Page is now Active' : 'Page set to Draft')
      }
    })
  }

  async function handleAccentColor(color: string) {
    setAccentColor(color)
    startTransition(async () => {
      const result = await updateProfile({ accent_color: color })
      if (result.error) {
        toast.error('Failed to update color: ' + result.error)
      } else {
        toast.success('Accent color updated')
      }
    })
  }

  async function handleHeadlineBlur() {
    startTransition(async () => {
      const result = await updateProfile({ headline: headline || null })
      if (result.error) {
        toast.error('Failed to save tagline: ' + result.error)
      }
    })
  }

  async function handleSocialBlur() {
    startTransition(async () => {
      const result = await updateProfile({
        social_instagram: instagram || null,
        social_email: email || null,
        social_website: website || null,
      })
      if (result.error) {
        toast.error('Failed to save social links: ' + result.error)
      }
    })
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const localUrl = URL.createObjectURL(file)
    setPhotoPreview(localUrl)

    setIsUploadingPhoto(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const result = await uploadProfilePhoto(formData)
      if (result.error) {
        toast.error('Upload failed: ' + result.error)
        setPhotoPreview(teacher.photo_url ?? '')
      } else if (result.url) {
        setPhotoPreview(result.url)
        toast.success('Profile photo updated')
      }
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Client-side validation before upload
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a JPG, PNG, or WebP image.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB. Please choose a smaller file.')
      return
    }

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file)
    setBannerPreview(localUrl)

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const result = await uploadBannerImage(formData)
      if (result.error) {
        toast.error('Upload failed: ' + result.error)
        setBannerPreview(teacher.banner_url ?? '')
      } else if (result.url) {
        setBannerPreview(result.url)
        toast.success('Banner image updated')
      }
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-8 p-6">
      <div>
        <h2 className="text-xl font-semibold">Page Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Customize how your public tutoring page looks.
        </p>
      </div>

      {/* Active/Draft toggle — VIS-01 / DASH-06 */}
      <section className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base font-medium">Page Status</Label>
            <p className="text-sm text-muted-foreground">
              {isPublished
                ? 'Your page is live and visible to parents.'
                : 'Your page is in draft mode — only visible to you via preview.'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isPublished}
            aria-label="Toggle page active/draft"
            onClick={handlePublishToggle}
            disabled={isPending}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${
              isPublished ? 'bg-primary' : 'bg-input'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
                isPublished ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        <div className="inline-flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${
              isPublished ? 'bg-emerald-500' : 'bg-amber-400'
            }`}
          />
          <span className="text-sm font-medium">
            {isPublished ? 'Active' : 'Draft'}
          </span>
        </div>
      </section>

      {/* Accent color — CUSTOM-01 */}
      <section className="space-y-3">
        <Label className="text-base font-medium">Accent Color</Label>
        <div className="flex flex-wrap gap-2">
          {ACCENT_COLORS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-label={label}
              onClick={() => handleAccentColor(value)}
              className={`h-9 w-9 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                accentColor === value
                  ? 'ring-2 ring-offset-2 ring-foreground scale-110'
                  : 'hover:scale-105'
              }`}
              style={{ backgroundColor: value }}
            />
          ))}
        </div>
      </section>

      {/* Headline/tagline — CUSTOM-02 */}
      <section className="space-y-2">
        <Label htmlFor="headline" className="text-base font-medium">
          Tagline
        </Label>
        <p className="text-sm text-muted-foreground">
          A short one-liner that appears below your name (max 80 characters).
        </p>
        <Input
          id="headline"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          onBlur={handleHeadlineBlur}
          placeholder="Your one-liner tagline"
          maxLength={80}
        />
        <p className="text-xs text-muted-foreground text-right">
          {headline.length}/80
        </p>
      </section>

      {/* Profile photo — CUSTOM-05 */}
      <section className="space-y-3">
        <Label className="text-base font-medium">Profile Photo</Label>
        <p className="text-sm text-muted-foreground">
          This appears as your avatar on your public page and in search results.
        </p>
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-full border-2 border-muted bg-muted">
            {photoPreview ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={photoPreview}
                alt="Profile photo preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-muted-foreground">
                ?
              </div>
            )}
            {isUploadingPhoto && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="photo-upload"
              className="cursor-pointer inline-block rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
            >
              {isUploadingPhoto ? 'Uploading...' : photoPreview ? 'Change Photo' : 'Upload Photo'}
            </label>
            <input
              id="photo-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoUpload}
              disabled={isUploadingPhoto}
              className="hidden"
            />
            <p className="text-xs text-muted-foreground">
              Max 2MB · JPG, PNG, WebP · 400×400px recommended for best clarity
            </p>
          </div>
        </div>
      </section>

      {/* Banner image — CUSTOM-04 */}
      <section className="space-y-3">
        <Label className="text-base font-medium">Banner Image</Label>
        <p className="text-sm text-muted-foreground">
          Upload a banner image for the top of your profile page.
        </p>
        {bannerPreview && (
          <div className="relative h-24 w-full overflow-hidden rounded-md border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bannerPreview}
              alt="Banner preview"
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <div className="flex items-center gap-3">
          <label
            htmlFor="banner-upload"
            className="cursor-pointer rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            {isUploading ? 'Uploading...' : bannerPreview ? 'Change Banner' : 'Upload Banner'}
          </label>
          <input
            id="banner-upload"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleBannerUpload}
            disabled={isUploading}
            className="hidden"
          />
          <span className="text-xs text-muted-foreground">Max 5MB · JPG, PNG, WebP · 1200×400px recommended</span>
        </div>
      </section>

      {/* Social links — CUSTOM-03 */}
      <section className="space-y-4">
        <div>
          <Label className="text-base font-medium">Social Links</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Add your social profiles. Auto-saves when you leave each field.
          </p>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="instagram">Instagram handle</Label>
            <div className="flex items-center">
              <span className="flex h-9 items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground">
                @
              </span>
              <Input
                id="instagram"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                onBlur={handleSocialBlur}
                placeholder="yourhandle"
                className="rounded-l-none"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="social-email">School email</Label>
            <Input
              id="social-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={handleSocialBlur}
              placeholder="you@school.edu"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="website">Personal website</Label>
            <Input
              id="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              onBlur={handleSocialBlur}
              placeholder="https://yourwebsite.com"
            />
          </div>
        </div>
      </section>
    </div>
  )
}
