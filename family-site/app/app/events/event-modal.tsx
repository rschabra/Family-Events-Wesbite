'use client'

import { useState, useEffect } from 'react'
import type { AccessCode, FamilyEvent } from '@/lib/types'
import { THEME_NAMES, THEMES } from '@/lib/themes'

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

const inputClass = 'mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all'
const labelSpanClass = 'text-xs font-semibold text-gray-600 uppercase tracking-wide'

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
  const [color, setColor] = useState<string>('indigo')
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
        setColor(event.color ?? 'indigo')
      } else if (initialDate) {
        setStartsAt(`${initialDate}T12:00`)
        setEndsAt(`${initialDate}T23:59`)
        setHolidayDate(initialDate)
        setAccessCodeId('')
        setColor('indigo')
      } else {
        setStartsAt('')
        setEndsAt('')
        setHolidayDate('')
        setAccessCodeId('')
        setColor('indigo')
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

  async function submit(e: React.SyntheticEvent) {
    e.preventDefault()
    setStatus('saving')
    setErrorMsg('')

    let body: Record<string, unknown>

    if (isEditing) {
      const editingHoliday = event?.event_type === 'holiday'
      body = {
        title,
        description: editingHoliday ? null : (description || null),
        location: editingHoliday ? null : (location || null),
        starts_at: editingHoliday
          ? new Date(`${holidayDate}T12:00:00`).toISOString()
          : new Date(startsAt).toISOString(),
        ends_at: editingHoliday ? null : (endsAt ? new Date(endsAt).toISOString() : null),
        color,
      }
    } else if (eventType === 'holiday') {
      body = {
        event_type: 'holiday',
        title,
        starts_at: new Date(`${holidayDate}T12:00:00`).toISOString(),
        announcement,
        access_code_id: accessCodeId || null,
        color,
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
        color,
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
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      <div
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-md bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
          <h2 className="text-lg font-bold text-gray-900">
            {isEditing ? 'Edit event' : eventType === 'holiday' ? 'Add holiday' : 'New event'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Event / Holiday toggle */}
          {!isEditing && (
            <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm bg-gray-50">
              {(['event', 'holiday'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setEventType(t)}
                  className={`flex-1 py-2.5 font-semibold capitalize transition-colors ${
                    eventType === t ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {t === 'holiday' ? 'Holiday / Birthday' : 'Event'}
                </button>
              ))}
            </div>
          )}

          <label className="block">
            <span className={labelSpanClass}>Title</span>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={eventType === 'holiday' ? "Mom's Birthday" : "Mom's Birthday Dinner"}
              className={inputClass}
            />
          </label>

          {/* Color picker */}
          <div className="space-y-2">
            <span className={labelSpanClass}>Color</span>
            <div className="flex gap-2 flex-wrap mt-1.5">
              {THEME_NAMES.map((name) => (
                <button
                  key={name}
                  type="button"
                  title={THEMES[name].label}
                  onClick={() => setColor(name)}
                  className={`w-7 h-7 rounded-full transition-all ${THEMES[name].swatch} ${
                    color === name
                      ? 'ring-2 ring-offset-2 ring-gray-400 scale-110'
                      : 'hover:scale-105 opacity-70 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Event-only fields */}
          {(isEditing ? event?.event_type !== 'holiday' : eventType === 'event') && (
            <>
              <label className="block">
                <span className={labelSpanClass}>Description</span>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="What's the occasion?"
                  className={`${inputClass} resize-none`}
                />
              </label>

              <label className="block">
                <span className={labelSpanClass}>Location</span>
                <input
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="123 Main St, Springfield"
                  className={inputClass}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={labelSpanClass}>Starts</span>
                  <input
                    required
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => handleDateTimeChange(e.target.value, setStartsAt)}
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className={labelSpanClass}>Ends (optional)</span>
                  <input
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => handleDateTimeChange(e.target.value, setEndsAt)}
                    className={inputClass}
                  />
                </label>
              </div>
            </>
          )}

          {/* Holiday date picker */}
          {((!isEditing && eventType === 'holiday') || (isEditing && event?.event_type === 'holiday')) && (
            <label className="block">
              <span className={labelSpanClass}>Date</span>
              <input
                required
                type="date"
                value={holidayDate}
                onChange={(e) => setHolidayDate(e.target.value)}
                className={inputClass}
              />
            </label>
          )}

          {/* Group picker */}
          {!isEditing && groups && groups.length > 0 && (
            <label className="block">
              <span className={labelSpanClass}>Group</span>
              <select
                value={accessCodeId}
                onChange={(e) => setAccessCodeId(e.target.value)}
                className={inputClass}
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
              <span className={labelSpanClass}>
                {eventType === 'holiday' ? 'Blast message' : 'Announcement'}
              </span>
              <span className="block text-xs text-gray-400 mt-0.5 mb-1.5">
                {eventType === 'holiday'
                  ? 'Sent at 9 AM on the day'
                  : selectedGroupName
                  ? `Sent to ${selectedGroupName} via email`
                  : 'Sent to all your groups via email'}
              </span>
              <textarea
                required
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value)}
                rows={3}
                placeholder={eventType === 'holiday' ? 'Happy Birthday! 🎂 Wishing you a wonderful day!' : "Hey everyone! You're invited to…"}
                className={`${inputClass} resize-none`}
              />
            </label>
          )}

          {errorMsg && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
              {errorMsg}
            </p>
          )}

          <div className="flex gap-3 pt-1 pb-6">
            <button
              type="submit"
              disabled={status === 'saving'}
              className="flex-1 rounded-xl bg-indigo-600 text-white py-2.5 text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm"
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
              className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
