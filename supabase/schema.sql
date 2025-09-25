-- Star currency schema for Supabase
-- Run this in your Supabase SQL editor or via migrations

create table if not exists public.star_balances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 5 check (balance >= 0),
  last_refill_at timestamptz not null default now(),
  register_bonus_granted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Update updated_at on changes
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists star_balances_set_updated_at on public.star_balances;
create trigger star_balances_set_updated_at
before update on public.star_balances
for each row execute function public.set_updated_at();

-- Enable RLS
alter table public.star_balances enable row level security;

-- Policies: users can manage only their own row
create policy star_balances_select_own
  on public.star_balances for select
  to authenticated
  using (user_id = auth.uid());

create policy star_balances_insert_self
  on public.star_balances for insert
  to authenticated
  with check (user_id = auth.uid());

create policy star_balances_update_own
  on public.star_balances for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Optional: prevent deletes by clients (keep for admin only)
revoke delete on public.star_balances from anon, authenticated;

