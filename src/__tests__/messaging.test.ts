import { describe, it, expect, vi, beforeEach } from 'vitest'

// Shared send mock ref — each beforeEach re-wires this
let emailSendMock = vi.fn().mockResolvedValue({ data: { id: 'email-1' }, error: null })

// Mock supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock supabase admin
vi.mock('@/lib/supabase/service', () => ({
  supabaseAdmin: {
    from: vi.fn(),
    auth: { admin: { getUserById: vi.fn() } },
  },
}))

// Mock Resend — must use function() so `new Resend(...)` works
vi.mock('resend', () => ({
  Resend: function () {
    return { emails: { send: emailSendMock } }
  },
}))

// Mock the email template
vi.mock('@/emails/NewMessageEmail', () => ({
  NewMessageEmail: vi.fn().mockReturnValue('mocked-email-html'),
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  init: vi.fn(),
  captureRequestError: vi.fn(),
}))

const USER_ID = '550e8400-e29b-41d4-a716-446655440001'
const TEACHER_USER_ID = '660e8400-e29b-41d4-a716-446655440002'
const TEACHER_ID = '770e8400-e29b-41d4-a716-446655440003'
const CONV_ID = '880e8400-e29b-41d4-a716-446655440004'
const MSG_ID = '990e8400-e29b-41d4-a716-446655440005'

// Helper to set up auth mock
function setupAuth(user: { id: string } | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
      }),
    },
  }
}

// ======================= POST /api/messages =======================

