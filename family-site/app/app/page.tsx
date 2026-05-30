import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <main className="flex-1 flex flex-col items-center justify-center relative overflow-hidden bg-white">
      {/* Gradient background blobs */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-150 h-150 rounded-full bg-indigo-50 opacity-60 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-125 h-125 rounded-full bg-violet-50 opacity-60 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg text-center px-6 py-16 space-y-8">
        {/* Logo — mix-blend-mode:multiply makes the white background
            transparent against the white page */}
        <div className="flex justify-center">
          <Image
            src="/logo.png"
            alt="OurFamCalendar"
            width={300}
            height={300}
            className="w-56 sm:w-72 h-auto mix-blend-multiply"
          />
        </div>

        {/* Subtitle only — logo already carries the brand name */}
        <div>
          <p className="text-lg text-gray-500 leading-relaxed">
            Your shared calendar, events, and RSVPs — all in one place.
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {['Shared calendar', 'Easy RSVPs', 'Email blasts'].map((f) => (
            <span
              key={f}
              className="rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm px-4 py-1.5 font-medium"
            >
              {f}
            </span>
          ))}
        </div>

        {/* CTAs — change based on auth state */}
        {user ? (
          <div className="flex gap-3 justify-center">
            <Link
              href="/events"
              className="rounded-xl bg-indigo-600 text-white px-6 py-3 text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Calendar
            </Link>
            <Link
              href="/profile"
              className="rounded-xl border border-gray-200 bg-white text-gray-700 px-6 py-3 text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm"
            >
              Profile
            </Link>
          </div>
        ) : (
          <div className="flex gap-3 justify-center">
            <Link
              href="/login"
              className="rounded-xl bg-indigo-600 text-white px-6 py-3 text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-xl border border-gray-200 bg-white text-gray-700 px-6 py-3 text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm"
            >
              Sign up
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
