// Supabase client for use on the SERVER (server components, route handlers).
// Reads/writes the auth session via cookies so logins persist across visits.
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from a Server Component — safe to ignore
            // when middleware is refreshing the session.
          }
        },
      },
    }
  )
}

// ADMIN client — uses the SECRET service-role key. Bypasses Row Level
// Security. Only ever import this in server-side code (route handlers),
// NEVER in a client component. Used for sign-up code validation, etc.
import { createClient as createAdminBase } from '@supabase/supabase-js'

export function createAdminClient() {
  return createAdminBase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
