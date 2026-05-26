import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { FamilyEvent, Profile, RsvpWithProfile } from '@/lib/types'
import EventDetailClient from './event-detail-client'

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: event, error: eventError },
    { data: rsvps },
    { data: profile },
  ] = await Promise.all([
    supabase.from('events').select('*').eq('id', id).single<FamilyEvent>(),
    supabase
      .from('rsvps')
      .select('*, profiles(full_name)')
      .eq('event_id', id)
      .order('created_at', { ascending: true }),
    supabase.from('profiles').select('*').eq('id', user.id).single<Profile>(),
  ])

  if (eventError || !event) notFound()

  return (
    <main className="flex-1 p-6 max-w-2xl mx-auto w-full space-y-6">
      <header className="flex items-center justify-between">
        <Link href="/events" className="text-sm text-gray-500 underline">
          ← All events
        </Link>
      </header>

      <EventDetailClient
        event={event}
        rsvps={(rsvps as RsvpWithProfile[]) ?? []}
        userId={user.id}
        isAdmin={profile?.is_admin ?? false}
      />
    </main>
  )
}
