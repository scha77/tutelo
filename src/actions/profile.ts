'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js/min'

const ProfileUpdateSchema = z.object({
  full_name: z.string().min(1).max(100).optional(),
  school: z.string().max(100).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(100).nullable().optional(),
  years_experience: z.number().int().min(0).max(60).nullable().optional(),
  headline: z.string().max(80).nullable().optional(),
  bio: z.string().max(2000).nullable().optional(),
  accent_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  banner_url: z.string().url().nullable().optional(),
  photo_url: z.string().url().nullable().optional(),
  social_instagram: z.string().max(100).nullable().optional(),
  social_email: z.string().email().nullable().optional().or(z.literal('').transform(() => null)),
  social_website: z.string().max(200).nullable().optional(),
  phone_number: z.preprocess(
    (v) => {
      if (typeof v !== 'string' || !v) return null
      if (!isValidPhoneNumber(v, 'US')) return v // let refine catch it
      return parsePhoneNumber(v, 'US')!.format('E.164')
    },
    z.string().nullable().optional()
  ),
  sms_opt_in: z.boolean().optional(),
  capacity_limit: z.number().int().min(1).max(100).nullable().optional(),
})

async function getAuthUserId(): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  return data?.claims?.sub ?? null
}

export async function updateProfile(
  data: z.infer<typeof ProfileUpdateSchema>
): Promise<{ error?: string }> {
  const userId = await getAuthUserId()
  if (!userId) return { error: 'Not authenticated' }

  const parsed = ProfileUpdateSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Validation failed' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('teachers')
    .update(parsed.data)
    .eq('user_id', userId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/page')
  // Revalidate public profile (slug is unknown here, revalidate all /[slug] paths)
  revalidatePath('/[slug]', 'page')

  return {}
}

export async function updatePublishStatus(
  isPublished: boolean
): Promise<{ error?: string }> {
  const userId = await getAuthUserId()
  if (!userId) return { error: 'Not authenticated' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('teachers')
    .update({ is_published: isPublished })
    .eq('user_id', userId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/page')
  revalidatePath('/[slug]', 'page')

  return {}
}

export async function uploadBannerImage(
  formData: FormData
): Promise<{ error?: string; url?: string }> {
  const userId = await getAuthUserId()
  if (!userId) return { error: 'Not authenticated' }

  const file = formData.get('file') as File | null
  if (!file) return { error: 'No file provided' }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    return { error: 'File must be an image' }
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return { error: 'File size must be under 5MB' }
  }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${userId}/banner-${Date.now()}.${ext}`

  // Use admin client to bypass storage RLS — this is a trusted server action,
  // already auth-gated by getAuthUserId() above.
  const { supabaseAdmin } = await import('@/lib/supabase/service')
  const { data, error } = await supabaseAdmin.storage
    .from('profile-images')
    .upload(path, file, { upsert: true })

  if (error) return { error: error.message }

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('profile-images')
    .getPublicUrl(data.path)

  // Update teacher record with new banner URL
  const updateResult = await updateProfile({ banner_url: publicUrl })
  if (updateResult.error) return { error: updateResult.error }

  return { url: publicUrl }
}

export async function uploadProfilePhoto(
  formData: FormData
): Promise<{ error?: string; url?: string }> {
  const userId = await getAuthUserId()
  if (!userId) return { error: 'Not authenticated' }

  const file = formData.get('file') as File | null
  if (!file) return { error: 'No file provided' }

  if (!file.type.startsWith('image/')) {
    return { error: 'File must be an image' }
  }

  // Max 2MB for profile photos
  if (file.size > 2 * 1024 * 1024) {
    return { error: 'File size must be under 2MB' }
  }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${userId}/photo-${Date.now()}.${ext}`

  const { supabaseAdmin } = await import('@/lib/supabase/service')
  const { data, error } = await supabaseAdmin.storage
    .from('profile-images')
    .upload(path, file, { upsert: true })

  if (error) return { error: error.message }

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('profile-images')
    .getPublicUrl(data.path)

  const updateResult = await updateProfile({ photo_url: publicUrl })
  if (updateResult.error) return { error: updateResult.error }

  return { url: publicUrl }
}