describe('POST /api/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    emailSendMock = vi.fn().mockResolvedValue({ data: { id: 'email-1' }, error: null })
    vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
    vi.mock('@/lib/supabase/service', () => ({
      supabaseAdmin: {
        from: vi.fn(),
        auth: { admin: { getUserById: vi.fn() } },
      },
    }))
    vi.mock('resend', () => ({
      Resend: function () {
        return { emails: { send: emailSendMock } }
      },
    }))
    vi.mock('@/emails/NewMessageEmail', () => ({
      NewMessageEmail: vi.fn().mockReturnValue('mocked-email-html'),
    }))
  })

  function makeReq(body: unknown) {
    return new Request('http://localhost/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  it('returns 401 when unauthenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(setupAuth(null) as never)

    const { POST } = await import('@/app/api/messages/route')
    const res = await POST(makeReq({ conversationId: CONV_ID, body: 'Hello' }))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 400 when body is empty', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(setupAuth({ id: USER_ID }) as never)

    const { POST } = await import('@/app/api/messages/route')
    const res = await POST(makeReq({ conversationId: CONV_ID, body: '' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Validation failed')
  })

  it('returns 400 when body exceeds 2000 chars', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(setupAuth({ id: USER_ID }) as never)

    const { POST } = await import('@/app/api/messages/route')
    const res = await POST(makeReq({ conversationId: CONV_ID, body: 'A'.repeat(2001) }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Validation failed')
  })

  it('returns 400 when neither conversationId nor teacherId provided', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(setupAuth({ id: USER_ID }) as never)

    const { supabaseAdmin } = await import('@/lib/supabase/service')
    // senderTeacher lookup — not a teacher
    vi.mocked(supabaseAdmin.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
    } as never)

    const { POST } = await import('@/app/api/messages/route')
    const res = await POST(makeReq({ body: 'Hello' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Either conversationId or teacherId is required')
  })

  it('returns 403 when sender is not a participant', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(setupAuth({ id: USER_ID }) as never)

    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const fromMock = vi.fn()

    // Call 1: senderTeacher lookup — not a teacher
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
    })
    // Call 2: checkParticipant → conversations — user is NOT parent_id
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { teacher_id: TEACHER_ID, parent_id: 'someone-else' },
          }),
        }),
      }),
    })
    // Call 3: checkParticipant → teachers — user doesn't own teacher
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      }),
    })

    vi.mocked(supabaseAdmin.from).mockImplementation(fromMock)

    const { POST } = await import('@/app/api/messages/route')
    const res = await POST(makeReq({ conversationId: CONV_ID, body: 'Hello' }))
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toBe('Not a participant in this conversation')
  })

  it('creates message successfully for a participant (parent)', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(setupAuth({ id: USER_ID }) as never)

    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const fromMock = vi.fn()
    const now = new Date().toISOString()

    // Call 1: senderTeacher lookup — not a teacher
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
    })
    // Call 2: checkParticipant → conversations — user IS parent_id
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { teacher_id: TEACHER_ID, parent_id: USER_ID },
          }),
        }),
      }),
    })
    // Call 3: messages insert
    fromMock.mockReturnValueOnce({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: MSG_ID,
              conversation_id: CONV_ID,
              sender_id: USER_ID,
              body: 'Hello',
              created_at: now,
            },
            error: null,
          }),
        }),
      }),
    })
    // Call 4: update last_message_at
    fromMock.mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    })
    // Call 5: sendNotificationEmail → conversation fetch with teacher join
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: CONV_ID,
              teacher_id: TEACHER_ID,
              parent_id: USER_ID,
              last_notified_at: null,
              teachers: {
                id: TEACHER_ID,
                full_name: 'Mr. Smith',
                user_id: TEACHER_USER_ID,
                social_email: 'teacher@test.com',
              },
            },
          }),
        }),
      }),
    })
    // Call 6: update last_notified_at
    fromMock.mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    })

    vi.mocked(supabaseAdmin.from).mockImplementation(fromMock)

    // Mock auth.admin.getUserById for parent sender name resolution
    vi.mocked(supabaseAdmin.auth.admin.getUserById).mockResolvedValue({
      data: {
        user: {
          id: USER_ID,
          email: 'parent@test.com',
          user_metadata: { full_name: 'Jane Parent' },
        },
      },
      error: null,
    } as never)

    const { POST } = await import('@/app/api/messages/route')
    const res = await POST(makeReq({ conversationId: CONV_ID, body: 'Hello' }))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.id).toBe(MSG_ID)
    expect(json.body).toBe('Hello')
  })

  it('auto-creates conversation when teacherId provided by parent', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(setupAuth({ id: USER_ID }) as never)

    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const fromMock = vi.fn()
    const now = new Date().toISOString()

    // Call 1: senderTeacher lookup — not a teacher
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
    })
    // Call 2: targetTeacher lookup — teacher exists
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: TEACHER_ID } }),
        }),
      }),
    })
    // Call 3: check for existing conversation — none exists
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      }),
    })
    // Call 4: insert new conversation
    fromMock.mockReturnValueOnce({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: CONV_ID },
            error: null,
          }),
        }),
      }),
    })
    // Call 5: checkParticipant → conversations lookup
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { teacher_id: TEACHER_ID, parent_id: USER_ID },
          }),
        }),
      }),
    })
    // Call 6: messages insert
    fromMock.mockReturnValueOnce({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: MSG_ID,
              conversation_id: CONV_ID,
              sender_id: USER_ID,
              body: 'First message',
              created_at: now,
            },
            error: null,
          }),
        }),
      }),
    })
    // Call 7: update last_message_at
    fromMock.mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    })
    // Call 8: sendNotificationEmail → conversation fetch
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: CONV_ID,
              teacher_id: TEACHER_ID,
              parent_id: USER_ID,
              last_notified_at: null,
              teachers: {
                id: TEACHER_ID,
                full_name: 'Mr. Smith',
                user_id: TEACHER_USER_ID,
                social_email: 'teacher@test.com',
              },
            },
          }),
        }),
      }),
    })
    // Call 9: update last_notified_at
    fromMock.mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    })

    vi.mocked(supabaseAdmin.from).mockImplementation(fromMock)

    vi.mocked(supabaseAdmin.auth.admin.getUserById).mockResolvedValue({
      data: {
        user: {
          id: USER_ID,
          email: 'parent@test.com',
          user_metadata: { full_name: 'Jane Parent' },
        },
      },
      error: null,
    } as never)

    const { POST } = await import('@/app/api/messages/route')
    const res = await POST(makeReq({ teacherId: TEACHER_ID, body: 'First message' }))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.conversation_id).toBe(CONV_ID)
    expect(json.body).toBe('First message')
  })

  it('returns 400 when teacher tries to start conversation via teacherId', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(setupAuth({ id: TEACHER_USER_ID }) as never)

    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const fromMock = vi.fn()

    // Call 1: senderTeacher lookup — IS a teacher
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: TEACHER_ID, full_name: 'Mr. Smith' },
          }),
        }),
      }),
    })
    const OTHER_TEACHER_ID = 'aa0e8400-e29b-41d4-a716-446655440009'
    // Call 2: targetTeacher lookup — teacher exists
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: OTHER_TEACHER_ID } }),
        }),
      }),
    })

    vi.mocked(supabaseAdmin.from).mockImplementation(fromMock)

    const { POST } = await import('@/app/api/messages/route')
    const res = await POST(makeReq({ teacherId: OTHER_TEACHER_ID, body: 'Hello' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('Teachers must use conversationId')
  })
})

