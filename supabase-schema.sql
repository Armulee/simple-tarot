-- Stars schema (public-only). No auth.users DDL required.
-- Profiles (idempotent)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);


-- Extensions
create extension if not exists pgcrypto;

-- Optional rename from old table name if present
do $$ begin
  if to_regclass('public.stars') is null and to_regclass('public.star_states') is not null then
    execute 'alter table public.star_states rename to stars';
  end if;
end $$;

-- Rename legacy constraint name if it exists
do $$ begin
  if exists (
    select 1 from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where c.conname = 'star_states_user_or_device' and n.nspname = 'public' and t.relname = 'stars'
  ) then
    execute 'alter table public.stars rename constraint star_states_user_or_device to stars_user_or_device';
  end if;
end $$;

-- Rename legacy index names if they exist
do $$ begin
  if to_regclass('public.star_states_unique_user') is not null then
    execute 'alter index public.star_states_unique_user rename to stars_unique_user';
  end if;
  if to_regclass('public.star_states_unique_device') is not null then
    execute 'alter index public.star_states_unique_device rename to stars_unique_device';
  end if;
end $$;

-- Stars table: separate rows for anonymous device and user. On first login,
-- create a new user row with (anon's current after refill) + 10.
create table if not exists public.stars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  anon_device_id text,
  current_stars integer not null default 5 check (current_stars >= 0),
  last_refill_at timestamptz not null default now(),
  first_login_bonus_granted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Allow either or both identifiers to be present
  constraint stars_user_or_device check ((user_id is not null) or (anon_device_id is not null))
);

-- Uniqueness: only one row per user and per device
create unique index if not exists stars_unique_user on public.stars(user_id) where user_id is not null;
create unique index if not exists stars_unique_device on public.stars(anon_device_id) where anon_device_id is not null;

alter table public.stars enable row level security;

-- Removed star_identities as it's not used by the app
drop table if exists public.star_identities;

-- Helper: compute refill based on cap (5 for anon, 15 for authed)
create or replace function public._star_apply_refill(
  p_current integer,
  p_last_refill timestamptz,
  p_now timestamptz,
  p_cap integer
) returns table (new_current integer, new_last_refill timestamptz) as $$
declare
  v_current integer := greatest(0, coalesce(p_current, 0));
  v_last timestamptz := coalesce(p_last_refill, p_now);
  v_cap integer := greatest(0, coalesce(p_cap, 0));
  v_hours integer;
  v_add integer;
begin
  if v_current >= v_cap then
    return query select v_current, case when v_cap = 0 then v_last else null end;
  end if;

  v_hours := floor(extract(epoch from (p_now - v_last)) / 3600)::int;
  if v_hours <= 0 then
    return query select v_current, v_last;
  end if;

  v_add := least(v_hours, v_cap - v_current);
  return query select v_current + v_add, v_last + (v_add || ' hours')::interval;
end;
$$ language plpgsql immutable;

-- Get/create and normalize state. On first login, attach user_id to anon row and grant +10.
create or replace function public.star_get_or_create(
  p_anon_device_id text,
  p_user_id uuid default null
) returns table (
  id uuid,
  user_id uuid,
  anon_device_id text,
  current_stars integer,
  last_refill_at timestamptz,
  first_login_bonus_granted boolean
) as $$
declare
  v_state public.stars%rowtype;
  v_cap integer := case when p_user_id is null then 5 else 15 end;
  v_now timestamptz := now();
  v_new_current integer;
  v_new_last timestamptz;
