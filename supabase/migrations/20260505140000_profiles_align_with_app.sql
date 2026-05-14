-- Align public.profiles with the app (profile page + /api/profile + onboarding).
-- Fixes PostgREST PGRST204 when columns exist in code but not in the database.
--
-- Run in Supabase: SQL Editor → New query → paste → Run.
-- Optional: Project Settings → API → "Reload schema" if errors persist.

-- ---------------------------------------------------------------------------
-- Columns collected on the profile settings page and used by the API:
--   name, bio, birth_date, birth_time, birth_place, job, gender
-- Plus schema / onboarding:
--   avatar_url, consented_at, created_at, updated_at
-- ---------------------------------------------------------------------------

alter table public.profiles add column if not exists name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists birth_date date;
alter table public.profiles add column if not exists birth_time time;
alter table public.profiles add column if not exists birth_place text;
alter table public.profiles add column if not exists job text;
alter table public.profiles add column if not exists gender text;
alter table public.profiles add column if not exists consented_at timestamptz;

-- Timestamps (safe if already present)
alter table public.profiles
  add column if not exists created_at timestamptz not null default now();
alter table public.profiles
  add column if not exists updated_at timestamptz not null default now();

-- Nudge PostgREST / Supabase API schema cache (harmless if unsupported)
notify pgrst, 'reload schema';
