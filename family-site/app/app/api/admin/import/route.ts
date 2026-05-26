import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface ParsedEvent {
  title: string
  description: string | null
  location: string | null
  starts_at: string
  ends_at: string | null
  event_type: 'event' | 'holiday'
}

function unfoldLines(raw: string): string[] {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n[ \t]/g, '') // join folded continuation lines
    .split('\n')
    .filter(Boolean)
}

function unescapeIcs(str: string): string {
  return str
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
}

function parseIcsDatetime(key: string, value: string): string {
  const isDate = key.includes('VALUE=DATE') && !key.includes('DATE-TIME')
  if (isDate) {
    // 20260528 → noon UTC to avoid off-by-one from timezone shifts
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T12:00:00.000Z`
  }
  if (value.endsWith('Z')) {
    // 20260528T120000Z → ISO
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}.000Z`
  }
  // Local datetime (with TZID or naive) — parse directly
  const d = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}`
  return new Date(d).toISOString()
}

function parseIcs(content: string): ParsedEvent[] {
  const lines = unfoldLines(content)
  const events: ParsedEvent[] = []

  let inEvent = false
  let props: Record<string, string> = {}

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true
      props = {}
      continue
    }
    if (line === 'END:VEVENT') {
      inEvent = false

      if (props['STATUS'] === 'CANCELLED') continue

      const summary = props['SUMMARY']
      if (!summary) continue

      const dtStartKey = Object.keys(props).find((k) => k.startsWith('DTSTART'))
      if (!dtStartKey) continue
      const dtEndKey = Object.keys(props).find((k) => k.startsWith('DTEND'))

      const isAllDay = dtStartKey.includes('VALUE=DATE') && !dtStartKey.includes('DATE-TIME')

      let starts_at: string
      let ends_at: string | null = null
      try {
        starts_at = parseIcsDatetime(dtStartKey, props[dtStartKey])
        if (dtEndKey && !isAllDay) {
          ends_at = parseIcsDatetime(dtEndKey, props[dtEndKey])
        }
      } catch {
        continue
      }

      events.push({
        title: unescapeIcs(summary),
        description: props['DESCRIPTION'] ? unescapeIcs(props['DESCRIPTION']) || null : null,
        location: props['LOCATION'] ? unescapeIcs(props['LOCATION']) || null : null,
        starts_at,
        ends_at,
        event_type: isAllDay ? 'holiday' : 'event',
      })
      continue
    }

    if (!inEvent) continue

    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    // Preserve original key casing for TZID values but uppercase the property name part
    const key = line.slice(0, colonIdx)
    const value = line.slice(colonIdx + 1)
    props[key.toUpperCase()] = value
  }

  return events
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Admins only.' }, { status: 403 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
  const accessCodeId = (formData.get('access_code_id') as string | null) || null

  const content = await file.text()
  const parsed = parseIcs(content)

  if (parsed.length === 0) {
    return NextResponse.json({ error: 'No events found in file. Make sure it is a valid .ics file.' }, { status: 400 })
  }

  let imported = 0
  let skipped = 0

  for (const event of parsed) {
    // Skip duplicates: same title + same start time
    const { data: existing } = await supabase
      .from('events')
      .select('id')
      .eq('title', event.title)
      .eq('starts_at', event.starts_at)
      .maybeSingle()

    if (existing) {
      skipped++
      continue
    }

    const { error } = await supabase.from('events').insert({
      title: event.title,
      description: event.description,
      location: event.location,
      starts_at: event.starts_at,
      ends_at: event.ends_at,
      event_type: event.event_type,
      created_by: user.id,
      access_code_id: accessCodeId,
    })

    if (error) skipped++
    else imported++
  }

  return NextResponse.json({ imported, skipped, total: parsed.length })
}
