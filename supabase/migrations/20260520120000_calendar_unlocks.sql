-- Track per-date paid unlocks ("buy 1 day with 1 star") for the calendar.
-- One row per (user_id, unlocked_date). Inserts are idempotent so re-clicking
-- a date the user already paid for never deducts a second star.

create table if not exists public.calendar_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  unlocked_date date not null,
  stars_spent integer not null default 1 check (stars_spent >= 0),
  created_at timestamptz not null default now()
);

create unique index if not exists calendar_unlocks_user_date
  on public.calendar_unlocks(user_id, unlocked_date);

create index if not exists calendar_unlocks_user
  on public.calendar_unlocks(user_id);

alter table public.calendar_unlocks enable row level security;

drop policy if exists "Users can view own calendar unlocks" on public.calendar_unlocks;
create policy "Users can view own calendar unlocks" on public.calendar_unlocks
  for select using (auth.uid() = user_id);

-- Inserts are performed server-side with the service role (atomic with
-- star deduction), so we deliberately do not expose an insert policy to
-- the anon/auth roles. Service role bypasses RLS.

notify pgrst, 'reload schema';
