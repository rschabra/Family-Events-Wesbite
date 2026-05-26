'use client'

import { useState, useEffect } from 'react'
import type { AccessCode, FamilyEvent } from '@/lib/types'

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function EventModal({
  open,
  event,
  initialDate,
  groups,
  onClose,
  onSuccess,
}: {
  open: boolean
  event: FamilyEvent | null
  initialDate?: string
  groups?: AccessCode[]
  onClose: () => void
  onSuccess: () => void
}) {
  const isEditing = event !== null

  const [eventType, setEventType] = useState<'event' | 'holiday'>('event')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [holidayDate, setHolidayDate] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const [accessCodeId, setAccessCodeId] = useState<string>('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (open) {
      const type = (event?.event_type ?? 'event') as 'event' | 'holiday'
      setEventType(type)
      setTitle(event?.title ?? '')
      setDescription(event?.description ?? '')
      setLocation(event?.location ?? '')
      if (event) {
        setStartsAt(toDatetimeLocal(event.starts_at))
        setEndsAt(toDatetimeLocal(event.ends_at))
        setHolidayDate(toDateInput(event.starts_at))
        setAccessCodeId(event.access_code_id ?? '')
      } else if (initialDate) {
        setStartsAt(`${initialDate}T12:00`)
        setEndsAt(`${initialDate}T23:59`)
        setHolidayDate(initialDate)
        setAccessCodeId(groups?.[0]?.id ?? '')
      } else {
        setStartsAt('')
        setEndsAt('')
        setHolidayDate('')
        setAccessCodeId(groups?.[0]?.id ?? '')
      }
      setAnnouncement('')
      setStatus('idle')
      setErrorMsg('')
    }
  }, [open, event, initialDate, groups])

  function handleDateTimeChange(val: string, setter: (v: string) => void) {
    if (val.length === 10) setter(val + 'T12:00')
    else setter(val)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('saving')
    setErrorMsg('')

    let body: Record<string, unknown>

    if (isEditing) {
      body = {
        title,
        description: description || null,
        location: location || null,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      }
    } else if (eventType === 'holiday') {
      // Use noon UTC on the selected date so the calendar renders on the right day
      body = {
        event_type: 'holiday',
        title,
        starts_at: new Date(`${holidayDate}T12:00:00`).toISOString(),
        announcement,
        access_code_id: accessCodeId || null,
      }
    } else {
      body = {
        event_type: 'event',
        title,
        description,
        location,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        announcement,
        access_code_id: accessCodeId || null,
      }
    }

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

  const selectedGroupName = groups?.find((g) => g.id === accessCodeId)?.name

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      <div
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-md bg-white shadow-xl flex flex-col transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit' : eventType === 'holiday' ? 'Add holiday' : 'New event'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-xl leading-none" aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* Event / Holiday toggle — only on create */}
          {!isEditing && (
            <div className="flex rounded-md border border-gray-200 overflow-hidden text-sm">
              {(['event', 'holiday'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setEventType(t)}
                  className={`flex-1 py-2 font-medium capitalize transition-colors ${
                    eventType === t ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {t === 'holiday' ? 'Holiday / Birthday' : 'Event'}
                </button>
              ))}
            </div>
          )}

          <label className="block">
            <span className="text-sm text-gray-700">Title</span>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={eventType === 'holiday' ? "Mom's Birthday" : "Mom's Birthday Dinner"}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none"
            />
          </label>

          {/* Event-only fields */}
          {(isEditing ? event?.event_type !== 'holiday' : eventType === 'event') && (
            <>
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
                    className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-sm text-gray-700">Ends (optional)</span>
                  <input
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => handleDateTimeChange(e.target.value, setEndsAt)}
                    className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
                  />
                </label>
              </div>
            </>
          )}

          {/* Holiday date picker */}
          {!isEditing && eventType === 'holiday' && (
            <label className="block">
              <span className="text-sm text-gray-700">Date</span>
              <input
                required
                type="date"
                value={holidayDate}
                onChange={(e) => setHolidayDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
              />
            </label>
          )}

          {/* Group picker */}
          {!isEditing && groups && groups.length > 0 && (
            <label className="block">
              <span className="text-sm text-gray-700">Group</span>
              <select
                value={accessCodeId}
                onChange={(e) => setAccessCodeId(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
              >
                <option value="">Everyone (all your groups)</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </label>
          )}

          {/* Blast message */}
          {!isEditing && (
            <label className="block">
              <span className="text-sm text-gray-700">
                {eventType === 'holiday' ? 'Blast message' : 'Announcement message'}
                <span className="text-gray-400 font-normal">
                  {eventType === 'holiday'
                    ? ' — sent at 9 AM on the day'
                    : selectedGroupName
                    ? ` — sent to ${selectedGroupName} via email`
                    : ' — sent to all your groups via email'}
                </span>
              </span>
              <textarea
                required
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value)}
                rows={3}
                placeholder={eventType === 'holiday' ? 'Happy Birthday! 🎂 Wishing you a wonderful day!' : 'Hey everyone! You\'re invited to…'}
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
                ? isEditing ? 'Saving…' : 'Creating…'
                : isEditing ? 'Save changes'
                : eventType === 'holiday' ? 'Add holiday'
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
