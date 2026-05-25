# Day 1 Setup — Your Turn

Everything below takes about 15-20 minutes. Do these steps, then we start Day 2.

## 1. Create a Supabase account and project
1. Go to https://supabase.com and sign up (free).
2. Click "New project". Name it something like `family-events`.
3. Pick a strong database password and SAVE IT somewhere.
4. Choose the region closest to most of your family.
5. Wait ~2 minutes for the project to finish provisioning.

## 2. Run the database schema
1. In your Supabase project, open **SQL Editor** (left sidebar).
2. Click **New query**.
3. Open `supabase/schema.sql` from this project, copy ALL of it, paste it in.
4. Click **Run**. You should see "Success. No rows returned".
5. Check the **Table Editor** — you should see: profiles, events, rsvps,
   blasts, access_codes.

## 3. Set your real family code
In the SQL Editor, run this (pick your own code):
```sql
update public.access_codes
set code = 'YOUR-FAMILY-CODE-HERE'
where code = 'CHANGE-ME-2026';
```

## 4. Create a Vercel account
1. Go to https://vercel.com and sign up (free) — use "Continue with GitHub"
   if you have GitHub; it makes deployment easier later.
2. That's all for now. We deploy on Day 3-4.

## 5. Get the app running locally
In a terminal, from the `app/` folder:
```bash
npm install
cp .env.example .env.local
```

Then edit `.env.local` and fill in your Supabase values:
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  → Supabase Dashboard > Project Settings > Data API
- `SUPABASE_SERVICE_ROLE_KEY`
  → Supabase Dashboard > Project Settings > API Keys (the "service_role" one)
  → KEEP THIS SECRET. It's already gitignored via .env.local.

Then start it:
```bash
npm run dev
```
Open http://localhost:3000 — you should see the "Family Events" landing page.

## When you're done
Tell me it's running and we'll start Day 2: building signup, email
verification, saved logins, and the family-code gate.
