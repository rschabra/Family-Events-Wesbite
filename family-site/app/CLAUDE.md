# Family Events Site — Project Context for Claude Code

@AGENTS.md

## What this is
A private website for one extended family (~25-100 people) to:
- keep a shared calendar of family events for the year
- let anyone create an event (with required text/email "blast")
- RSVP to events (yes/no/maybe + a guest/party-size count)
- track who is attending each event
- send email blasts now, SMS blasts later

Think "Google Calendar + Partiful, but private to our family."

## Stack
- Next.js (App Router, TypeScript, Tailwind) — in the `app/` folder
- Supabase — Postgres database, Auth, and email
- Vercel — hosting (deploy planned Day 3-4)
- Twilio — SMS, planned for Day 5 (pending 10DLC carrier registration)

## Build plan (day by day)
- Day 1 DONE — DB schema, app skeleton, Supabase client wiring
- Day 2 DONE* — signup + email verification, login, saved sessions,
  route-protecting middleware, logout, profile page
  (*finishing: debugging a signup 500 — see "Current status" below)
- Day 3 — calendar views, create/edit events, RSVP with guest count
- Day 4 — attendee tracking, email blasts, reminder blasts, polish,
  connect a real email service (free-tier Supabase email is rate-limited)
- Day 5 — SMS via Twilio once 10DLC registration clears

## Key architecture decisions (do not undo these)
- Database schema lives in `supabase/schema.sql`. It is written to be
  safely re-runnable. If the schema changes, update that file.
- Row Level Security (RLS) is ON for every table. Policies: anyone
  signed in can read events/rsvps/profiles; users write only their own
  RSVP; users edit/delete only their own events; admins edit/delete any.
- API routes do their OWN auth internally and must return JSON, never
  redirect. The middleware therefore EXCLUDES `/api` from gating
  (`PUBLIC_PATHS` in middleware.ts). Do not remove `/api` from that list.
- The shared family code gates signup. It is checked SERVER-SIDE in
  `app/api/signup/route.ts` using the admin (service-role) client,
  because a person signing up is not yet authenticated, so RLS cannot
  apply to them. The `access_codes` table is not readable from the
  browser by design.
- Signup uses the normal `supabase.auth.signUp()` (not admin
  `createUser`) because only `signUp()` reliably sends the built-in
  confirmation email.
- Phone numbers are COLLECTED at signup but NOT verified — only email is
  verified. Phone sits on file for SMS blasts on Day 5.
- The `blasts` table is intentionally channel-aware (email/sms/both) and
  has a `send_at` time, so SMS and scheduled/reminder blasts slot in
  later with no schema change.

## File map
- `supabase/schema.sql` — full database schema (run in Supabase SQL editor)
- `app/lib/supabase/client.ts` — browser Supabase client (anon key)
- `app/lib/supabase/server.ts` — server client + admin client (service key)
- `app/lib/types.ts` — TypeScript types mirroring the schema
- `app/middleware.ts` — session refresh + route protection
- `app/app/api/signup/route.ts` — family-code check + account creation
- `app/app/auth/confirm/route.ts` — handles the email verification link
- `app/app/auth/signout/route.ts` — logout
- `app/app/signup|login|verify|dashboard|profile/` — the pages

## Conventions
- TypeScript everywhere. Keep `app/lib/types.ts` in sync with the schema.
- Tailwind for styling; keep it simple until the Day 4 polish pass.
- Server components read data directly via the server Supabase client;
  client components use the browser client.
- Never import the admin client into a client component — it holds the
  secret service-role key. Server-side only.
- Env vars live in `.env.local` (gitignored). `.env.example` is the
  template. The dev server must be restarted after editing `.env.local`.

## Current status
Day 2 is complete and working: signup (with family-code gate), email
verification, login, saved sessions, route protection, logout, and the
profile page all function. Next up is Day 3 — calendar views,
create/edit events, and RSVP with guest count.