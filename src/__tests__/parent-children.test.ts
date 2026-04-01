import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock supabase admin
vi.mock('@/lib/supabase/service', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}))

const USER_ID = '550e8400-e29b-41d4-a716-446655440001'
const CHILD_ID = '660e8400-e29b-41d4-a716-446655440002'
const OTHER_USER_ID = '770e8400-e29b-41d4-a716-446655440003'

describe('Children CRUD API — /api/parent/children', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
    vi.mock('@/lib/supabase/service', () => ({ supabaseAdmin: { from: vi.fn() } }))
  })

  // ── Helper to set up auth mock ──
  function setupAuth(user: { id: string } | null) {
    return {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user },
        }),
      },
    }
  }

  // ── GET /api/parent/children ──

  describe('GET /api/parent/children', () => {
    it('returns 401 when unauthenticated', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(setupAuth(null) as never)

      const { GET } = await import('@/app/api/parent/children/route')
      const res = await GET()
      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error).toBe('Unauthorized')
    })

    it('returns authenticated parent\'s children', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(setupAuth({ id: USER_ID }) as never)

      const { supabaseAdmin } = await import('@/lib/supabase/service')
      const mockChildren = [
        { id: CHILD_ID, name: 'Alex', grade: '5th', created_at: '2026-01-01' },
      ]
      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockChildren, error: null }),
          }),
        }),
      } as never)

      const { GET } = await import('@/app/api/parent/children/route')
      const res = await GET()
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toHaveLength(1)
      expect(body[0].name).toBe('Alex')
    })

    it('returns 500 when query fails', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(setupAuth({ id: USER_ID }) as never)

      const { supabaseAdmin } = await import('@/lib/supabase/service')
      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
          }),
        }),
      } as never)

      const { GET } = await import('@/app/api/parent/children/route')
      const res = await GET()
      expect(res.status).toBe(500)
    })
  })

  // ── POST /api/parent/children ──

  describe('POST /api/parent/children', () => {
    it('returns 401 when unauthenticated', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(setupAuth(null) as never)

      const { POST } = await import('@/app/api/parent/children/route')
      const req = new Request('http://localhost/api/parent/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Alex' }),
      })
      const res = await POST(req)
      expect(res.status).toBe(401)
    })

    it('rejects empty name (validation)', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(setupAuth({ id: USER_ID }) as never)

      const { POST } = await import('@/app/api/parent/children/route')
      const req = new Request('http://localhost/api/parent/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '' }),
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('Validation failed')
    })

    it('rejects name longer than 100 characters', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(setupAuth({ id: USER_ID }) as never)

      const { POST } = await import('@/app/api/parent/children/route')
      const longName = 'A'.repeat(101)
      const req = new Request('http://localhost/api/parent/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: longName }),
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('Validation failed')
    })

    it('creates child with correct parent_id', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(setupAuth({ id: USER_ID }) as never)

      const { supabaseAdmin } = await import('@/lib/supabase/service')
      const createdChild = { id: CHILD_ID, name: 'Alex', grade: '5th', created_at: '2026-01-01' }
      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: createdChild, error: null }),
        }),
      })
      vi.mocked(supabaseAdmin.from).mockReturnValue({ insert: insertMock } as never)

      const { POST } = await import('@/app/api/parent/children/route')
      const req = new Request('http://localhost/api/parent/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Alex', grade: '5th' }),
      })
      const res = await POST(req)
      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.name).toBe('Alex')

      // Verify insert was called with correct parent_id
      expect(insertMock).toHaveBeenCalledWith({
        parent_id: USER_ID,
        name: 'Alex',
        grade: '5th',
      })
    })

    it('returns 400 for invalid JSON body', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(setupAuth({ id: USER_ID }) as never)

      const { POST } = await import('@/app/api/parent/children/route')
      const req = new Request('http://localhost/api/parent/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-json',
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('Invalid JSON body')
    })
  })

  // ── PUT /api/parent/children/[id] ──

  describe('PUT /api/parent/children/[id]', () => {
    it('returns 401 when unauthenticated', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(setupAuth(null) as never)

      const { PUT } = await import('@/app/api/parent/children/[id]/route')
      const req = new Request('http://localhost/api/parent/children/' + CHILD_ID, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      })
      const res = await PUT(req, { params: Promise.resolve({ id: CHILD_ID }) })
      expect(res.status).toBe(401)
    })

    it('returns 404 when child belongs to different parent (ownership check)', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(setupAuth({ id: USER_ID }) as never)

      const { supabaseAdmin } = await import('@/lib/supabase/service')
      // Return a child owned by OTHER_USER_ID
      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: CHILD_ID, parent_id: OTHER_USER_ID },
            }),
          }),
        }),
      } as never)

      const { PUT } = await import('@/app/api/parent/children/[id]/route')
      const req = new Request('http://localhost/api/parent/children/' + CHILD_ID, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      })
      const res = await PUT(req, { params: Promise.resolve({ id: CHILD_ID }) })
      expect(res.status).toBe(404)
      const body = await res.json()
      expect(body.error).toBe('Child not found')
    })

    it('updates child when ownership matches', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(setupAuth({ id: USER_ID }) as never)

      const { supabaseAdmin } = await import('@/lib/supabase/service')
      const fromMock = vi.fn()
      // First call: ownership check
      fromMock.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: CHILD_ID, parent_id: USER_ID },
            }),
          }),
        }),
      })
      // Second call: update
      fromMock.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: CHILD_ID, name: 'Updated', grade: null, created_at: '2026-01-01' },
                error: null,
              }),
            }),
          }),
        }),
      })
      vi.mocked(supabaseAdmin.from).mockImplementation(fromMock)

      const { PUT } = await import('@/app/api/parent/children/[id]/route')
      const req = new Request('http://localhost/api/parent/children/' + CHILD_ID, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      })
      const res = await PUT(req, { params: Promise.resolve({ id: CHILD_ID }) })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.name).toBe('Updated')
    })

    it('returns 400 for invalid UUID', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(setupAuth({ id: USER_ID }) as never)

      const { PUT } = await import('@/app/api/parent/children/[id]/route')
      const req = new Request('http://localhost/api/parent/children/not-a-uuid', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      })
      const res = await PUT(req, { params: Promise.resolve({ id: 'not-a-uuid' }) })
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('Invalid child ID')
    })
  })

  // ── DELETE /api/parent/children/[id] ──

  describe('DELETE /api/parent/children/[id]', () => {
    it('returns 401 when unauthenticated', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(setupAuth(null) as never)

      const { DELETE } = await import('@/app/api/parent/children/[id]/route')
      const req = new Request('http://localhost/api/parent/children/' + CHILD_ID, {
        method: 'DELETE',
      })
      const res = await DELETE(req, { params: Promise.resolve({ id: CHILD_ID }) })
      expect(res.status).toBe(401)
    })

    it('returns 404 when child belongs to different parent (ownership check)', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(setupAuth({ id: USER_ID }) as never)

      const { supabaseAdmin } = await import('@/lib/supabase/service')
      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: CHILD_ID, parent_id: OTHER_USER_ID },
            }),
          }),
        }),
      } as never)

      const { DELETE } = await import('@/app/api/parent/children/[id]/route')
      const req = new Request('http://localhost/api/parent/children/' + CHILD_ID, {
        method: 'DELETE',
      })
      const res = await DELETE(req, { params: Promise.resolve({ id: CHILD_ID }) })
      expect(res.status).toBe(404)
      const body = await res.json()
      expect(body.error).toBe('Child not found')
    })

    it('deletes child when ownership matches (returns 204)', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(setupAuth({ id: USER_ID }) as never)

      const { supabaseAdmin } = await import('@/lib/supabase/service')
      const fromMock = vi.fn()
      // First call: ownership check
      fromMock.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: CHILD_ID, parent_id: USER_ID },
            }),
          }),
        }),
      })
      // Second call: delete
      fromMock.mockReturnValueOnce({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      })
      vi.mocked(supabaseAdmin.from).mockImplementation(fromMock)

      const { DELETE } = await import('@/app/api/parent/children/[id]/route')
      const req = new Request('http://localhost/api/parent/children/' + CHILD_ID, {
        method: 'DELETE',
      })
      const res = await DELETE(req, { params: Promise.resolve({ id: CHILD_ID }) })
      expect(res.status).toBe(204)
    })

    it('returns 400 for invalid UUID', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(setupAuth({ id: USER_ID }) as never)

      const { DELETE } = await import('@/app/api/parent/children/[id]/route')
      const req = new Request('http://localhost/api/parent/children/bad-id', {
        method: 'DELETE',
      })
      const res = await DELETE(req, { params: Promise.resolve({ id: 'bad-id' }) })
      expect(res.status).toBe(400)
    })
  })
})
