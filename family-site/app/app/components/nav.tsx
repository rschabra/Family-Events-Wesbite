import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function Nav() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  return (
    <nav className="border-b border-gray-200 bg-white sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/events" className="font-semibold text-gray-900 hover:text-gray-700">
          Family Events
        </Link>
        <div className="flex items-center gap-5 text-sm">
          <Link href="/events" className="text-gray-600 hover:text-gray-900">
            Calendar
          </Link>
          <Link href="/profile" className="text-gray-600 hover:text-gray-900">
            Profile
          </Link>
          <form action="/auth/signout" method="post">
            <button className="text-gray-400 hover:text-gray-700 bg-transparent">
              Log out
            </button>
          </form>
        </div>
      </div>
    </nav>
  )
}
