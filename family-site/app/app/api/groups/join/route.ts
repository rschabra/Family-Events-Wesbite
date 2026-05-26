import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { AccessCode } from '@/lib/types'

// POST /api/groups/join
// Body: { code: string }
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { code?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const code = body.code?.trim()
  if (!code) return NextResponse.json({ error: 'Code is required.' }, { status: 400 })

  const admin = createAdminClient()
  const { data: codeRow, error: lookupError } = await admin
    .from('access_codes')
    .select('*')
    .eq('is_active', true)
    .ilike('code', code)
    .maybeSingle<AccessCode>()

  if (lookupError) return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  if (!codeRow) return NextResponse.json({ error: 'Code not found or no longer active.' }, { status: 404 })

  const { error: joinError } = await admin
    .from('profile_access_codes')
    .upsert(
      { profile_id: user.id, access_code_id: codeRow.id },
      { onConflict: 'profile_id,access_code_id', ignoreDuplicates: true }
    )

  if (joinError) return NextResponse.json({ error: joinError.message }, { status: 500 })

  return NextResponse.json({ group: codeRow })
}
