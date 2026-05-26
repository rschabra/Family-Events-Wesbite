// POST /api/signup
// Server-side signup. Validates the shared family code BEFORE creating
// an account. The code check uses the admin (service-role) client so the
// access_codes table stays unreadable from the browser. Account creation
// itself uses the normal auth.signUp(), which reliably triggers
// Supabase's built-in confirmation email.
import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  let body: {
    fullName?: string
    email?: string
    phone?: string
    password?: string
    familyCode?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const { fullName, email, phone, password, familyCode } = body

  // --- Basic validation -------------------------------------------------
  if (!fullName || !email || !password || !familyCode) {
    return NextResponse.json(
      { error: 'Name, email, password, and family code are all required.' },
      { status: 400 }
    )
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters.' },
      { status: 400 }
    )
  }

  // --- 1. Check the family code (admin client, server-only) ------------
  // Trimmed + case-insensitive so " smith2026 " and "SMITH2026" both work.
  const admin = createAdminClient()
  const { data: codeRow, error: codeError } = await admin
    .from('access_codes')
    .select('id')
    .eq('is_active', true)
    .ilike('code', familyCode.trim())
    .maybeSingle()

  if (codeError) {
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
  if (!codeRow) {
    return NextResponse.json(
      { error: 'That family code is not valid.' },
      { status: 403 }
    )
  }

  // --- 2. Create the account via normal signUp -------------------------
  // This sends Supabase's built-in confirmation email automatically.
  // The DB trigger (handle_new_user) creates the matching profile row,
  // copying full_name and phone from user_metadata.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const supabase = await createClient()

  const { error: signUpError } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/confirm`,
      data: {
        full_name: fullName.trim(),
        phone: phone?.trim() || null,
      },
    },
  })

  if (signUpError) {
    const msg = signUpError.message.toLowerCase()
    if (msg.includes('already') || msg.includes('registered')) {
      return NextResponse.json(
        { error: 'An account with that email already exists. Try logging in.' },
        { status: 409 }
      )
    }
    if (msg.includes('rate') || msg.includes('limit')) {
      return NextResponse.json(
        { error: 'Too many signups right now. Please wait a few minutes.' },
        { status: 429 }
      )
    }
    return NextResponse.json(
      { error: 'Could not create the account. Please try again.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
