'use client'

// Editable profile form. Updates the profiles row directly — RLS allows
// a user to update only their own row. Email is shown read-only
// (changing the login email is a separate, more involved flow).
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'

export default function ProfileForm({
  profile,
  email,
}: {
  profile: Profile
  email: string
}) {
  const [fullName, setFullName] = useState(profile.full_name ?? '')
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [notifyEmail, setNotifyEmail] = useState(profile.notify_email)
  const [notifySms, setNotifySms] = useState(profile.notify_sms)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle'
  )

  async function save() {
    setStatus('saving')
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        notify_email: notifyEmail,
        notify_sms: notifySms,
      })
      .eq('id', profile.id)

    setStatus(error ? 'error' : 'saved')
  }

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-sm text-gray-700">Email (login)</span>
        <input
          value={email}
          disabled
          className="mt-1 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
        />
      </label>

      <label className="block">
        <span className="text-sm text-gray-700">Full name</span>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="text-sm text-gray-700">
          Phone (for text alerts)
        </span>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 202 555 0123"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
        />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm text-gray-700">
          How do you want event alerts?
        </legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={notifyEmail}
            onChange={(e) => setNotifyEmail(e.target.checked)}
          />
          Email
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={notifySms}
            onChange={(e) => setNotifySms(e.target.checked)}
          />
          Text message (starts working once SMS is set up)
        </label>
      </fieldset>

      <button
        onClick={save}
        disabled={status === 'saving'}
        className="w-full rounded-md bg-gray-900 text-white py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
      >
        {status === 'saving' ? 'Saving…' : 'Save changes'}
      </button>

      {status === 'saved' && (
        <p className="text-sm text-green-600">Saved.</p>
      )}
      {status === 'error' && (
        <p className="text-sm text-red-600">
          Couldn&apos;t save. Please try again.
        </p>
      )}
    </div>
  )
}