begin
  if p_user_id is not null then
    -- Prefer user row; if not exists, attach to existing anon row or create new
    select * into v_state from public.stars s where s.user_id = p_user_id;
    if not found then
      if p_anon_device_id is not null and length(p_anon_device_id) > 0 then
        select * into v_state from public.stars s where s.anon_device_id = p_anon_device_id;
        if found then
          -- Compute anon state with anon cap, then create a separate user row with +10
          select new_current, coalesce(new_last_refill, v_state.last_refill_at)
            into v_new_current, v_new_last
            from public._star_apply_refill(v_state.current_stars, v_state.last_refill_at, v_now, 5);
          insert into public.stars (user_id, current_stars, last_refill_at, first_login_bonus_granted, updated_at)
               values (p_user_id, least(15, v_new_current + 10), v_now, true, v_now)
          returning * into v_state;
        else
          -- No anon row; create a fresh user row with 15 (base 5 + 10 bonus)
          insert into public.stars (user_id, current_stars, last_refill_at, first_login_bonus_granted, updated_at)
               values (p_user_id, 15, v_now, true, v_now)
          returning * into v_state;
        end if;
      else
        insert into public.stars (user_id, current_stars, last_refill_at, first_login_bonus_granted, updated_at)
             values (p_user_id, 15, v_now, true, v_now)
        returning * into v_state;
      end if;
    end if;

    -- Apply refill with user cap; never re-grant bonus here unless flag is false (edge case)
    select new_current, coalesce(new_last_refill, v_state.last_refill_at)
      into v_new_current, v_new_last
      from public._star_apply_refill(v_state.current_stars, v_state.last_refill_at, v_now, v_cap);

    if not coalesce(v_state.first_login_bonus_granted, false) then
      v_new_current := v_new_current + 10;
      update public.stars s
         set current_stars = v_new_current,
             last_refill_at = v_new_last,
             first_login_bonus_granted = true,
             updated_at = v_now
       where s.id = v_state.id
       returning * into v_state;
    else
      update public.stars s
         set current_stars = v_new_current,
             last_refill_at = v_new_last,
             updated_at = v_now
       where s.id = v_state.id
       returning * into v_state;
    end if;

  else
    -- Anonymous flow
    if p_anon_device_id is null or length(p_anon_device_id) = 0 then
      raise exception 'anon device id required for anonymous state';
    end if;
    select * into v_state from public.stars s where s.anon_device_id = p_anon_device_id;
    if not found then
      insert into public.stars (anon_device_id, current_stars, last_refill_at)
           values (p_anon_device_id, 5, v_now)
      returning * into v_state;
    end if;

    select new_current, coalesce(new_last_refill, v_state.last_refill_at)
      into v_new_current, v_new_last
      from public._star_apply_refill(v_state.current_stars, v_state.last_refill_at, v_now, v_cap);

    update public.stars s
       set current_stars = v_new_current,
           last_refill_at = v_new_last,
           updated_at = v_now
     where s.id = v_state.id
     returning * into v_state;
  end if;

  return query select v_state.id, v_state.user_id, v_state.anon_device_id, v_state.current_stars, v_state.last_refill_at, v_state.first_login_bonus_granted;
end;
$$ language plpgsql security definer set search_path = public;

-- Spend stars, applying refill first and starting timer when dropping below cap
create or replace function public.star_spend(
  p_anon_device_id text,
  p_amount integer,
  p_user_id uuid default null
) returns table (
  ok boolean,
  current_stars integer,
  last_refill_at timestamptz
) as $$
declare
  v_row public.stars%rowtype;
  v_cap integer := case when p_user_id is null then 5 else 15 end;
  v_now timestamptz := now();
  v_new_current integer;
  v_new_last timestamptz;
  v_prev integer;
begin
  if coalesce(p_amount, 0) <= 0 then
    return query select false, null::int, null::timestamptz;
  end if;

  select * from public.star_get_or_create(p_anon_device_id, p_user_id) into v_row;
  v_prev := v_row.current_stars;

  select new_current, coalesce(new_last_refill, v_row.last_refill_at)
    into v_new_current, v_new_last
    from public._star_apply_refill(v_row.current_stars, v_row.last_refill_at, v_now, v_cap);

  if v_new_current < p_amount then
    return query select false, v_new_current, v_new_last;
  end if;

  v_new_current := v_new_current - p_amount;
  if v_prev >= v_cap and v_new_current < v_cap then
    v_new_last := v_now;
  end if;

  update public.stars s
     set current_stars = v_new_current,
         last_refill_at = v_new_last,
         updated_at = v_now
   where s.id = v_row.id
   returning s.current_stars, s.last_refill_at into v_new_current, v_new_last;

  return query select true, v_new_current, v_new_last;
end;
$$ language plpgsql security definer set search_path = public;

-- Add stars utility
create or replace function public.star_add(
  p_anon_device_id text,
  p_amount integer,
  p_user_id uuid default null
) returns table (
  current_stars integer,
  last_refill_at timestamptz
) as $$
declare
  v_row public.stars%rowtype;
  v_now timestamptz := now();
begin
  select * from public.star_get_or_create(p_anon_device_id, p_user_id) into v_row;
  update public.stars s
     set current_stars = v_row.current_stars + greatest(0, coalesce(p_amount, 0)),
         updated_at = v_now
   where s.id = v_row.id
   returning s.current_stars, s.last_refill_at;
end;
$$ language plpgsql security definer set search_path = public;

-- Grants
grant execute on function public.star_get_or_create(text, uuid) to anon, authenticated;
grant execute on function public.star_spend(text, integer, uuid) to anon, authenticated;
grant execute on function public.star_add(text, integer, uuid) to anon, authenticated;