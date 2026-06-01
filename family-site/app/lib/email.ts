import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM =
  process.env.RESEND_FROM ?? 'Family Events <no-reply@familyevents.com>'

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  const { error } = await resend.emails.send({ from: FROM, to, subject, html })
  if (error) throw new Error(error.message)
}

// Send up to 100 emails in a single API call — avoids per-email rate limits.
export async function sendEmailBatch(
  emails: { to: string; subject: string; html: string }[]
) {
  if (emails.length === 0) return
  const { error } = await resend.batch.send(
    emails.map(({ to, subject, html }) => ({ from: FROM, to, subject, html }))
  )
  if (error) throw new Error(error.message)
}

export function buildBlastHtml({
  eventTitle,
  message,
  eventUrl,
  eventDate,
  eventLocation,
}: {
  eventTitle: string
  message: string
  eventUrl: string
  eventDate: string
  eventLocation: string | null
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const safeMessage = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden;max-width:600px;width:100%;">
        <tr>
          <td style="background:#111827;padding:20px 32px;">
            <span style="color:#fff;font-size:16px;font-weight:600;">Family Events</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">${eventTitle}</h1>
            <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">${eventDate}${eventLocation ? `&nbsp;&nbsp;·&nbsp;&nbsp;${eventLocation}` : ''}</p>
            <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#374151;white-space:pre-wrap;">${safeMessage}</p>
            <a href="${eventUrl}"
               style="display:inline-block;background:#111827;color:#fff;padding:11px 22px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500;">
              View event &amp; RSVP →
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f3f4f6;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              You&rsquo;re receiving this because you&rsquo;re part of this family group.
              <a href="${siteUrl}/profile" style="color:#6b7280;">Update notification preferences.</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
