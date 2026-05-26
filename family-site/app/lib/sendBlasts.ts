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
  }
}

type ProfileRow = {
  email: string | null
}

export async function sendDueBlasts(): Promise<{ sent: number; failed: number }> {
  const admin = createAdminClient()

  const { data: blasts, error: blastError } = await admin
    .from('blasts')
    .select('id, message, kind, events(id, title, starts_at, location)')
    .eq('status', 'scheduled')
    .lte('send_at', new Date().toISOString())

  if (blastError) {
    console.error('sendDueBlasts: failed to fetch blasts', blastError)
    return { sent: 0, failed: 0 }
  }
  if (!blasts?.length) return { sent: 0, failed: 0 }

  const { data: profiles, error: profileError } = await admin
    .from('profiles')
    .select('email')
    .eq('notify_email', true)
    .not('email', 'is', null)

  if (profileError) {
    console.error('sendDueBlasts: failed to fetch profiles', profileError)
    return { sent: 0, failed: 0 }
  }
  if (!profiles?.length) return { sent: 0, failed: 0 }

  let sent = 0
  let failed = 0

  for (const blast of blasts as unknown as BlastRow[]) {
    const event = blast.events
    const eventDate = new Date(event.starts_at).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    const isReminder = blast.kind === 'reminder'
    const subject = `${isReminder ? 'Reminder: ' : ''}${event.title}`
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
