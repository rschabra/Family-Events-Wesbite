'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { AccessCode, FamilyEvent, RsvpStatus } from '@/lib/types'
import { getTheme } from '@/lib/themes'
import EventModal from './event-modal'

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function buildCalendarGrid(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1)
  const startDow = firstOfMonth.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const days: Date[] = []
  for (let i = startDow - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i))
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(new Date(year, month, d))
  }
  const remaining = 42 - days.length
  for (let d = 1; d <= remaining; d++) {
    days.push(new Date(year, month + 1, d))
  }
  return days
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function toYYYYMMDD(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function eventsForDay(events: FamilyEvent[], day: Date) {
  return events.filter((e) => sameDay(new Date(e.starts_at), day))
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function formatDateFull(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function groupByMonth(events: FamilyEvent[]) {
  const groups: { label: string; events: FamilyEvent[] }[] = []
  for (const e of events) {
    const d = new Date(e.starts_at)
    const label = d.toLocaleString('default', { month: 'long', year: 'numeric' })
    const last = groups[groups.length - 1]
    if (last && last.label === label) {
      last.events.push(e)
    } else {
      groups.push({ label, events: [e] })
    }
  }
  return groups
}

function chipClasses(status: RsvpStatus | undefined, isHoliday: boolean, color: string): string {
  if (isHoliday) return 'bg-purple-100 text-purple-700 hover:bg-purple-200 italic'
  switch (status) {
    case 'yes':   return 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
    case 'maybe': return 'bg-amber-100 text-amber-800 hover:bg-amber-200'
    case 'no':    return 'bg-gray-100 text-gray-500 hover:bg-gray-200'
    default:      return getTheme(color).chip
  }
}

export default function EventsClient({
  events,
  userId,
  isAdmin,
  myRsvps,
  groups,
  icalUrl,
  creatorGroupMap,
}: {
  events: FamilyEvent[]
  userId: string
  isAdmin: boolean
  myRsvps: Record<string, RsvpStatus>
  groups: AccessCode[]
  icalUrl: string
  creatorGroupMap: Record<string, string[]>
}) {
  const router = useRouter()
  const today = new Date()

  const [view, setView] = useState<'month' | 'list'>('month')
  useEffect(() => {
    if (window.innerWidth < 768) setView('list')
  }, [])

  const [syncOpen, setSyncOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  function copyIcalUrl() {
    navigator.clipboard.writeText(icalUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  const [currentDate, setCurrentDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  )
  const [modalOpen, setModalOpen] = useState(false)
  const [initialDate, setInitialDate] = useState<string | undefined>(undefined)
  const [groupFilter, setGroupFilter] = useState<string | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const calendarDays = buildCalendarGrid(year, month)

  function openCreate(date?: Date) {
    setInitialDate(date ? toYYYYMMDD(date) : undefined)
    setModalOpen(true)
  }

  function onModalSuccess() {
    setModalOpen(false)
    setInitialDate(undefined)
    router.refresh()
  }

  const visibleEvents = groupFilter
    ? events.filter((e) => {
        if (e.access_code_id === groupFilter) return true
        if (e.access_code_id !== null) return false
        return (creatorGroupMap[e.created_by] ?? []).includes(groupFilter)
      })
    : events

  return (
    <div className="flex-1 p-4 sm:p-6 max-w-6xl mx-auto w-full space-y-4">
      {/* Header */}
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Calendar</h1>
        <div className="relative flex items-center gap-2">
          {/* iCal sync button */}
          <button
            onClick={() => setSyncOpen((o) => !o)}
            title="Sync to calendar"
            className="rounded-lg border border-gray-200 bg-white p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors shadow-xs"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={() => openCreate()}
            className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            + New event
          </button>
          {syncOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setSyncOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-[min(18rem,calc(100vw-2rem))] z-20 rounded-xl border border-gray-100 bg-white shadow-lg p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-900">Sync to your calendar</p>
                <p className="text-xs text-gray-500">Subscribe in Apple Calendar, Google Calendar, or any ICS-compatible app.</p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={icalUrl}
                    className="flex-1 min-w-0 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs font-mono text-gray-600 truncate"
                  />
                  <button
                    onClick={copyIcalUrl}
                    className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <a
                  href={icalUrl.replace(/^https?:/, 'webcal:')}
                  className="block text-sm text-indigo-600 hover:underline font-medium"
                  onClick={() => setSyncOpen(false)}
                >
                  Open in Apple Calendar →
                </a>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Group filter chips */}
      {groups.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setGroupFilter(null)}
            className={`rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${
              groupFilter === null
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'border-gray-200 text-gray-600 bg-white hover:bg-gray-50'
            }`}
          >
            All groups
          </button>
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => setGroupFilter(g.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${
                groupFilter === g.id
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-gray-200 text-gray-600 bg-white hover:bg-gray-50'
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {/* View toggle + month nav */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex rounded-lg border border-gray-200 bg-white overflow-hidden text-sm shadow-xs">
          <button
            onClick={() => setView('month')}
            className={`px-3 py-1.5 font-medium transition-colors ${view === 'month' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Month
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-3 py-1.5 border-l border-gray-200 font-medium transition-colors ${view === 'list' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            List
          </button>
        </div>

        {view === 'month' && (
          <div className="flex items-center gap-1 text-sm">
            <button
              onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
              className="px-2 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors font-medium"
            >
              ‹
            </button>
            <CalendarSelect
              value={month}
              onChange={(m) => setCurrentDate(new Date(year, m, 1))}
              options={['January','February','March','April','May','June','July','August','September','October','November','December'].map((label, i) => ({ label, value: i }))}
            />
            <CalendarSelect
              value={year}
              onChange={(y) => setCurrentDate(new Date(y, month, 1))}
              options={Array.from({ length: 8 }, (_, i) => today.getFullYear() - 1 + i).map((y) => ({ label: String(y), value: y }))}
            />
            <button
              onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
              className="px-2 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors font-medium"
            >
              ›
            </button>
          </div>
        )}
      </div>

      {view === 'month' ? (
        <MonthView
          calendarDays={calendarDays}
          month={month}
          today={today}
          events={visibleEvents}
          myRsvps={myRsvps}
          onDayClick={openCreate}
        />
      ) : (
        <ListView events={visibleEvents} today={today} myRsvps={myRsvps} />
      )}

      <EventModal
        open={modalOpen}
        event={null}
        initialDate={initialDate}
        groups={groups}
        onClose={() => { setModalOpen(false); setInitialDate(undefined) }}
        onSuccess={onModalSuccess}
      />
    </div>
  )
}

function MonthView({
  calendarDays,
  month,
  today,
  events,
  myRsvps,
  onDayClick,
}: {
  calendarDays: Date[]
  month: number
  today: Date
  events: FamilyEvent[]
  myRsvps: Record<string, RsvpStatus>
  onDayClick: (date: Date) => void
}) {
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm bg-white">
      {/* Day headers */}
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
        {DAYS_OF_WEEK.map((d) => (
          <div key={d} className="py-2.5 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-gray-100">
        {calendarDays.map((day, i) => {
          const isCurrentMonth = day.getMonth() === month
          const isToday = sameDay(day, today)
          const dayEvents = eventsForDay(events, day)
          const overflow = dayEvents.length > 3

          return (
            <div
              key={i}
              onClick={() => onDayClick(day)}
              className={`min-h-14 sm:min-h-28 p-1.5 cursor-pointer transition-colors ${
                isCurrentMonth
                  ? isToday ? 'bg-indigo-50/40' : 'bg-white hover:bg-gray-50'
                  : 'bg-gray-50/60 hover:bg-gray-100/60'
              }`}
            >
              <div
                className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full mb-1 ${
                  isToday
                    ? 'bg-indigo-600 text-white'
                    : isCurrentMonth
                    ? 'text-gray-800'
                    : 'text-gray-300'
                }`}
              >
                {day.getDate()}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((e) => (
                  <Link
                    key={e.id}
                    href={`/events/${e.id}`}
                    onClick={(ev) => ev.stopPropagation()}
                    className={`block truncate text-xs rounded-md px-1.5 py-0.5 font-medium transition-colors ${chipClasses(myRsvps[e.id], e.event_type === 'holiday', e.color)}`}
                  >
                    {e.title}
                  </Link>
                ))}
                {overflow && (
                  <Link
                    href={`/events/${dayEvents[3].id}`}
                    onClick={(ev) => ev.stopPropagation()}
                    className="block text-xs text-gray-400 hover:text-indigo-600 px-1.5 transition-colors"
                  >
                    +{dayEvents.length - 3} more
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ListView({
  events,
  today,
  myRsvps,
}: {
  events: FamilyEvent[]
  today: Date
  myRsvps: Record<string, RsvpStatus>
}) {
  const upcoming = events.filter((e) => new Date(e.starts_at) >= today)
  const past = events.filter((e) => new Date(e.starts_at) < today)

  if (events.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        No events yet. Create the first one!
      </div>
    )
  }

  const groups = groupByMonth(upcoming)
  const pastGroups = groupByMonth(past)

  return (
    <div className="space-y-6">
      {groups.length === 0 && (
        <p className="text-sm text-gray-400">No upcoming events.</p>
      )}
      {groups.map((g) => (
        <section key={g.label}>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 px-1">
            {g.label}
          </h2>
          <div className="space-y-2">
            {g.events.map((e) => (
              <EventListItem key={e.id} event={e} rsvpStatus={myRsvps[e.id]} />
            ))}
          </div>
        </section>
      ))}

      {pastGroups.length > 0 && (
        <details className="group">
          <summary className="text-xs font-bold uppercase tracking-widest text-gray-300 cursor-pointer hover:text-gray-400 select-none transition-colors">
            Past events ({past.length})
          </summary>
          <div className="mt-4 space-y-6">
            {pastGroups.map((g) => (
              <section key={g.label}>
                <h2 className="text-xs font-bold uppercase tracking-widest text-gray-300 mb-3 px-1">
                  {g.label}
                </h2>
                <div className="space-y-2">
                  {g.events.map((e) => (
                    <EventListItem key={e.id} event={e} rsvpStatus={myRsvps[e.id]} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

function listBorderClass(status: RsvpStatus | undefined, isHoliday: boolean, color: string): string {
  if (isHoliday) return 'border-l-4 border-l-purple-400'
  switch (status) {
    case 'yes':   return 'border-l-4 border-l-emerald-400'
    case 'maybe': return 'border-l-4 border-l-amber-400'
    case 'no':    return 'border-l-4 border-l-gray-300'
    default:      return `border-l-4 ${getTheme(color).listBorder}`
  }
}

function EventListItem({ event, rsvpStatus }: { event: FamilyEvent; rsvpStatus: RsvpStatus | undefined }) {
  const isHoliday = event.event_type === 'holiday'
  return (
    <Link
      href={`/events/${event.id}`}
      className={`flex items-start gap-4 rounded-xl border border-gray-100 bg-white p-4 hover:border-gray-200 hover:shadow-sm transition-all ${listBorderClass(rsvpStatus, isHoliday, event.color)}`}
    >
      <div className="text-center min-w-10 pt-0.5">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {new Date(event.starts_at).toLocaleString('default', { month: 'short' })}
        </div>
        <div className="text-2xl font-bold leading-none text-gray-900">
          {new Date(event.starts_at).getDate()}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900 truncate">{event.title}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {formatDateFull(event.starts_at)} · {formatTime(event.starts_at)}
        </p>
        {event.location && <p className="text-xs text-gray-400 truncate mt-0.5">{event.location}</p>}
      </div>
      {rsvpStatus && (
        <div className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
          rsvpStatus === 'yes' ? 'bg-emerald-100 text-emerald-700'
          : rsvpStatus === 'maybe' ? 'bg-amber-100 text-amber-700'
          : 'bg-gray-100 text-gray-500'
        }`}>
          {rsvpStatus === 'yes' ? 'Going' : rsvpStatus === 'maybe' ? 'Maybe' : 'Declined'}
        </div>
      )}
    </Link>
  )
}

function CalendarSelect({
  value,
  onChange,
  options,
}: {
  value: number
  onChange: (v: number) => void
  options: { label: string; value: number }[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  const selected = options.find((o) => o.value === value)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold text-gray-900 hover:bg-gray-100 transition-colors"
      >
        {selected?.label}
        <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-30 min-w-max rounded-xl border border-gray-100 bg-white py-1 shadow-lg">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false) }}
              className={`block w-full text-left px-4 py-1.5 text-sm transition-colors hover:bg-gray-50 ${
                o.value === value ? 'font-semibold text-indigo-600' : 'text-gray-700'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
