'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AccessCode, Profile } from '@/lib/types'

const inputClass = 'mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400'
const labelSpanClass = 'text-xs font-semibold text-gray-600 uppercase tracking-wide'

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

  async function handleImport(e: React.SyntheticEvent) {
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

  async function joinGroup(e: React.SyntheticEvent) {
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

  async function createGroup(e: React.SyntheticEvent) {
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
    <div className="space-y-5">
      {/* Profile info card */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 space-y-5">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Profile</h2>

        <label className="block">
          <span className={labelSpanClass}>Email (login)</span>
          <input value={email} disabled className={inputClass} />
        </label>

        <label className="block">
          <span className={labelSpanClass}>Full name</span>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className={labelSpanClass}>Phone (for text alerts)</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 202 555 0123"
            className={inputClass}
          />
        </label>

        <fieldset className="space-y-2.5">
          <legend className={labelSpanClass}>Alert preferences</legend>
          <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.checked)}
              className="w-4 h-4 rounded accent-indigo-600"
            />
            Email notifications
          </label>
          <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={notifySms}
              onChange={(e) => setNotifySms(e.target.checked)}
              className="w-4 h-4 rounded accent-indigo-600"
            />
            <span>
              Text message alerts{' '}
              <a href="/privacy" target="_blank" className="text-gray-400 hover:text-gray-600 underline text-xs">
                privacy policy
              </a>
            </span>
          </label>
        </fieldset>

        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={status === 'saving'}
            className="rounded-xl bg-indigo-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm"
          >
            {status === 'saving' ? 'Saving…' : 'Save changes'}
          </button>
          {status === 'saved' && <p className="text-sm text-emerald-600 font-medium">Saved!</p>}
          {status === 'error' && <p className="text-sm text-red-600">Couldn&apos;t save. Please try again.</p>}
        </div>
      </div>

      {/* Groups card */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">My groups</h2>

        {groups.length === 0 ? (
          <p className="text-sm text-gray-400">You&apos;re not in any groups yet.</p>
        ) : (
          <div className="space-y-2">
            {groups.map((g) => (
              <div key={g.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{g.name}</p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{g.code}</p>
                </div>
                <span className="text-xs text-indigo-500 bg-indigo-50 rounded-full px-2.5 py-1 font-medium">Share code to invite</span>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={joinGroup} className="flex gap-2">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Enter group code"
            className="flex-1 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-mono text-gray-900 placeholder:text-gray-400 placeholder:font-sans focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all"
          />
          <button
            type="submit"
            disabled={joinStatus === 'loading' || !joinCode.trim()}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {joinStatus === 'loading' ? 'Joining…' : 'Join'}
          </button>
        </form>
        {joinStatus === 'error' && <p className="text-xs text-red-600">{joinError}</p>}

        {!showCreate ? (
          <button
            onClick={() => setShowCreate(true)}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold hover:underline transition-colors"
          >
            + Create a new group
          </button>
        ) : (
          <form onSubmit={createGroup} className="space-y-2.5">
            <input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Group name (e.g. East Coast Cousins)"
              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createStatus === 'loading' || !newGroupName.trim()}
                className="rounded-xl bg-indigo-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm"
              >
                {createStatus === 'loading' ? 'Creating…' : 'Create group'}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setNewGroupName('') }}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
            {createStatus === 'error' && <p className="text-xs text-red-600">{createError}</p>}
          </form>
        )}
      </div>

      {/* Admin import card */}
      {isAdmin && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Import from Google Calendar</h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            In Google Calendar: Settings → Import &amp; Export → Export. Unzip the download and upload the <span className="font-mono bg-gray-100 px-1 rounded">.ics</span> file here. Duplicate events are skipped automatically.
          </p>
          <form onSubmit={handleImport} className="space-y-3">
            <input
              type="file"
              accept=".ics"
              onChange={(e) => { setImportFile(e.target.files?.[0] ?? null); setImportStatus('idle'); setImportResult(null); setImportError('') }}
              className="block text-sm text-gray-600 file:mr-3 file:rounded-lg file:border file:border-gray-200 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-gray-700 file:hover:bg-gray-50 file:transition-colors"
            />
            <label className="block">
              <span className={labelSpanClass}>Import to group</span>
              <select
                value={importGroupId}
                onChange={(e) => setImportGroupId(e.target.value)}
                className={inputClass}
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
              className="rounded-xl bg-indigo-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm"
            >
              {importStatus === 'loading' ? 'Importing…' : 'Import events'}
            </button>
            {importStatus === 'done' && importResult && (
              <p className="text-sm text-emerald-600 font-medium">
                Imported {importResult.imported} event{importResult.imported !== 1 ? 's' : ''}{importResult.skipped > 0 ? ` · ${importResult.skipped} skipped (already exist)` : ''}.
              </p>
            )}
            {importStatus === 'error' && (
              <p className="text-sm text-red-600">{importError}</p>
            )}
          </form>
        </div>
      )}
    </div>
  )
}
