import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { AccessCode } from '@/lib/types'

// GET /api/groups — list the current user's groups
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('profile_access_codes')
    .select('access_codes(id, code, name, is_active, created_at)')
    .eq('profile_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const groups = (data ?? [])
    .map((row) => row.access_codes)
    .filter(Boolean) as unknown as AccessCode[]

  return NextResponse.json({ groups })
}

// POST /api/groups — create a new group
// Body: { name: string }
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { name?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const name = body.name?.trim()
  if (!name) return NextResponse.json({ error: 'Group name is required.' }, { status: 400 })

  // Generate a random 8-char uppercase code
  const code = Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map((b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32])
    .join('')

  const admin = createAdminClient()
  const { data: newCode, error: insertError } = await admin
    .from('access_codes')
    .insert({ name, code, is_active: true })
    .select()
    .single<AccessCode>()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  // Add the creator to the new group
  await admin.from('profile_access_codes').upsert(
    { profile_id: user.id, access_code_id: newCode.id },
    { onConflict: 'profile_id,access_code_id', ignoreDuplicates: true }
  )

  return NextResponse.json({ group: newCode }, { status: 201 })
}
