import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { RsvpStatus } from '@/lib/types'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    event_id?: string
    status?: RsvpStatus
    party_size?: number
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const { event_id, status, party_size } = body
  if (!event_id || !status) {
    return NextResponse.json({ error: 'event_id and status are required.' }, { status: 400 })
  }
  if (!['yes', 'no', 'maybe'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status.' }, { status: 400 })
  }
  const size = typeof party_size === 'number' ? Math.max(0, Math.floor(party_size)) : 1

  const { data: rsvp, error } = await supabase
    .from('rsvps')
    .upsert(
      { event_id, user_id: user.id, status, party_size: size },
      { onConflict: 'event_id,user_id' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rsvp })
}
