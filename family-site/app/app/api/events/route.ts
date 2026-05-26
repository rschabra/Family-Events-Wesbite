import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendDueBlasts } from '@/lib/sendBlasts'
import type { FamilyEvent } from '@/lib/types'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .order('starts_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ events: events ?? [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    title?: string
    description?: string
    location?: string
    starts_at?: string
    ends_at?: string | null
    announcement?: string
    access_code_id?: string | null
    event_type?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const { title, description, location, starts_at, ends_at, announcement, access_code_id, event_type = 'event' } = body

  if (!title || !starts_at || !announcement) {
    return NextResponse.json(
      { error: 'Title, date, and blast message are required.' },
      { status: 400 }
    )
  }
  if (event_type === 'event' && (!description || !location)) {
    return NextResponse.json(
      { error: 'Description and location are required for events.' },
      { status: 400 }
    )
  }

  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert({
      title: title.trim(),
      description: description?.trim() ?? null,
      location: location?.trim() ?? null,
      starts_at,
      ends_at: ends_at || null,
      event_type,
      created_by: user.id,
      access_code_id: access_code_id ?? null,
    })
    .select()
    .single<FamilyEvent>()

  if (eventError) return NextResponse.json({ error: eventError.message }, { status: 500 })

  if (event_type === 'holiday') {
    // Schedule blast for 9 AM EST (14:00 UTC) on the holiday date
    const holidayDate = new Date(starts_at)
    const blastAt = new Date(Date.UTC(
      holidayDate.getUTCFullYear(),
      holidayDate.getUTCMonth(),
      holidayDate.getUTCDate(),
      14, 0, 0
    ))
    await supabase.from('blasts').insert({
      event_id: event.id,
      created_by: user.id,
      channel: 'email',
      kind: 'reminder',
      message: announcement.trim(),
      send_at: blastAt.toISOString(),
    })
    // Do not send immediately — cron picks it up on the day
  } else {
    await supabase.from('blasts').insert({
      event_id: event.id,
      created_by: user.id,
      channel: 'email',
      kind: 'announcement',
      message: announcement.trim(),
      send_at: new Date().toISOString(),
    })
    await sendDueBlasts()
  }

  return NextResponse.json({ event }, { status: 201 })
}
