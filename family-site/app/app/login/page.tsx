'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  async function handleSubmit() {
    // Read directly from the DOM so browser autofill is captured even
    // if it didn't fire onChange (common with password managers).
    const email = (emailRef.current?.value ?? '').trim().toLowerCase()
    const password = passwordRef.current?.value ?? ''

    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      const msg = error.message.toLowerCase()
      if (msg.includes('confirm')) {
        setError('Please verify your email first — check your inbox.')
      } else {
        setError('Wrong email or password.')
      }
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-6">
          <div className="flex justify-center">
            <Image src="/logo.png" alt="OurFamCalendar" width={160} height={160} className="w-16 h-auto" />
          </div>

          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
            <p className="text-sm text-gray-500">Sign in to your family account</p>
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Email</span>
              <input
                ref={emailRef}
                type="email"
                autoComplete="email"
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Password</span>
              <input
                ref={passwordRef}
                type="password"
                autoComplete="current-password"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all"
              />
            </label>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 text-white py-2.5 text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="text-center space-y-2">
            <p className="text-sm text-gray-500">
              Need an account?{' '}
              <Link href="/signup" className="text-indigo-600 font-semibold hover:underline">
                Sign up
              </Link>
            </p>
            <p className="text-sm">
              <Link href="/forgot-password" className="text-gray-400 hover:text-gray-600 hover:underline text-xs">
                Forgot password?
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
