'use client'

import { useState, useEffect } from 'react'
import type { FamilyEvent } from '@/lib/types'

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function EventModal({
  open,
  event,
  initialDate,
  onClose,
  onSuccess,
}: {
  open: boolean
  event: FamilyEvent | null
  initialDate?: string   // "YYYY-MM-DD" — pre-fills start/end when creating from a day click
  onClose: () => void
  onSuccess: () => void
}) {
  const isEditing = event !== null

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  // Reset fields when the modal opens or the target event/date changes
  useEffect(() => {
    if (open) {
      setTitle(event?.title ?? '')
      setDescription(event?.description ?? '')
      setLocation(event?.location ?? '')
      if (event) {
        setStartsAt(toDatetimeLocal(event.starts_at))
        setEndsAt(toDatetimeLocal(event.ends_at))
      } else if (initialDate) {
        setStartsAt(`${initialDate}T12:00`)
        setEndsAt(`${initialDate}T23:59`)
      } else {
        setStartsAt('')
        setEndsAt('')
      }
      setAnnouncement('')
      setStatus('idle')
      setErrorMsg('')
    }
  }, [open, event, initialDate])

  // If user picks only a date (no time) in the datetime-local input, fill in noon
  function handleDateTimeChange(val: string, setter: (v: string) => void) {
    if (val.length === 10) {
      setter(val + 'T12:00')
    } else {
      setter(val)
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('saving')
    setErrorMsg('')

    const body = isEditing
      ? { title, description, location, starts_at: new Date(startsAt).toISOString(), ends_at: endsAt ? new Date(endsAt).toISOString() : null }
      : { title, description, location, starts_at: new Date(startsAt).toISOString(), ends_at: endsAt ? new Date(endsAt).toISOString() : null, announcement }

    const res = await fetch(
      isEditing ? `/api/events/${event.id}` : '/api/events',
      {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    )

    const json = await res.json()
    if (!res.ok) {
      setStatus('error')
      setErrorMsg(json.error ?? 'Something went wrong.')
      return
    }

    setStatus('idle')
    onSuccess()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-md bg-white shadow-xl flex flex-col transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit event' : 'New event'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <label className="block">
            <span className="text-sm text-gray-700">Title</span>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Mom's Birthday Dinner"
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-sm text-gray-700">Description</span>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What's the occasion?"
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none resize-none"
            />
          </label>

          <label className="block">
            <span className="text-sm text-gray-700">Location</span>
            <input
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="123 Main St, Springfield"
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm text-gray-700">Starts</span>
              <input
                required
                type="datetime-local"
                value={startsAt}
                onChange={(e) => handleDateTimeChange(e.target.value, setStartsAt)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="text-sm text-gray-700">Ends (optional)</span>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => handleDateTimeChange(e.target.value, setEndsAt)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none"
              />
            </label>
          </div>

          {!isEditing && (
            <label className="block">
              <span className="text-sm text-gray-700">
                Announcement message
                <span className="text-gray-400 font-normal"> — sent to the family via email</span>
              </span>
              <textarea
                required
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value)}
                rows={3}
                placeholder="Hey everyone! You're invited to…"
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none resize-none"
              />
            </label>
          )}

          {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={status === 'saving'}
              className="flex-1 rounded-md bg-gray-900 text-white py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {status === 'saving'
                ? isEditing
                  ? 'Saving…'
                  : 'Creating…'
                : isEditing
                ? 'Save changes'
                : 'Create event'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