// =============== POST /api/messages — Email Rate-Limiting ===============

describe('POST /api/messages — email rate-limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    emailSendMock = vi.fn().mockResolvedValue({ data: { id: 'email-1' }, error: null })
    vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
    vi.mock('@/lib/supabase/service', () => ({
      supabaseAdmin: {
        from: vi.fn(),
        auth: { admin: { getUserById: vi.fn() } },
      },
    }))
    vi.mock('resend', () => ({
      Resend: function () {
        return { emails: { send: emailSendMock } }
      },
    }))
    vi.mock('@/emails/NewMessageEmail', () => ({
      NewMessageEmail: vi.fn().mockReturnValue('mocked-email-html'),
    }))
  })

  function makeReq(body: unknown) {
    return new Request('http://localhost/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  /**
   * Set up the full happy-path mock chain for a parent sending a message
   * with a configurable last_notified_at for the email notification path.
   */
  async function setupForEmailTest(lastNotifiedAt: string | null) {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(setupAuth({ id: USER_ID }) as never)

    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const fromMock = vi.fn()
    const now = new Date().toISOString()

    // Call 1: senderTeacher lookup — not a teacher
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
    })
    // Call 2: checkParticipant → conversations lookup
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { teacher_id: TEACHER_ID, parent_id: USER_ID },
          }),
        }),
      }),
    })
    // Call 3: messages insert
    fromMock.mockReturnValueOnce({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: MSG_ID,
              conversation_id: CONV_ID,
              sender_id: USER_ID,
              body: 'Test',
              created_at: now,
            },
            error: null,
          }),
        }),
      }),
    })
    // Call 4: update last_message_at
    fromMock.mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    })
    // Call 5: sendNotificationEmail → conversation fetch with configurable last_notified_at
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: CONV_ID,
              teacher_id: TEACHER_ID,
              parent_id: USER_ID,
              last_notified_at: lastNotifiedAt,
              teachers: {
                id: TEACHER_ID,
                full_name: 'Mr. Smith',
                user_id: TEACHER_USER_ID,
                social_email: 'teacher@test.com',
              },
            },
          }),
        }),
      }),
    })
    // Call 6: update last_notified_at (only reached if email is sent)
    fromMock.mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    })

    vi.mocked(supabaseAdmin.from).mockImplementation(fromMock)

    // Parent sender name
    vi.mocked(supabaseAdmin.auth.admin.getUserById).mockResolvedValue({
      data: {
        user: {
          id: USER_ID,
          email: 'parent@test.com',
          user_metadata: { full_name: 'Jane Parent' },
        },
      },
      error: null,
    } as never)

    return { fromMock, supabaseAdmin }
  }

  it('sends email when last_notified_at is null', async () => {
    await setupForEmailTest(null)

    const { POST } = await import('@/app/api/messages/route')
    const res = await POST(makeReq({ conversationId: CONV_ID, body: 'Test' }))
    expect(res.status).toBe(201)
    expect(emailSendMock).toHaveBeenCalled()
  })

  it('sends email when last_notified_at is > 5 minutes ago', async () => {
    const sixMinAgo = new Date(Date.now() - 6 * 60 * 1000).toISOString()
    await setupForEmailTest(sixMinAgo)

    const { POST } = await import('@/app/api/messages/route')
    const res = await POST(makeReq({ conversationId: CONV_ID, body: 'Test' }))
    expect(res.status).toBe(201)
    expect(emailSendMock).toHaveBeenCalled()
  })

  it('skips email when last_notified_at is < 5 minutes ago', async () => {
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
    await setupForEmailTest(twoMinAgo)

    const { POST } = await import('@/app/api/messages/route')
    const res = await POST(makeReq({ conversationId: CONV_ID, body: 'Test' }))
    expect(res.status).toBe(201)
    expect(emailSendMock).not.toHaveBeenCalled()
  })

  it('message succeeds even when email send throws', async () => {
    await setupForEmailTest(null)
    // Override the send mock to throw
    emailSendMock.mockRejectedValueOnce(new Error('Resend API down'))

    const { POST } = await import('@/app/api/messages/route')
    const res = await POST(makeReq({ conversationId: CONV_ID, body: 'Test' }))
    // Message insert should still succeed
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.id).toBe(MSG_ID)
  })
})

