# Family Events Site

A private family calendar + event RSVP site (Calendar + Partiful in one).
Built on Next.js + Supabase, deployed on Vercel.

## Project status
- [x] Day 1 — Foundation: database schema, app skeleton, Supabase wiring
- [ ] Day 2 — Auth: email signup + verification, saved logins, family-code gate
- [ ] Day 3 — Calendar + events: views, create/edit, RSVP
- [ ] Day 4 — Attendee tracking + email blasts + reminders
- [ ] Day 5 — SMS via Twilio (after 10DLC registration clears)

## Layout
- `supabase/schema.sql` — the full database schema. Run in Supabase SQL Editor.
- `app/` — the Next.js application.
- `app/lib/supabase/` — database connection clients (browser, server, admin).
- `app/lib/types.ts` — TypeScript types mirroring the schema.

## Setup (do this before Day 2)
See SETUP-DAY1.md for step-by-step instructions.
