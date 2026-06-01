import { createAdminClient } from './supabase/server'
import { sendEmailBatch, buildBlastHtml } from './email'
import { sendSms, buildSmsBody } from './sms'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

type BlastRow = {
  id: string
  message: string
  kind: string
  events: {
    id: string
    title: string
    starts_at: string
    location: string | null
    access_code_id: string | null
    created_by: string
  }
}

type ProfileRow = {
  id: string
  email: string | null
  phone: string | null
  notify_email: boolean
  notify_sms: boolean
}

export async function sendDueBlasts(): Promise<{ sent: number; failed: number }> {
  const admin = createAdminClient()
  const twilioConfigured = !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  )

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

    // Resolve recipient IDs based on event scope
    let recipientIds: string[] | null = null

    if (event.access_code_id) {
      const { data: members } = await admin
        .from('profile_access_codes')
        .select('profile_id')
        .eq('access_code_id', event.access_code_id)
      recipientIds = (members ?? []).map((m: { profile_id: string }) => m.profile_id)
    } else {
      // "Everyone" — members of the creator's groups
      const { data: creatorGroups } = await admin
        .from('profile_access_codes')
        .select('access_code_id')
        .eq('profile_id', event.created_by)
      const creatorGroupIds = (creatorGroups ?? []).map((g: { access_code_id: string }) => g.access_code_id)
      if (creatorGroupIds.length > 0) {
        const { data: members } = await admin
          .from('profile_access_codes')
          .select('profile_id')
          .in('access_code_id', creatorGroupIds)
        recipientIds = [...new Set((members ?? []).map((m: { profile_id: string }) => m.profile_id))]
      } else {
        recipientIds = []
      }
    }

    if (recipientIds !== null && recipientIds.length === 0) {
      await admin.from('blasts').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', blast.id)
      sent++
      continue
    }

    let profilesQuery = admin
      .from('profiles')
      .select('id, email, phone, notify_email, notify_sms')

    if (recipientIds !== null) {
      profilesQuery = profilesQuery.in('id', recipientIds)
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
    const eventUrl = `${SITE_URL}/events/${event.id}`
    const subject = `${blast.kind === 'reminder' ? 'Reminder: ' : ''}${event.title}`
    const html = buildBlastHtml({
      eventTitle: event.title,
      message: blast.message,
      eventUrl,
      eventDate,
      eventLocation: event.location,
    })
    const smsBody = buildSmsBody({
      eventTitle: event.title,
      message: blast.message,
      eventDate,
      eventLocation: event.location,
      eventUrl,
    })

    // Collect all email and SMS jobs before sending so we can batch emails
    // in a single Resend API call instead of one per recipient (avoids rate limits).
    const emailBatch: { to: string; subject: string; html: string }[] = []
    const smsJobs: { to: string }[] = []

    for (const profile of profiles as ProfileRow[]) {
      if (profile.notify_email && profile.email) {
        emailBatch.push({ to: profile.email, subject, html })
      }
      if (twilioConfigured && profile.notify_sms && profile.phone) {
        smsJobs.push({ to: profile.phone })
      }
    }

    let emailFailed = false
    try {
      await sendEmailBatch(emailBatch)
    } catch (err) {
      console.error(`sendDueBlasts: batch email failed`, err)
      emailFailed = true
    }

    for (const { to } of smsJobs) {
      try {
        await sendSms({ to, body: smsBody })
      } catch (err) {
        // SMS failure doesn't fail the blast — email is the primary channel
        console.error(`sendDueBlasts: SMS failed for ${to}`, err)
      }
    }

    await admin
      .from('blasts')
      .update({
        status: emailFailed ? 'failed' : 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', blast.id)

    if (emailFailed) failed++
    else sent++
  }

  return { sent, failed }
}
