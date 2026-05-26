// Protected dashboard. Server component — reads the current user and
// their profile server-side. Middleware already guarantees a logged-in
// user reaches this page; this is the post-login home.
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<Profile>()

  const name = profile?.full_name ?? 'there'

  return (
    <main className="flex-1 p-6 max-w-2xl mx-auto w-full space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Family Events</h1>
        <form action="/auth/signout" method="post">
          <button className="text-sm text-gray-500 hover:text-gray-900 underline">
            Log out
          </button>
        </form>
      </header>

      <div className="rounded-lg border border-gray-200 p-5 space-y-1">
        <p className="text-lg">Hi {name} 👋</p>
        <p className="text-sm text-gray-500">
          You&apos;re logged in and verified. The calendar and events come on
          Day 3.
        </p>
      </div>

      <nav className="flex gap-3 text-sm">
        <Link
          href="/profile"
          className="rounded-md border border-gray-300 px-3 py-2 hover:bg-gray-50"
        >
          Edit profile
        </Link>
        {profile?.is_admin && (
          <span className="rounded-md bg-gray-900 text-white px-3 py-2">
            Admin
          </span>
        )}
      </nav>
    </main>
  )
}
