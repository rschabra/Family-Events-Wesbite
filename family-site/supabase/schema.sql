-- =============================================================
-- FAMILY EVENTS SITE — DATABASE SCHEMA
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New query).
-- Safe to re-run: uses "if not exists" / "or replace" where possible.
-- =============================================================

-- ----- EXTENSIONS -------------------------------------------------
create extension if not exists "pgcrypto";   -- for gen_random_uuid()

-- =============================================================
-- 1. PROFILES
-- One row per user. Mirrors auth.users (Supabase's built-in auth table)
-- and adds family-specific fields. A trigger auto-creates a profile
-- whenever a new auth user signs up.
-- =============================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,                       -- E.164 format, e.g. +12025550123 (used later for SMS)
  email       text,
  is_admin    boolean not null default false,
  -- channel preferences: how this person wants to receive blasts
  notify_email boolean not null default true,
  notify_sms   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- =============================================================
-- 2. FAMILY ACCESS CODE
-- A single shared code that gates sign-up. Stored as one row so an
-- admin can rotate it from the app. We keep history by inserting new
-- rows and marking old ones inactive.
-- =============================================================
create table if not exists public.access_codes (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- =============================================================
-- 3. EVENTS
-- The calendar entries. Every event REQUIRES title, description,
-- location and start time (enforced via NOT NULL).
-- "created_by" links to the profile that made it.
-- =============================================================
create table if not exists public.events (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text not null,
  location     text not null,
  starts_at    timestamptz not null,
  ends_at      timestamptz,                -- optional
  created_by   uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists events_starts_at_idx on public.events (starts_at);

-- =============================================================
-- 4. RSVPS
-- One row per (event, user). Captures status + total party size.
-- Unique constraint means a user has at most one RSVP per event;
-- updating an RSVP just overwrites the row (upsert).
-- =============================================================
do $$ begin
  create type rsvp_status as enum ('yes', 'no', 'maybe');
exception when duplicate_object then null;
end $$;

create table if not exists public.rsvps (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  status      rsvp_status not null,
  party_size  int not null default 1 check (party_size >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (event_id, user_id)
);

create index if not exists rsvps_event_id_idx on public.rsvps (event_id);

-- =============================================================
-- 5. BLASTS
-- A text/email announcement tied to an event. Every event must have
-- at least one blast (enforced in app logic at creation time).
-- "send_at" lets a blast be scheduled; a worker sends due blasts.
-- "kind" distinguishes the initial announcement from reminders.
-- =============================================================
do $$ begin
  create type blast_channel as enum ('email', 'sms', 'both');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type blast_status as enum ('scheduled', 'sent', 'failed');
exception when duplicate_object then null;
end $$;

create table if not exists public.blasts (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  created_by  uuid not null references public.profiles(id) on delete cascade,
  channel     blast_channel not null default 'email',
  kind        text not null default 'announcement',  -- 'announcement' | 'reminder' | 'update'
  message     text not null,
  send_at     timestamptz not null default now(),     -- when it should go out
  status      blast_status not null default 'scheduled',
  sent_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists blasts_send_at_idx on public.blasts (send_at) where status = 'scheduled';

-- =============================================================
-- 6. updated_at TRIGGER
-- Keeps updated_at fresh on events and rsvps.
-- =============================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists events_touch on public.events;
create trigger events_touch before update on public.events
  for each row execute function public.touch_updated_at();

drop trigger if exists rsvps_touch on public.rsvps;
create trigger rsvps_touch before update on public.rsvps
  for each row execute function public.touch_updated_at();

-- =============================================================
-- 7. AUTO-CREATE PROFILE ON SIGNUP
-- When Supabase Auth inserts a new user, mirror it into profiles.
-- =============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- Locks the tables so users can only do what they should.
-- Helper: is_admin() checks the caller's profile.
-- =============================================================
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

alter table public.profiles     enable row level security;
alter table public.events       enable row level security;
alter table public.rsvps        enable row level security;
alter table public.blasts       enable row level security;
alter table public.access_codes enable row level security;

-- ----- PROFILES policies -----
drop policy if exists "profiles: read all" on public.profiles;
create policy "profiles: read all"
  on public.profiles for select using (auth.uid() is not null);

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own"
  on public.profiles for update using (id = auth.uid());

-- ----- EVENTS policies -----
drop policy if exists "events: read all" on public.events;
create policy "events: read all"
  on public.events for select using (auth.uid() is not null);

drop policy if exists "events: insert own" on public.events;
create policy "events: insert own"
  on public.events for insert with check (created_by = auth.uid());

drop policy if exists "events: update own or admin" on public.events;
create policy "events: update own or admin"
  on public.events for update using (created_by = auth.uid() or public.is_admin());

drop policy if exists "events: delete own or admin" on public.events;
create policy "events: delete own or admin"
  on public.events for delete using (created_by = auth.uid() or public.is_admin());

-- ----- RSVPS policies -----
drop policy if exists "rsvps: read all" on public.rsvps;
create policy "rsvps: read all"
  on public.rsvps for select using (auth.uid() is not null);

drop policy if exists "rsvps: write own" on public.rsvps;
create policy "rsvps: write own"
  on public.rsvps for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ----- BLASTS policies -----
drop policy if exists "blasts: read all" on public.blasts;
create policy "blasts: read all"
  on public.blasts for select using (auth.uid() is not null);

drop policy if exists "blasts: insert own" on public.blasts;
create policy "blasts: insert own"
  on public.blasts for insert with check (created_by = auth.uid());

drop policy if exists "blasts: update own or admin" on public.blasts;
create policy "blasts: update own or admin"
  on public.blasts for update using (created_by = auth.uid() or public.is_admin());

-- ----- ACCESS_CODES policies -----
-- Readable by nobody via the normal client (sign-up checks it through a
-- server-side route using the service key). Only admins can manage codes.
drop policy if exists "access_codes: admin manage" on public.access_codes;
create policy "access_codes: admin manage"
  on public.access_codes for all
  using (public.is_admin())
  with check (public.is_admin());

-- =============================================================
-- 9. SEED DATA
-- Insert a starter family code. CHANGE THIS VALUE before sharing.
-- =============================================================
insert into public.access_codes (code, is_active)
values ('CHANGE-ME-2026', true)
on conflict (code) do nothing;

-- =============================================================
-- DONE. Next: make yourself an admin after you sign up by running:
--   update public.profiles set is_admin = true where email = 'you@example.com';
-- =============================================================