// ======================= GET /api/messages =======================

describe('GET /api/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    emailSendMock = vi.fn()
    vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
    vi.mock('@/lib/supabase/service', () => ({
      supabaseAdmin: {
        from: vi.fn(),
        auth: { admin: { getUserById: vi.fn() } },
      },
    }))
    vi.mock('resend', () => ({
      Resend: function () {
        return { emails: { send: emailSendMock } }
      },
    }))
    vi.mock('@/emails/NewMessageEmail', () => ({
      NewMessageEmail: vi.fn().mockReturnValue('mocked-email-html'),
    }))
  })

  it('returns 401 when unauthenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(setupAuth(null) as never)

    const { GET } = await import('@/app/api/messages/route')
    const req = new Request(`http://localhost/api/messages?conversationId=${CONV_ID}`)
    const res = await GET(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 400 when conversationId is missing', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(setupAuth({ id: USER_ID }) as never)

    const { GET } = await import('@/app/api/messages/route')
    const req = new Request('http://localhost/api/messages')
    const res = await GET(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('conversationId query parameter is required')
  })

  it('returns 400 when conversationId is not a valid UUID', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(setupAuth({ id: USER_ID }) as never)

    const { GET } = await import('@/app/api/messages/route')
    const req = new Request('http://localhost/api/messages?conversationId=not-a-uuid')
    const res = await GET(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Invalid conversationId format')
  })

  it('returns 403 when user is not a participant', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(setupAuth({ id: USER_ID }) as never)

    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const fromMock = vi.fn()

    // checkParticipant → conversations — user is NOT the parent
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { teacher_id: TEACHER_ID, parent_id: 'someone-else' },
          }),
        }),
      }),
    })
    // checkParticipant → teachers — user doesn't own teacher
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      }),
    })

    vi.mocked(supabaseAdmin.from).mockImplementation(fromMock)

    const { GET } = await import('@/app/api/messages/route')
    const req = new Request(`http://localhost/api/messages?conversationId=${CONV_ID}`)
    const res = await GET(req)
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toBe('Not a participant in this conversation')
  })

  it('returns messages ordered by created_at for a participant', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(setupAuth({ id: USER_ID }) as never)

    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const fromMock = vi.fn()

    // checkParticipant → conversations — user IS parent_id
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { teacher_id: TEACHER_ID, parent_id: USER_ID },
          }),
        }),
      }),
    })
    // messages select
    const mockMessages = [
      { id: 'msg-1', conversation_id: CONV_ID, sender_id: USER_ID, body: 'Hello', created_at: '2026-01-01T10:00:00Z' },
      { id: 'msg-2', conversation_id: CONV_ID, sender_id: TEACHER_USER_ID, body: 'Hi!', created_at: '2026-01-01T10:01:00Z' },
    ]
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockMessages, error: null }),
        }),
      }),
    })

    vi.mocked(supabaseAdmin.from).mockImplementation(fromMock)

    const { GET } = await import('@/app/api/messages/route')
    const req = new Request(`http://localhost/api/messages?conversationId=${CONV_ID}`)
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveLength(2)
    expect(json[0].body).toBe('Hello')
    expect(json[1].body).toBe('Hi!')
  })
})

// ======================= GET /api/conversations =======================

