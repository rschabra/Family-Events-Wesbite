import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const { title, description, location, starts_at, ends_at, announcement } = body
  if (!title || !description || !location || !starts_at || !announcement) {
    return NextResponse.json(
      { error: 'Title, description, location, start time, and announcement message are required.' },
      { status: 400 }
    )
  }

  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert({
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      starts_at,
      ends_at: ends_at || null,
      created_by: user.id,
    })
    .select()
    .single<FamilyEvent>()

  if (eventError) return NextResponse.json({ error: eventError.message }, { status: 500 })

  // Create the required announcement blast (sent on Day 4)
  await supabase.from('blasts').insert({
    event_id: event.id,
    created_by: user.id,
    channel: 'email',
    kind: 'announcement',
    message: announcement.trim(),
    send_at: new Date().toISOString(),
  })

  return NextResponse.json({ event }, { status: 201 })
}
