import { describe, it, expect } from 'vitest'
import { shouldShowDraft, isDraftPage } from '@/lib/utils/profile'

describe('draft profile visibility', () => {
  it('draft page with no preview returns true for showing draft state', () => {
    // is_published=false, preview=undefined -> show draft message
    expect(isDraftPage({ is_published: false, preview: undefined })).toBe(true)
  })

  it('draft page with preview=true should NOT show draft — bypass gate', () => {
    expect(isDraftPage({ is_published: false, preview: 'true' })).toBe(false)
  })

  it('published page with no preview should NOT show draft', () => {
    expect(isDraftPage({ is_published: true, preview: undefined })).toBe(false)
  })

  it('published page with preview=true should NOT show draft', () => {
    expect(isDraftPage({ is_published: true, preview: 'true' })).toBe(false)
  })

  it('shouldShowDraft returns false for published teachers', () => {
    expect(shouldShowDraft(true, undefined)).toBe(false)
  })

  it('shouldShowDraft returns true for unpublished without preview', () => {
    expect(shouldShowDraft(false, undefined)).toBe(true)
  })

  it('shouldShowDraft returns false for unpublished with preview=true', () => {
    expect(shouldShowDraft(false, 'true')).toBe(false)
  })
})
