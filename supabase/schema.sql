-- Star currency schema for Supabase
-- Run this in your Supabase SQL editor or via migrations

create table if not exists public.star_balances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 5 check (balance >= 0),
  last_refill_at timestamptz not null default now(),
  refill_cap integer not null default 5 check (refill_cap >= 1),
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

-- RPCs to enforce business logic server-side

-- Ensure search_path so SECURITY DEFINER functions operate safely
create or replace function public.apply_refill_and_get()
returns table (
  balance integer,
  refill_cap integer,
  next_refill_at timestamptz,
  last_refill_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_row star_balances%rowtype;
  v_hours integer;
  v_new_balance integer;
  v_new_last timestamptz;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  select * into v_row from star_balances where user_id = v_user;
  if not found then
    insert into star_balances(user_id) values (v_user) returning * into v_row;
  end if;

  v_hours := greatest(floor(extract(epoch from (now() - v_row.last_refill_at)) / 3600), 0);
  v_new_balance := least(v_row.refill_cap, v_row.balance + v_hours);
  v_new_last := v_row.last_refill_at + (v_hours || ' hours')::interval;

  if v_hours > 0 and v_new_balance <> v_row.balance then
    update star_balances
      set balance = v_new_balance,
          last_refill_at = v_new_last
      where user_id = v_user;
  end if;

  balance := v_new_balance;
  refill_cap := v_row.refill_cap;
  last_refill_at := v_new_last;
  next_refill_at := case when v_new_balance >= v_row.refill_cap then null else v_new_last + interval '1 hour' end;
  return next;
end;
$$;

create or replace function public.spend_stars(p_amount integer)
returns table (
  success boolean,
  balance integer,
  next_refill_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_row star_balances%rowtype;
  v_new_balance integer;
  v_now timestamptz := now();
  v_prev integer;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid amount';
  end if;

  select * into v_row from star_balances where user_id = v_user for update;
  if not found then
    insert into star_balances(user_id) values (v_user) returning * into v_row;
  end if;

  v_prev := v_row.balance;
  if v_row.balance < p_amount then
    success := false;
    balance := v_row.balance;
    next_refill_at := case when v_row.balance >= v_row.refill_cap then null else v_row.last_refill_at + interval '1 hour' end;
    return next;
  end if;

  v_new_balance := v_row.balance - p_amount;
  if v_prev >= v_row.refill_cap and v_new_balance < v_row.refill_cap then
    update star_balances
      set balance = v_new_balance,
          last_refill_at = v_now
      where user_id = v_user;
    next_refill_at := v_now + interval '1 hour';
  else
    update star_balances
      set balance = v_new_balance
      where user_id = v_user;
    next_refill_at := case when v_new_balance >= v_row.refill_cap then null else v_row.last_refill_at + interval '1 hour' end;
  end if;

  success := true;
  balance := v_new_balance;
  return next;
end;
$$;

create or replace function public.add_stars(p_amount integer)
returns table (
  balance integer
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_row star_balances%rowtype;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid amount';
  end if;

  select * into v_row from star_balances where user_id = v_user for update;
  if not found then
    insert into star_balances(user_id) values (v_user) returning * into v_row;
  end if;

  update star_balances
    set balance = v_row.balance + p_amount
    where user_id = v_user
    returning balance into balance;
  return next;
end;
$$;

create or replace function public.grant_signup_bonus_and_bump_cap()
returns table (
  balance integer,
  refill_cap integer,
  granted boolean
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_row star_balances%rowtype;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  select * into v_row from star_balances where user_id = v_user for update;
  if not found then
    insert into star_balances(user_id) values (v_user) returning * into v_row;
  end if;

  if v_row.register_bonus_granted is false then
    update star_balances
      set balance = v_row.balance + 10,
          register_bonus_granted = true,
          refill_cap = 15
      where user_id = v_user
      returning balance, refill_cap into balance, refill_cap;
    granted := true;
  else
    balance := v_row.balance;
    refill_cap := v_row.refill_cap;
    granted := false;
  end if;
  return next;
end;
$$;

