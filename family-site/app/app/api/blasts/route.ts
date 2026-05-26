import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendDueBlasts } from '@/lib/sendBlasts'
import type { FamilyEvent } from '@/lib/types'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    event_id?: string
    message?: string
    kind?: string
    send_at?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const { event_id, message, kind = 'reminder', send_at } = body
  if (!event_id || !message?.trim()) {
    return NextResponse.json(
      { error: 'event_id and message are required.' },
      { status: 400 }
    )
  }

  // Verify the caller is the event creator or an admin
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, created_by')
    .eq('id', event_id)
    .single<Pick<FamilyEvent, 'id' | 'created_by'>>()

  if (eventError || !event) {
    return NextResponse.json({ error: 'Event not found.' }, { status: 404 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single<{ is_admin: boolean }>()

  if (event.created_by !== user.id && !profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  const scheduledAt = send_at ?? new Date().toISOString()

  const { data: blast, error: blastError } = await supabase
    .from('blasts')
    .insert({
      event_id,
      created_by: user.id,
      channel: 'email',
      kind,
      message: message.trim(),
      send_at: scheduledAt,
    })
    .select()
    .single()

  if (blastError) {
    return NextResponse.json({ error: blastError.message }, { status: 500 })
  }

  // If send_at is now or in the past, send immediately
  if (new Date(scheduledAt) <= new Date()) {
    await sendDueBlasts()
  }

  return NextResponse.json({ blast }, { status: 201 })
}
