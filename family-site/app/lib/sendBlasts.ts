import { createAdminClient } from './supabase/server'
import { sendEmail, buildBlastHtml } from './email'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

type BlastRow = {
  id: string
  message: string
  kind: string
  events: {
    id: string
    title: string
    starts_at: string
    location: string
    access_code_id: string | null
    created_by: string
  }
}

type ProfileRow = {
  email: string | null
}

export async function sendDueBlasts(): Promise<{ sent: number; failed: number }> {
  const admin = createAdminClient()

  const { data: blasts, error: blastError } = await admin
    .from('blasts')
    .select('id, message, kind, events(id, title, starts_at, location, access_code_id, created_by)')
    .eq('status', 'scheduled')
    .lte('send_at', new Date().toISOString())

  if (blastError) {
    console.error('sendDueBlasts: failed to fetch blasts', blastError)
    return { sent: 0, failed: 0 }
  }
  if (!blasts?.length) return { sent: 0, failed: 0 }

  let sent = 0
  let failed = 0

  for (const blast of blasts as unknown as BlastRow[]) {
    const event = blast.events

    // Recipients: members of the event's group (if scoped), otherwise everyone opted in.
    let profilesQuery = admin
      .from('profiles')
      .select('email')
      .eq('notify_email', true)
      .not('email', 'is', null)

    if (event.access_code_id) {
      // Scoped to a specific group
      const { data: members } = await admin
        .from('profile_access_codes')
        .select('profile_id')
        .eq('access_code_id', event.access_code_id)

      const ids = (members ?? []).map((m: { profile_id: string }) => m.profile_id)
      if (!ids.length) {
        await admin.from('blasts').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', blast.id)
        sent++
        continue
      }
      profilesQuery = profilesQuery.in('id', ids)
    } else {
      // "Everyone" — send to all members of the creator's groups (deduplicated)
      const { data: creatorGroups } = await admin
        .from('profile_access_codes')
        .select('access_code_id')
        .eq('profile_id', event.created_by)

      const creatorGroupIds = (creatorGroups ?? []).map((g: { access_code_id: string }) => g.access_code_id)
      if (!creatorGroupIds.length) {
        await admin.from('blasts').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', blast.id)
        sent++
        continue
      }

      const { data: members } = await admin
        .from('profile_access_codes')
        .select('profile_id')
        .in('access_code_id', creatorGroupIds)

      const ids = [...new Set((members ?? []).map((m: { profile_id: string }) => m.profile_id))]
      if (!ids.length) {
        await admin.from('blasts').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', blast.id)
        sent++
        continue
      }
      profilesQuery = profilesQuery.in('id', ids)
    }

    const { data: profiles, error: profileError } = await profilesQuery
    if (profileError) {
      console.error('sendDueBlasts: failed to fetch profiles', profileError)
      failed++
      continue
    }
    if (!profiles?.length) {
      await admin.from('blasts').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', blast.id)
      sent++
      continue
    }

    const eventDate = new Date(event.starts_at).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    const subject = `${blast.kind === 'reminder' ? 'Reminder: ' : ''}${event.title}`
    const html = buildBlastHtml({
      eventTitle: event.title,
      message: blast.message,
      eventUrl: `${SITE_URL}/events/${event.id}`,
      eventDate,
      eventLocation: event.location,
    })

    let anyFailed = false
    for (const profile of profiles as ProfileRow[]) {
      if (!profile.email) continue
      try {
        await sendEmail({ to: profile.email, subject, html })
      } catch (err) {
        console.error(`sendDueBlasts: failed to send to ${profile.email}`, err)
        anyFailed = true
      }
    }

    await admin
      .from('blasts')
      .update({
        status: anyFailed ? 'failed' : 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', blast.id)

    if (anyFailed) failed++
    else sent++
  }

  return { sent, failed }
}
