import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AccessCode, FamilyEvent, Profile, RsvpStatus } from '@/lib/types'
import EventsClient from './events-client'

export default async function EventsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: events }, { data: profile }, { data: userRsvps }, { data: groupRows }] =
    await Promise.all([
      supabase.from('events').select('*').order('starts_at', { ascending: true }),
      supabase.from('profiles').select('*').eq('id', user.id).single<Profile>(),
      supabase.from('rsvps').select('event_id, status').eq('user_id', user.id),
      supabase
        .from('profile_access_codes')
        .select('access_codes(id, code, name, is_active, created_at)')
        .eq('profile_id', user.id),
    ])

  const myRsvps: Record<string, RsvpStatus> = {}
  for (const r of userRsvps ?? []) {
    myRsvps[r.event_id] = r.status as RsvpStatus
  }

  const groups = (groupRows ?? [])
    .map((r) => r.access_codes)
    .filter(Boolean) as unknown as AccessCode[]

  return (
    <main className="flex-1 flex flex-col min-h-0">
      <EventsClient
        events={(events as FamilyEvent[]) ?? []}
        userId={user.id}
        isAdmin={profile?.is_admin ?? false}
        myRsvps={myRsvps}
        groups={groups}
      />
    </main>
  )
}
