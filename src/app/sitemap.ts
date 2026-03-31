import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { SUBJECT_LIST } from '@/lib/constants/directory'

function toSlug(name: string): string {
  return name.toLowerCase().replace(/ /g, '-')
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()

  // Fetch all published teachers for their profile URLs
  const { data: teachers } = await supabase
    .from('teachers')
    .select('slug, updated_at')
    .eq('is_published', true)
    .order('updated_at', { ascending: false })

  const teacherEntries: MetadataRoute.Sitemap = (teachers ?? []).map((t) => ({
    url: `https://tutelo.app/${t.slug}`,
    lastModified: t.updated_at ? new Date(t.updated_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  // Subject category pages
  const categoryEntries: MetadataRoute.Sitemap = SUBJECT_LIST.map((subject) => ({
    url: `https://tutelo.app/tutors/${toSlug(subject)}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }))

  return [
    // /tutors directory
    {
      url: 'https://tutelo.app/tutors',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    // Subject category pages
    ...categoryEntries,
    // Individual teacher profile pages
    ...teacherEntries,
  ]
}
