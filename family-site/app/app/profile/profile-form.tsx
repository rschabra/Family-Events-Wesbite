'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AccessCode, Profile } from '@/lib/types'

export default function ProfileForm({
  profile,
  email,
  initialGroups,
  isAdmin,
}: {
  profile: Profile
  email: string
  initialGroups: AccessCode[]
  isAdmin: boolean
}) {
  const [fullName, setFullName] = useState(profile.full_name ?? '')
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [notifyEmail, setNotifyEmail] = useState(profile.notify_email)
  const [notifySms, setNotifySms] = useState(profile.notify_sms)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const [groups, setGroups] = useState<AccessCode[]>(initialGroups)
  const [joinCode, setJoinCode] = useState('')
  const [joinStatus, setJoinStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [joinError, setJoinError] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [createStatus, setCreateStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [createError, setCreateError] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const [importFile, setImportFile] = useState<File | null>(null)
  const [importGroupId, setImportGroupId] = useState<string>('')
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; total: number } | null>(null)
  const [importError, setImportError] = useState('')

  async function handleImport(e: React.FormEvent) {
    e.preventDefault()
    if (!importFile) return
    setImportStatus('loading')
    setImportResult(null)
    setImportError('')
    const form = new FormData()
    form.append('file', importFile)
    if (importGroupId) form.append('access_code_id', importGroupId)
    const res = await fetch('/api/admin/import', { method: 'POST', body: form })
    const json = await res.json()
    if (!res.ok) {
      setImportError(json.error ?? 'Import failed.')
      setImportStatus('error')
    } else {
      setImportResult(json)
      setImportStatus('done')
      setImportFile(null)
    }
  }

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

  async function joinGroup(e: React.FormEvent) {
    e.preventDefault()
    if (!joinCode.trim()) return
    setJoinStatus('loading')
    setJoinError('')
    const res = await fetch('/api/groups/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: joinCode.trim() }),
    })
    const json = await res.json()
    if (!res.ok) {
      setJoinError(json.error ?? 'Could not join group.')
      setJoinStatus('error')
    } else {
      setGroups((prev) => {
        if (prev.find((g) => g.id === json.group.id)) return prev
        return [...prev, json.group]
      })
      setJoinCode('')
      setJoinStatus('idle')
    }
  }

  async function createGroup(e: React.FormEvent) {
    e.preventDefault()
    if (!newGroupName.trim()) return
    setCreateStatus('loading')
    setCreateError('')
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newGroupName.trim() }),
    })
    const json = await res.json()
    if (!res.ok) {
      setCreateError(json.error ?? 'Could not create group.')
      setCreateStatus('error')
    } else {
      setGroups((prev) => [...prev, json.group])
      setNewGroupName('')
      setShowCreate(false)
      setCreateStatus('idle')
    }
  }

  return (
    <div className="space-y-8">
      {/* Profile fields */}
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
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="text-sm text-gray-700">Phone (for text alerts)</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 202 555 0123"
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none"
          />
        </label>

        <fieldset className="space-y-2">
          <legend className="text-sm text-gray-700">How do you want event alerts?</legend>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={notifyEmail} onChange={(e) => setNotifyEmail(e.target.checked)} />
            Email
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={notifySms} onChange={(e) => setNotifySms(e.target.checked)} />
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
        {status === 'saved' && <p className="text-sm text-green-600">Saved.</p>}
        {status === 'error' && <p className="text-sm text-red-600">Couldn&apos;t save. Please try again.</p>}
      </div>

      <hr className="border-gray-100" />

      {/* Groups */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">My groups</h2>

        {groups.length === 0 ? (
          <p className="text-sm text-gray-400">You&apos;re not in any groups yet.</p>
        ) : (
          <div className="space-y-2">
            {groups.map((g) => (
              <div key={g.id} className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{g.name}</p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{g.code}</p>
                </div>
                <span className="text-xs text-gray-400">Share code to invite</span>
              </div>
            ))}
          </div>
        )}

        {/* Join group */}
        <form onSubmit={joinGroup} className="flex gap-2">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Enter group code"
            className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-mono text-gray-900 placeholder:text-gray-400 placeholder:font-sans focus:border-gray-900 focus:outline-none"
          />
          <button
            type="submit"
            disabled={joinStatus === 'loading' || !joinCode.trim()}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            {joinStatus === 'loading' ? 'Joining…' : 'Join'}
          </button>
        </form>
        {joinStatus === 'error' && <p className="text-xs text-red-600">{joinError}</p>}

        {/* Create group */}
        {!showCreate ? (
          <button
            onClick={() => setShowCreate(true)}
            className="text-sm text-blue-600 hover:underline"
          >
            + Create a new group
          </button>
        ) : (
          <form onSubmit={createGroup} className="space-y-2">
            <input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Group name (e.g. East Coast Cousins)"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createStatus === 'loading' || !newGroupName.trim()}
                className="rounded-md bg-gray-900 text-white px-4 py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                {createStatus === 'loading' ? 'Creating…' : 'Create group'}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setNewGroupName('') }}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
            {createStatus === 'error' && <p className="text-xs text-red-600">{createError}</p>}
          </form>
        )}
      </div>

      {isAdmin && (
        <>
          <hr className="border-gray-100" />
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Import from Google Calendar</h2>
            <p className="text-xs text-gray-500">
              In Google Calendar: Settings → Import &amp; Export → Export. Unzip the download and upload the <span className="font-mono">.ics</span> file here. Duplicate events are skipped automatically.
            </p>
            <form onSubmit={handleImport} className="space-y-3">
              <input
                type="file"
                accept=".ics"
                onChange={(e) => { setImportFile(e.target.files?.[0] ?? null); setImportStatus('idle'); setImportResult(null); setImportError('') }}
                className="block text-sm text-gray-600 file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:text-gray-700 file:hover:bg-gray-50"
              />
              <label className="block">
                <span className="text-sm text-gray-700">Import to group</span>
                <select
                  value={importGroupId}
                  onChange={(e) => setImportGroupId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
                >
                  <option value="">Everyone (all your groups)</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                disabled={!importFile || importStatus === 'loading'}
                className="rounded-md bg-gray-900 text-white px-4 py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                {importStatus === 'loading' ? 'Importing…' : 'Import events'}
              </button>
              {importStatus === 'done' && importResult && (
                <p className="text-sm text-green-600">
                  Imported {importResult.imported} event{importResult.imported !== 1 ? 's' : ''}{importResult.skipped > 0 ? ` · ${importResult.skipped} skipped (already exist)` : ''}.
                </p>
              )}
              {importStatus === 'error' && (
                <p className="text-sm text-red-600">{importError}</p>
              )}
            </form>
          </div>
        </>
      )}
    </div>
  )
}
