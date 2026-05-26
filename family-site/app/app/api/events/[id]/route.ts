import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { FamilyEvent } from '@/lib/types'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const { title, description, location, starts_at, ends_at } = body
  if (!title || !description || !location || !starts_at) {
    return NextResponse.json(
      { error: 'Title, description, location, and start time are required.' },
      { status: 400 }
    )
  }

  // RLS enforces: only creator or admin can update
  const { data: event, error } = await supabase
    .from('events')
    .update({
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      starts_at,
      ends_at: ends_at || null,
    })
    .eq('id', id)
    .select()
    .single<FamilyEvent>()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Not found or not authorized.' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ event })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // RLS enforces: only creator or admin can delete
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
