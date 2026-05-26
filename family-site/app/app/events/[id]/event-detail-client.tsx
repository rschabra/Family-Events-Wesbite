'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { FamilyEvent, RsvpStatus, RsvpWithProfile } from '@/lib/types'
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
  userId,
  isAdmin,
}: {
  event: FamilyEvent
  rsvps: RsvpWithProfile[]
  userId: string
  isAdmin: boolean
}) {
  const router = useRouter()

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
    <div className="space-y-6">
      {/* Event info */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900">{event.title}</h1>

        <div className="text-sm text-gray-600 space-y-1">
          <p className="text-gray-700">{formatDatetime(event.starts_at)}</p>
          {event.ends_at && (
            <p className="text-gray-500">Ends {formatTime(event.ends_at)}</p>
          )}
          <p className="text-gray-600">📍 {event.location}</p>
        </div>

        <p className="text-sm text-gray-700 pt-1 whitespace-pre-wrap">{event.description}</p>
      </div>

      <hr className="border-gray-100" />

      {/* RSVP section */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Will you attend?</h2>

        <div className="flex gap-2 flex-wrap">
          {(['yes', 'maybe', 'no'] as RsvpStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => handleStatusClick(s)}
              disabled={rsvpSaving}
              className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                rsvpStatus === s
                  ? s === 'yes'
                    ? 'bg-green-600 border-green-600 text-white'
                    : s === 'maybe'
                    ? 'bg-yellow-500 border-yellow-500 text-white'
                    : 'bg-gray-600 border-gray-600 text-white'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              {s === 'yes' ? 'Going' : s === 'maybe' ? 'Maybe' : 'Not going'}
            </button>
          ))}
        </div>

        {rsvpStatus === 'yes' && (
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700">Party size</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const next = Math.max(1, partySize - 1)
                  setPartySize(next)
                  saveRsvp('yes', next)
                }}
                className="w-7 h-7 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 text-lg leading-none flex items-center justify-center"
              >
                −
              </button>
              <span className="w-6 text-center text-sm font-medium">{partySize}</span>
              <button
                onClick={() => {
                  const next = partySize + 1
                  setPartySize(next)
                  saveRsvp('yes', next)
                }}
                className="w-7 h-7 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 text-lg leading-none flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>
        )}

        {rsvpSaved && <p className="text-xs text-green-600">RSVP saved.</p>}
        {rsvpError && <p className="text-xs text-red-600">{rsvpError}</p>}
      </section>

      <hr className="border-gray-100" />

      {/* Attendee list */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">
          Attending
          {totalAttending > 0 && (
            <span className="ml-2 font-normal text-gray-400">
              {totalAttending} {totalAttending === 1 ? 'person' : 'people'}
            </span>
          )}
        </h2>

        {goingRsvps.length === 0 && maybeRsvps.length === 0 ? (
          <p className="text-sm text-gray-400">No RSVPs yet.</p>
        ) : (
          <div className="space-y-1">
            {goingRsvps.map((r) => (
              <div key={r.id} className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                <span className="text-gray-700">{r.profiles.full_name ?? 'Family member'}</span>
                {r.party_size > 1 && (
                  <span className="text-gray-400">+{r.party_size - 1}</span>
                )}
              </div>
            ))}
            {maybeRsvps.map((r) => (
              <div key={r.id} className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" />
                <span className="text-gray-500">{r.profiles.full_name ?? 'Family member'} (maybe)</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Edit / Delete / Blast — only for creator or admin */}
      {canEdit && (
        <>
          <hr className="border-gray-100" />
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setEditOpen(true)}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              Edit event
            </button>
            <button
              onClick={deleteEvent}
              disabled={deleting}
              className="rounded-md border border-red-200 text-red-600 px-4 py-2 text-sm hover:bg-red-50 disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete event'}
            </button>
            <button
              onClick={() => { setBlastOpen((o) => !o); setBlastResult(null) }}
              className="rounded-md border border-blue-200 text-blue-700 px-4 py-2 text-sm hover:bg-blue-50"
            >
              {blastOpen ? 'Cancel blast' : 'Send a blast'}
            </button>
            {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}
          </div>

          {blastOpen && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Send email blast</h3>

              <div className="flex gap-2">
                {(['reminder', 'update'] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => setBlastKind(k)}
                    className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
                      blastKind === k
                        ? 'bg-gray-900 border-gray-900 text-white'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {k === 'reminder' ? 'Reminder' : 'Update'}
                  </button>
                ))}
              </div>

              <textarea
                value={blastMessage}
                onChange={(e) => setBlastMessage(e.target.value)}
                placeholder={blastKind === 'reminder' ? 'e.g. Don\'t forget — see you Saturday!' : 'e.g. Venue changed to the park.'}
                rows={3}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none resize-none"
              />

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={blastScheduled}
                  onChange={(e) => setBlastScheduled(e.target.checked)}
                  className="rounded"
                />
                Schedule for later
              </label>

              {blastScheduled && (
                <input
                  type="datetime-local"
                  value={blastSendAt}
                  onChange={(e) => setBlastSendAt(e.target.value)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
                />
              )}

              <button
                onClick={sendBlast}
                disabled={blastSending || !blastMessage.trim()}
                className="rounded-md bg-gray-900 text-white px-4 py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                {blastSending ? 'Sending…' : blastScheduled ? 'Schedule blast' : 'Send now'}
              </button>

              {blastResult === 'sent' && (
                <p className="text-xs text-green-600">Blast sent to all family members.</p>
              )}
              {blastResult === 'scheduled' && (
                <p className="text-xs text-green-600">Blast scheduled successfully.</p>
              )}
              {blastResult === 'error' && (
                <p className="text-xs text-red-600">{blastError || 'Could not send blast.'}</p>
              )}
            </div>
          )}
        </>
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
