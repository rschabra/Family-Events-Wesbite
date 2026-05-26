import { NextResponse } from 'next/server'
import { sendDueBlasts } from '@/lib/sendBlasts'

// Called by Vercel Cron (vercel.json) every 5 minutes.
// Also callable manually: POST /api/blasts/send  Authorization: Bearer <CRON_SECRET>
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured.' }, { status: 500 })
  }

  const auth = request.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const result = await sendDueBlasts()
  return NextResponse.json(result)
}
