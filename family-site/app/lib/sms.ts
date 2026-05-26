import twilio from 'twilio'

export async function sendSms({ to, body }: { to: string; body: string }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_PHONE_NUMBER

  if (!accountSid || !authToken || !from) {
    throw new Error('Twilio env vars not configured.')
  }

  const client = twilio(accountSid, authToken)
  await client.messages.create({ from, to, body })
}

export function buildSmsBody({
  eventTitle,
  message,
  eventDate,
  eventLocation,
  eventUrl,
}: {
  eventTitle: string
  message: string
  eventDate: string
  eventLocation: string | null
  eventUrl: string
}): string {
  const parts = [`${eventTitle} — ${eventDate}`]
  if (eventLocation) parts.push(eventLocation)
  parts.push(message)
  parts.push(eventUrl)
  return parts.join('\n')
}
