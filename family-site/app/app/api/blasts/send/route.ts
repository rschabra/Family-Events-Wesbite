import { NextResponse } from 'next/server'
import { sendDueBlasts } from '@/lib/sendBlasts'

function authorize(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = request.headers.get('authorization') ?? ''
  return auth === `Bearer ${secret}`
}

// Called by Vercel Cron (vercel.json) via GET — Vercel cron jobs use GET requests.
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not configured.' }, { status: 500 })
  }
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }
  const result = await sendDueBlasts()
  return NextResponse.json(result)
}

// Also callable manually: POST /api/blasts/send  Authorization: Bearer <CRON_SECRET>
export async function POST(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not configured.' }, { status: 500 })
  }
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }
  const result = await sendDueBlasts()
  return NextResponse.json(result)
}
