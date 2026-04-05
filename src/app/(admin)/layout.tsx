import { redirect, notFound } from 'next/navigation'
import { getAuthUser } from '@/lib/supabase/auth-cache'
import { signOut } from '@/actions/auth'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Fast auth gate via local JWT decode (~0ms) — avoids 200ms network round-trip
  const { user, supabase } = await getAuthUser()

  if (!user) {
    redirect('/login')
  }

  // ADMIN_USER_IDS gating — comma-separated list of allowed user UUIDs
  const allowlist =
    process.env.ADMIN_USER_IDS?.split(',').map((s) => s.trim()).filter(Boolean) ?? []

  // Empty allowlist or user not in list → 404 (not redirect, per ADMIN-04)
  if (allowlist.length === 0 || !allowlist.includes(user.id)) {
    notFound()
  }

  // Only fetch full user data (email) after confirming admin access
  const { data: userData } = await supabase.auth.getUser()
  const email = userData?.user?.email

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-gray-900">
              Admin Dashboard
            </h1>
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
              Operator
            </span>
          </div>

          <div className="flex items-center gap-4">
            {email && (
              <span className="text-sm text-gray-500">
                {email}
              </span>
            )}
            <form action={signOut}>
              <button
                type="submit"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
