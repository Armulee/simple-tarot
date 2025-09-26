-- Stars and identities schema (public-only). No auth.users DDL required.

-- Extensions
create extension if not exists pgcrypto;

-- Star state table: one row per anon device; when user logs in for first time,
-- we attach user_id onto the same row and grant +10. After that, both IDs can coexist.
create table if not exists public.star_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  anon_device_id text,
  current_stars integer not null default 5 check (current_stars >= 0),
  last_refill_at timestamptz not null default now(),
  first_login_bonus_granted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Allow either or both identifiers to be present
  constraint star_states_user_or_device check ((user_id is not null) or (anon_device_id is not null))
);

-- Uniqueness: only one row per user and per device
create unique index if not exists star_states_unique_user on public.star_states(user_id) where user_id is not null;
create unique index if not exists star_states_unique_device on public.star_states(anon_device_id) where anon_device_id is not null;

alter table public.star_states enable row level security;

-- Optional mapping of anon_device_id <-> user_id pairs for analytics/auditing
create table if not exists public.star_identities (
  user_id uuid references auth.users(id) on delete cascade not null,
  anon_device_id text not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (user_id, anon_device_id)
);

alter table public.star_identities enable row level security;
create policy if not exists "Users can view own identities" on public.star_identities
  for select using (auth.uid() = user_id);
create policy if not exists "Users can upsert own identities" on public.star_identities
  for insert with check (auth.uid() = user_id);
create policy if not exists "Users can update own identities" on public.star_identities
  for update using (auth.uid() = user_id);

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
  v_state public.star_states%rowtype;
  v_cap integer := case when p_user_id is null then 5 else 15 end;
  v_now timestamptz := now();
  v_new_current integer;
  v_new_last timestamptz;
begin
  -- Record identity mapping if both are present
  if p_user_id is not null and p_anon_device_id is not null and length(p_anon_device_id) > 0 then
    insert into public.star_identities (user_id, anon_device_id, last_seen_at)
    values (p_user_id, p_anon_device_id, v_now)
    on conflict (user_id, anon_device_id) do update set last_seen_at = excluded.last_seen_at;
  end if;

  if p_user_id is not null then
    -- Prefer user row; if not exists, attach to existing anon row or create new
    select * into v_state from public.star_states s where s.user_id = p_user_id;
    if not found then
      if p_anon_device_id is not null and length(p_anon_device_id) > 0 then
        select * into v_state from public.star_states s where s.anon_device_id = p_anon_device_id;
        if found then
          -- Refill with anon cap, then +10 bonus and attach user_id on same row
          select new_current, coalesce(new_last_refill, v_state.last_refill_at)
            into v_new_current, v_new_last
            from public._star_apply_refill(v_state.current_stars, v_state.last_refill_at, v_now, 5);
          v_new_current := v_new_current + 10;
          update public.star_states s
             set user_id = p_user_id,
                 current_stars = v_new_current,
                 last_refill_at = v_new_last,
                 first_login_bonus_granted = true,
                 updated_at = v_now
           where s.id = v_state.id
           returning * into v_state;
        else
          -- No anon row; start with base 5 + 10 bonus
          insert into public.star_states (user_id, current_stars, last_refill_at, first_login_bonus_granted, updated_at)
               values (p_user_id, 15, v_now, true, v_now)
          returning * into v_state;
        end if;
      else
        insert into public.star_states (user_id, current_stars, last_refill_at, first_login_bonus_granted, updated_at)
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
      update public.star_states s
         set current_stars = v_new_current,
             last_refill_at = v_new_last,
             first_login_bonus_granted = true,
             updated_at = v_now
       where s.id = v_state.id
       returning * into v_state;
    else
      update public.star_states s
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
    select * into v_state from public.star_states s where s.anon_device_id = p_anon_device_id;
    if not found then
      insert into public.star_states (anon_device_id, current_stars, last_refill_at)
           values (p_anon_device_id, 5, v_now)
      returning * into v_state;
    end if;

    select new_current, coalesce(new_last_refill, v_state.last_refill_at)
      into v_new_current, v_new_last
      from public._star_apply_refill(v_state.current_stars, v_state.last_refill_at, v_now, v_cap);

    update public.star_states s
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
  v_row public.star_states%rowtype;
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

  update public.star_states s
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
  v_row public.star_states%rowtype;
  v_now timestamptz := now();
begin
  select * from public.star_get_or_create(p_anon_device_id, p_user_id) into v_row;
  update public.star_states s
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