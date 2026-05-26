import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AccessCode, FamilyEvent, Profile, RsvpStatus } from '@/lib/types'
import EventsClient from './events-client'
import { icalToken } from '@/app/api/ical/[userId]/route'

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

  // Build a map of creator_id → [group_ids] for null-scoped events so the
  // client can correctly filter "Everyone" events by the selected group.
  const typedEvents = (events ?? []) as FamilyEvent[]
  const creatorIds = [...new Set(
    typedEvents.filter((e) => e.access_code_id === null).map((e) => e.created_by)
  )]
  const creatorGroupMap: Record<string, string[]> = {}
  if (creatorIds.length > 0) {
    const { data: creatorGroupRows } = await supabase
      .from('profile_access_codes')
      .select('profile_id, access_code_id')
      .in('profile_id', creatorIds)
    for (const row of creatorGroupRows ?? []) {
      const r = row as { profile_id: string; access_code_id: string }
      if (!creatorGroupMap[r.profile_id]) creatorGroupMap[r.profile_id] = []
      creatorGroupMap[r.profile_id].push(r.access_code_id)
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const icalUrl = `${siteUrl}/api/ical/${user.id}?t=${icalToken(user.id)}`

  return (
    <main className="flex-1 flex flex-col min-h-0">
      <EventsClient
        events={typedEvents}
        userId={user.id}
        isAdmin={profile?.is_admin ?? false}
        myRsvps={myRsvps}
        groups={groups}
        icalUrl={icalUrl}
        creatorGroupMap={creatorGroupMap}
      />
    </main>
  )
}
