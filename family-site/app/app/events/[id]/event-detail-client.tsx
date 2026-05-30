'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Blast, FamilyEvent, RsvpStatus, RsvpWithProfile } from '@/lib/types'
import EventModal from '../event-modal'

function localDatetimeNow() {
  const d = new Date()
  d.setSeconds(0, 0)
  return d.toISOString().slice(0, 16)
}

function formatDatetime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }) + ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export default function EventDetailClient({
  event,
  rsvps,
  blasts,
  userId,
  isAdmin,
}: {
  event: FamilyEvent
  rsvps: RsvpWithProfile[]
  blasts: Blast[]
  userId: string
  isAdmin: boolean
}) {
  const router = useRouter()

  const isHoliday = event.event_type === 'holiday'
  const myRsvp = rsvps.find((r) => r.user_id === userId)
  const canEdit = event.created_by === userId || isAdmin

  const [rsvpStatus, setRsvpStatus] = useState<RsvpStatus | null>(myRsvp?.status ?? null)
  const [partySize, setPartySize] = useState(myRsvp?.party_size ?? 1)
  const [rsvpSaving, setRsvpSaving] = useState(false)
  const [rsvpSaved, setRsvpSaved] = useState(false)
  const [rsvpError, setRsvpError] = useState('')

  const [editOpen, setEditOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const [blastOpen, setBlastOpen] = useState(false)
  const [blastKind, setBlastKind] = useState<'reminder' | 'update'>('reminder')
  const [blastMessage, setBlastMessage] = useState('')
  const [blastScheduled, setBlastScheduled] = useState(false)
  const [blastSendAt, setBlastSendAt] = useState(localDatetimeNow)
  const [blastSending, setBlastSending] = useState(false)
  const [blastResult, setBlastResult] = useState<'sent' | 'scheduled' | 'error' | null>(null)
  const [blastError, setBlastError] = useState('')

  async function saveRsvp(status: RsvpStatus, size: number) {
    setRsvpSaving(true)
    setRsvpSaved(false)
    setRsvpError('')

    const res = await fetch('/api/rsvps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: event.id, status, party_size: size }),
    })

    if (!res.ok) {
      const json = await res.json()
      setRsvpError(json.error ?? 'Could not save RSVP.')
    } else {
      setRsvpSaved(true)
      router.refresh()
    }
    setRsvpSaving(false)
  }

  function handleStatusClick(status: RsvpStatus) {
    setRsvpStatus(status)
    saveRsvp(status, status === 'yes' ? partySize : 1)
  }

  async function deleteEvent() {
    if (!confirm('Delete this event? This cannot be undone.')) return
    setDeleting(true)
    setDeleteError('')

    const res = await fetch(`/api/events/${event.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json()
      setDeleteError(json.error ?? 'Could not delete event.')
      setDeleting(false)
      return
    }

    router.push('/events')
  }

  async function sendBlast() {
    if (!blastMessage.trim()) return
    setBlastSending(true)
    setBlastResult(null)
    setBlastError('')

    const send_at = blastScheduled ? new Date(blastSendAt).toISOString() : undefined
    const res = await fetch('/api/blasts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: event.id, message: blastMessage, kind: blastKind, send_at }),
    })

    if (!res.ok) {
      const json = await res.json()
      setBlastError(json.error ?? 'Could not send blast.')
      setBlastResult('error')
    } else {
      setBlastResult(blastScheduled ? 'scheduled' : 'sent')
      setBlastMessage('')
      setBlastScheduled(false)
    }
    setBlastSending(false)
  }

  const goingRsvps = rsvps.filter((r) => r.status === 'yes')
  const maybeRsvps = rsvps.filter((r) => r.status === 'maybe')
  const totalAttending = goingRsvps.reduce((sum, r) => sum + r.party_size, 0)

  return (
    <div className="space-y-5">
      {/* Event header card */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 space-y-3">
        {isHoliday && (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold px-2.5 py-1">
            Holiday / Birthday
          </span>
        )}
        <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>

        <div className="space-y-1.5 text-sm text-gray-600">
          {isHoliday ? (
            <p className="font-medium text-gray-700">
              {new Date(event.starts_at).toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
              })}
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="font-medium text-gray-800">{formatDatetime(event.starts_at)}</span>
              </div>
              {event.ends_at && (
                <div className="flex items-center gap-2 pl-6 text-gray-500">
                  <span>Ends {formatTime(event.ends_at)}</span>
                </div>
              )}
              {event.location && (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-gray-600">{event.location}</span>
                </div>
              )}
            </>
          )}
        </div>

        {event.description && (
          <p className="text-sm text-gray-700 pt-1 whitespace-pre-wrap leading-relaxed border-t border-gray-50 mt-3">
            {event.description}
          </p>
        )}
      </div>

      {/* RSVP section */}
      {!isHoliday && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Will you attend?</h2>

          <div className="flex gap-2 flex-wrap">
            {([
              { status: 'yes' as RsvpStatus, label: 'Going', icon: '✓' },
              { status: 'maybe' as RsvpStatus, label: 'Maybe', icon: '?' },
              { status: 'no' as RsvpStatus, label: 'Not going', icon: '✕' },
            ]).map(({ status, label, icon }) => (
              <button
                key={status}
                onClick={() => handleStatusClick(status)}
                disabled={rsvpSaving}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 ${
                  rsvpStatus === status
                    ? status === 'yes'
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                      : status === 'maybe'
                      ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                      : 'bg-gray-600 border-gray-600 text-white shadow-sm'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                }`}
              >
                <span className="text-xs">{icon}</span>
                {label}
              </button>
            ))}
          </div>

          {rsvpStatus === 'yes' && (
            <div className="flex items-center gap-3 pt-1">
              <span className="text-sm text-gray-600 font-medium">Party size</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const next = Math.max(1, partySize - 1)
                    setPartySize(next)
                    saveRsvp('yes', next)
                  }}
                  className="w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 text-lg leading-none flex items-center justify-center transition-colors font-medium"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm font-bold text-gray-900">{partySize}</span>
                <button
                  onClick={() => {
                    const next = partySize + 1
                    setPartySize(next)
                    saveRsvp('yes', next)
                  }}
                  className="w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 text-lg leading-none flex items-center justify-center transition-colors font-medium"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {rsvpSaved && <p className="text-xs text-emerald-600 font-medium">RSVP saved.</p>}
          {rsvpError && <p className="text-xs text-red-600">{rsvpError}</p>}
        </div>
      )}

      {/* Attendee list */}
      {!isHoliday && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 space-y-3">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
            Attending
            {totalAttending > 0 && (
              <span className="rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5">
                {totalAttending} {totalAttending === 1 ? 'person' : 'people'}
              </span>
            )}
          </h2>

          {goingRsvps.length === 0 && maybeRsvps.length === 0 ? (
            <p className="text-sm text-gray-400">No RSVPs yet. Be the first!</p>
          ) : (
            <div className="space-y-2">
              {goingRsvps.map((r) => (
                <div key={r.id} className="flex items-center gap-2.5 text-sm">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs shrink-0">
                    {(r.profiles.full_name ?? 'F')[0].toUpperCase()}
                  </div>
                  <span className="text-gray-800 font-medium">{r.profiles.full_name ?? 'Family member'}</span>
                  {r.party_size > 1 && (
                    <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">+{r.party_size - 1} guest{r.party_size > 2 ? 's' : ''}</span>
                  )}
                </div>
              ))}
              {maybeRsvps.map((r) => (
                <div key={r.id} className="flex items-center gap-2.5 text-sm">
                  <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs shrink-0">
                    {(r.profiles.full_name ?? 'F')[0].toUpperCase()}
                  </div>
                  <span className="text-gray-500">{r.profiles.full_name ?? 'Family member'}</span>
                  <span className="text-xs text-amber-600 bg-amber-50 rounded-full px-2 py-0.5 font-medium">maybe</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit / Delete / Blast */}
      {canEdit && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Manage event</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setEditOpen(true)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
            >
              Edit event
            </button>
            <button
              onClick={deleteEvent}
              disabled={deleting}
              className="rounded-xl border border-red-100 bg-white text-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-50 hover:border-red-200 transition-all disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
            <button
              onClick={() => { setBlastOpen((o) => !o); setBlastResult(null) }}
              className="rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-700 px-4 py-2 text-sm font-semibold hover:bg-indigo-100 transition-all"
            >
              {blastOpen ? 'Cancel blast' : 'Send a blast'}
            </button>
            {deleteError && <p className="text-xs text-red-600 w-full">{deleteError}</p>}
          </div>

          {blastOpen && (
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Send email blast</h3>

              <div className="flex gap-2">
                {(['reminder', 'update'] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => setBlastKind(k)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      blastKind === k
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {k === 'reminder' ? 'Reminder' : 'Update'}
                  </button>
                ))}
              </div>

              <textarea
                value={blastMessage}
                onChange={(e) => setBlastMessage(e.target.value)}
                placeholder={blastKind === 'reminder' ? "e.g. Don't forget — see you Saturday!" : 'e.g. Venue changed to the park.'}
                rows={3}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none resize-none transition-all"
              />

              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={blastScheduled}
                  onChange={(e) => setBlastScheduled(e.target.checked)}
                  className="rounded accent-indigo-600"
                />
                Schedule for later
              </label>

              {blastScheduled && (
                <input
                  type="datetime-local"
                  value={blastSendAt}
                  onChange={(e) => setBlastSendAt(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all"
                />
              )}

              <button
                onClick={sendBlast}
                disabled={blastSending || !blastMessage.trim()}
                className="rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm"
              >
                {blastSending ? 'Sending…' : blastScheduled ? 'Schedule blast' : 'Send now'}
              </button>

              {blastResult === 'sent' && (
                <p className="text-xs text-emerald-600 font-medium">Blast sent to all family members.</p>
              )}
              {blastResult === 'scheduled' && (
                <p className="text-xs text-emerald-600 font-medium">Blast scheduled successfully.</p>
              )}
              {blastResult === 'error' && (
                <p className="text-xs text-red-600">{blastError || 'Could not send blast.'}</p>
              )}
            </div>
          )}

          {/* Blast history */}
          {blasts.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">Blast history</h3>
              <div className="space-y-2">
                {blasts.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-xs space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 font-semibold ${
                        b.status === 'sent'
                          ? 'bg-emerald-100 text-emerald-700'
                          : b.status === 'failed'
                          ? 'bg-red-100 text-red-600'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {b.status}
                      </span>
                      <span className="text-gray-500 capitalize font-medium">{b.kind}</span>
                      <span className="text-gray-400 ml-auto">
                        {new Date(b.send_at).toLocaleString('en-US', {
                          month: 'short', day: 'numeric',
                          hour: 'numeric', minute: '2-digit', hour12: true,
                        })}
                      </span>
                    </div>
                    <p className="text-gray-600 line-clamp-2">{b.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <EventModal
        open={editOpen}
        event={event}
        onClose={() => setEditOpen(false)}
        onSuccess={() => {
          setEditOpen(false)
          router.refresh()
        }}
      />
    </div>
  )
}
