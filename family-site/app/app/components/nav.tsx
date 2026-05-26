import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'

export default async function Nav() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  return (
    <nav className="border-b border-gray-200 bg-white sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/events" className="flex items-center">
          <Image src="/navbarlogo.png" alt="OurFamCalendar" height={193} width={1033} className="h-7 sm:h-9 w-auto" />
        </Link>
        <div className="flex items-center gap-3 sm:gap-5 text-sm">
          <Link href="/events" className="hidden sm:block text-gray-600 hover:text-gray-900 py-2">
            Calendar
          </Link>
          <Link href="/profile" className="text-gray-600 hover:text-gray-900 py-2">
            Profile
          </Link>
          <form action="/auth/signout" method="post">
            <button className="text-gray-400 hover:text-gray-700 bg-transparent py-2">
              Log out
            </button>
          </form>
        </div>
      </div>
    </nav>
  )
}
