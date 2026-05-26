'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setError(null)
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('Could not update password. The reset link may have expired.')
      setLoading(false)
      return
    }

    router.push('/events')
  }

  return (
    <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold">Set new password</h1>
          <p className="text-sm text-gray-500">Choose a password with at least 8 characters.</p>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="text-sm text-gray-700">New password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">Confirm password</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none"
            />
          </label>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-md p-2">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !password || !confirm}
          className="w-full rounded-md bg-gray-900 text-white py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Set new password'}
        </button>
      </div>
    </main>
  )
}
