import slugifyLib from 'slugify'
import type { SupabaseClient } from '@supabase/supabase-js'

export function generateSlug(name: string): string {
  return slugifyLib(name, { lower: true, strict: true, trim: true })
}

// Finds a unique slug by appending -2, -3, etc. when base slug is taken
export async function findUniqueSlug(
  baseName: string,
  supabase: SupabaseClient
): Promise<string> {
  const base = generateSlug(baseName)
  let slug = base
  let suffix = 2
  while (true) {
    const { data } = await supabase
      .from('teachers')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    if (!data) return slug
    slug = `${base}-${suffix++}`
  }
}
