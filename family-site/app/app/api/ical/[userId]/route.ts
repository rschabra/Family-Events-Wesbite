import { createHmac } from 'crypto'
import { type NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import type { FamilyEvent } from '@/lib/types'

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

function escapeIcs(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
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

  // Get the user's group memberships
  const { data: groupRows } = await admin
    .from('profile_access_codes')
    .select('access_code_id')
    .eq('profile_id', userId)

  const groupIds = (groupRows ?? []).map((r) => r.access_code_id as string)

  // Fetch all events and filter to ones this user can see
  const { data: allEvents } = await admin
    .from('events')
    .select('*')
    .order('starts_at', { ascending: true })

  // For null-scoped events, only show if viewer shares a group with the creator
  const allEventsTyped = (allEvents ?? []) as FamilyEvent[]
  const creatorIds = [...new Set(
    allEventsTyped.filter(e => e.access_code_id === null).map(e => e.created_by)
  )]
  let creatorGroupMap: Record<string, string[]> = {}
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
    // null: visible if viewer shares any group with the creator
    const creatorGroups = creatorGroupMap[e.created_by] ?? []
    return creatorGroups.some((g) => groupIds.includes(g))
  })

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//OurFamCalendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Family Calendar',
    'X-WR-CALDESC:Our family events and holidays',
    'X-WR-TIMEZONE:America/New_York',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
  ]

  for (const event of events) {
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${event.id}@ourfamcalendar.com`)
    lines.push(`DTSTAMP:${toIcsDatetime(new Date().toISOString())}`)

    if (event.event_type === 'holiday') {
      lines.push(`DTSTART;VALUE=DATE:${toIcsDate(event.starts_at)}`)
    } else {
      lines.push(`DTSTART:${toIcsDatetime(event.starts_at)}`)
      if (event.ends_at) {
        lines.push(`DTEND:${toIcsDatetime(event.ends_at)}`)
      }
    }

    lines.push(`SUMMARY:${escapeIcs(event.title)}`)
    if (event.description) lines.push(`DESCRIPTION:${escapeIcs(event.description)}`)
    if (event.location) lines.push(`LOCATION:${escapeIcs(event.location)}`)
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')

  return new NextResponse(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="family-calendar.ics"',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}
