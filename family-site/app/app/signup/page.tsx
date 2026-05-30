'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    familyCode: '',
  })

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit() {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.')
        setLoading(false)
        return
      }
      router.push(`/verify?email=${encodeURIComponent(form.email)}`)
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-gray-900">Join the family</h1>
            <p className="text-sm text-gray-500">You&apos;ll need the family code to sign up.</p>
          </div>

          <div className="space-y-3">
            <Field
              label="Full name"
              value={form.fullName}
              onChange={(v) => update('fullName', v)}
            />
            <Field
              label="Email"
              type="email"
              value={form.email}
              onChange={(v) => update('email', v)}
            />
            <Field
              label="Phone (for text alerts later)"
              type="tel"
              value={form.phone}
              onChange={(v) => update('phone', v)}
              placeholder="+1 202 555 0123"
            />
            <Field
              label="Password (8+ characters)"
              type="password"
              value={form.password}
              onChange={(v) => update('password', v)}
            />
            <Field
              label="Family code"
              value={form.familyCode}
              onChange={(v) => update('familyCode', v)}
            />
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
            {loading ? 'Creating account…' : 'Create account'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-600 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all"
      />
    </label>
  )
}
