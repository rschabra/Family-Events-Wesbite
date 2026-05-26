'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!email.trim()) return
    setLoading(true)
    setError(null)

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${siteUrl}/auth/confirm`,
    })

    if (error) {
      setError('Could not send reset email. Please try again.')
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold">Reset your password</h1>
          <p className="text-sm text-gray-500">
            {"We'll send a reset link to your email."}
          </p>
        </div>

        {sent ? (
          <div className="rounded-md bg-green-50 border border-green-200 p-4 text-sm text-green-800 text-center space-y-2">
            <p className="font-medium">Check your inbox</p>
            <p className="text-green-700">A reset link was sent to <span className="font-mono">{email}</span>.</p>
          </div>
        ) : (
          <>
            <label className="block">
              <span className="text-sm text-gray-700">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none"
              />
            </label>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-md p-2">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading || !email.trim()}
              className="w-full rounded-md bg-gray-900 text-white py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </>
        )}

        <p className="text-center text-sm text-gray-500">
          <Link href="/login" className="text-gray-900 underline">
            Back to log in
          </Link>
        </p>
      </div>
    </main>
  )
}
