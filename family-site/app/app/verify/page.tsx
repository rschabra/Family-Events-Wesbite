'use client'

// Shown after signup: "check your email". Also handles the case where a
// verification link was expired/invalid (?error=invalid) and offers a
// resend button.
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function VerifyInner() {
  const params = useSearchParams()
  const email = params.get('email') ?? ''
  const linkError = params.get('error') === 'invalid'

  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle'
  )

  async function resend() {
    if (!email) return
    setStatus('sending')
    const supabase = createClient()
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    })
    setStatus(error ? 'error' : 'sent')
  }

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-5 text-center">
        <h1 className="text-2xl font-semibold">
          {linkError ? 'That link didn\u2019t work' : 'Check your email'}
        </h1>

        {linkError ? (
          <p className="text-sm text-gray-600">
            Your verification link was invalid or expired. Send a fresh one
            below.
          </p>
        ) : (
          <p className="text-sm text-gray-600">
            We sent a verification link{email ? ` to ${email}` : ''}. Click it
            to activate your account, then log in.
          </p>
        )}

        {email && (
          <button
            onClick={resend}
            disabled={status === 'sending' || status === 'sent'}
            className="w-full rounded-md border border-gray-300 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            {status === 'sending'
              ? 'Sending…'
              : status === 'sent'
                ? 'Sent — check your inbox'
                : 'Resend verification email'}
          </button>
        )}

        {status === 'error' && (
          <p className="text-sm text-red-600">
            Couldn&apos;t resend. Wait a minute and try again.
          </p>
        )}

        <p className="text-sm text-gray-500">
          <Link href="/login" className="text-gray-900 underline">
            Back to login
          </Link>
        </p>
      </div>
    </main>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="flex-1" />}>
      <VerifyInner />
    </Suspense>
  )
}
