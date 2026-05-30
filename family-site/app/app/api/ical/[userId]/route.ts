import { createHmac } from 'crypto'
import { type NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import type { FamilyEvent } from '@/lib/types'

// Never let Vercel's edge cache serve a stale calendar feed.
export const dynamic = 'force-dynamic'

export function icalToken(userId: string): string {
  const secret = process.env.ICAL_SECRET ?? 'dev-ical-secret'
  return createHmac('sha256', secret).update(userId).digest('hex').slice(0, 32)
}

function toIcsDatetime(iso: string): string {
  // "2026-05-28T12:00:00.000Z" → "20260528T120000Z"
  return iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function toIcsDate(iso: string): string {
  // "2026-05-28T12:00:00.000Z" → "20260528"
  return iso.slice(0, 10).replace(/-/g, '')
}

function toIcsDateNextDay(iso: string): string {
  const d = new Date(iso)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

function escapeIcs(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

// RFC 5545 §3.1: content lines MUST be no longer than 75 octets,
// with a CRLF + whitespace for continuation.
function foldLine(line: string): string {
  if (line.length <= 75) return line
  const out: string[] = [line.slice(0, 75)]
  let pos = 75
  while (pos < line.length) {
    out.push(' ' + line.slice(pos, pos + 74))
    pos += 74
  }
  return out.join('\r\n')
}

function push(lines: string[], line: string) {
  lines.push(foldLine(line))
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
  const token = request.nextUrl.searchParams.get('t')

  if (!token || token !== icalToken(userId)) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const admin = createAdminClient()

  const { data: groupRows } = await admin
    .from('profile_access_codes')
    .select('access_code_id')
    .eq('profile_id', userId)

  const groupIds = (groupRows ?? []).map((r) => r.access_code_id as string)

  const { data: allEvents } = await admin
    .from('events')
    .select('*')
    .order('starts_at', { ascending: true })

  const allEventsTyped = (allEvents ?? []) as FamilyEvent[]
  const creatorIds = [...new Set(
    allEventsTyped.filter(e => e.access_code_id === null).map(e => e.created_by)
  )]
  const creatorGroupMap: Record<string, string[]> = {}
  if (creatorIds.length > 0) {
    const { data: creatorGroupRows } = await admin
      .from('profile_access_codes')
      .select('profile_id, access_code_id')
      .in('profile_id', creatorIds)
    for (const row of creatorGroupRows ?? []) {
      const r = row as { profile_id: string; access_code_id: string }
      if (!creatorGroupMap[r.profile_id]) creatorGroupMap[r.profile_id] = []
      creatorGroupMap[r.profile_id].push(r.access_code_id)
    }
  }

  const events = allEventsTyped.filter((e) => {
    if (e.access_code_id !== null) return groupIds.includes(e.access_code_id)
    const creatorGroups = creatorGroupMap[e.created_by] ?? []
    return creatorGroups.some((g) => groupIds.includes(g))
  })

  const lines: string[] = []
  push(lines, 'BEGIN:VCALENDAR')
  push(lines, 'VERSION:2.0')
  push(lines, 'PRODID:-//OurFamCalendar//EN')
  push(lines, 'CALSCALE:GREGORIAN')
  push(lines, 'METHOD:PUBLISH')
  push(lines, 'X-WR-CALNAME:Family Calendar')
  push(lines, 'X-WR-CALDESC:Our family events and holidays')
  push(lines, 'X-WR-TIMEZONE:America/New_York')
  // Standard refresh hint + Apple-specific hint
  push(lines, 'REFRESH-INTERVAL;VALUE=DURATION:PT1H')
  push(lines, 'X-PUBLISHED-TTL:PT1H')

  for (const event of events) {
    push(lines, 'BEGIN:VEVENT')
    push(lines, `UID:${event.id}@ourfamcalendar.com`)
    // Use updated_at so DTSTAMP is stable between fetches — only changes
    // when the event actually changes, which is what RFC 5545 intends.
    push(lines, `DTSTAMP:${toIcsDatetime(event.updated_at)}`)
    push(lines, `LAST-MODIFIED:${toIcsDatetime(event.updated_at)}`)
    push(lines, `CREATED:${toIcsDatetime(event.created_at)}`)

    if (event.event_type === 'holiday') {
      push(lines, `DTSTART;VALUE=DATE:${toIcsDate(event.starts_at)}`)
      // DTEND for all-day events is exclusive — must be the following day.
      // Without this Apple Calendar won't show the event at all.
      push(lines, `DTEND;VALUE=DATE:${toIcsDateNextDay(event.starts_at)}`)
      push(lines, 'CATEGORIES:Holiday')
    } else {
      push(lines, `DTSTART:${toIcsDatetime(event.starts_at)}`)
      if (event.ends_at) {
        push(lines, `DTEND:${toIcsDatetime(event.ends_at)}`)
      } else {
        // Default 1-hour duration when no end time is set.
        const end = new Date(new Date(event.starts_at).getTime() + 60 * 60 * 1000)
        push(lines, `DTEND:${toIcsDatetime(end.toISOString())}`)
      }
      push(lines, 'CATEGORIES:Event')
    }

    push(lines, `SUMMARY:${escapeIcs(event.title)}`)
    if (event.description) push(lines, `DESCRIPTION:${escapeIcs(event.description)}`)
    if (event.location) push(lines, `LOCATION:${escapeIcs(event.location)}`)
    push(lines, 'END:VEVENT')
  }

  push(lines, 'END:VCALENDAR')

  return new NextResponse(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="family-calendar.ics"',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
    },
  })
}