describe('GET /api/conversations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
    vi.mock('@/lib/supabase/service', () => ({
      supabaseAdmin: {
        from: vi.fn(),
        auth: { admin: { getUserById: vi.fn() } },
      },
    }))
  })

  it('returns 401 when unauthenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(setupAuth(null) as never)

    const { GET } = await import('@/app/api/conversations/route')
    const res = await GET()
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns conversations for teacher role with last message preview', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(setupAuth({ id: TEACHER_USER_ID }) as never)

    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const fromMock = vi.fn()

    // Call 1: teacher lookup — IS a teacher
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: TEACHER_ID, full_name: 'Mr. Smith' },
          }),
        }),
      }),
    })
    // Call 2: conversations query (chained .select().order().eq())
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              {
                id: CONV_ID,
                teacher_id: TEACHER_ID,
                parent_id: USER_ID,
                last_message_at: '2026-01-01T10:00:00Z',
                created_at: '2026-01-01T09:00:00Z',
                teachers: {
                  id: TEACHER_ID,
                  full_name: 'Mr. Smith',
                  photo_url: null,
                },
              },
            ],
            error: null,
          }),
        }),
      }),
    })
    // Call 3: batch last-message fetch via .select().or()
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        or: vi.fn().mockResolvedValue({
          data: [
            {
              conversation_id: CONV_ID,
              body: 'Hello teacher!',
              sender_id: USER_ID,
              created_at: '2026-01-01T10:00:00Z',
            },
          ],
        }),
      }),
    })

    vi.mocked(supabaseAdmin.from).mockImplementation(fromMock)

    // Teacher fetching the parent's name
    vi.mocked(supabaseAdmin.auth.admin.getUserById).mockResolvedValue({
      data: {
        user: {
          id: USER_ID,
          email: 'parent@test.com',
          user_metadata: { full_name: 'Jane Parent' },
        },
      },
      error: null,
    } as never)

    const { GET } = await import('@/app/api/conversations/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveLength(1)
    expect(json[0].otherParticipantName).toBe('Jane Parent')
    expect(json[0].lastMessage.body).toBe('Hello teacher!')
  })

  it('returns conversations for parent role with teacher name', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(setupAuth({ id: USER_ID }) as never)

    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const fromMock = vi.fn()

    // Call 1: teacher lookup — NOT a teacher
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
    })
    // Call 2: conversations query (parent_id filter)
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              {
                id: CONV_ID,
                teacher_id: TEACHER_ID,
                parent_id: USER_ID,
                last_message_at: '2026-01-01T10:00:00Z',
                created_at: '2026-01-01T09:00:00Z',
                teachers: {
                  id: TEACHER_ID,
                  full_name: 'Mr. Smith',
                  photo_url: '/photo.jpg',
                },
              },
            ],
            error: null,
          }),
        }),
      }),
    })
    // Call 3: batch last-message fetch via .select().or()
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        or: vi.fn().mockResolvedValue({
          data: [
            {
              conversation_id: CONV_ID,
              body: 'See you at 3pm',
              sender_id: TEACHER_USER_ID,
              created_at: '2026-01-01T10:00:00Z',
            },
          ],
        }),
      }),
    })

    vi.mocked(supabaseAdmin.from).mockImplementation(fromMock)

    const { GET } = await import('@/app/api/conversations/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveLength(1)
    expect(json[0].otherParticipantName).toBe('Mr. Smith')
    expect(json[0].lastMessage.body).toBe('See you at 3pm')
  })

  it('truncates last message body to 100 chars', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(setupAuth({ id: USER_ID }) as never)

    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const fromMock = vi.fn()

    // teacher lookup — NOT a teacher
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
    })
    // conversations query
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              {
                id: CONV_ID,
                teacher_id: TEACHER_ID,
                parent_id: USER_ID,
                last_message_at: '2026-01-01T10:00:00Z',
                created_at: '2026-01-01T09:00:00Z',
                teachers: { id: TEACHER_ID, full_name: 'Mr. Smith', photo_url: null },
              },
            ],
            error: null,
          }),
        }),
      }),
    })
    // Call 3: batch last-message fetch via .select().or() with long body
    const longBody = 'A'.repeat(200)
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        or: vi.fn().mockResolvedValue({
          data: [
            {
              conversation_id: CONV_ID,
              body: longBody,
              sender_id: TEACHER_USER_ID,
              created_at: '2026-01-01T10:00:00Z',
            },
          ],
        }),
      }),
    })

    vi.mocked(supabaseAdmin.from).mockImplementation(fromMock)

    const { GET } = await import('@/app/api/conversations/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json[0].lastMessage.body.length).toBe(100)
    expect(json[0].lastMessage.body).toMatch(/\.\.\.$/)
  })
})
