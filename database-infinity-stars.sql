-- Migration: Add infinity stars support
-- This migration adds fields to support infinity stars functionality

-- Add infinity stars fields to stars table
alter table public.stars
  add column if not exists is_infinity boolean not null default false,
  add column if not exists infinity_expires_at timestamptz,
  add column if not exists last_currency_before_infinity text;

-- Create index for efficient expiration checks
create index if not exists idx_stars_infinity_expires_at on public.stars(infinity_expires_at) where is_infinity = true;

-- Update star_spend function to skip deduction when is_infinity is true
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
  v_cap integer := case when p_user_id is null then 5 else 12 end;
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

  -- If user has infinity stars and it hasn't expired, always allow spending
  if v_row.is_infinity = true and (v_row.infinity_expires_at is null or v_row.infinity_expires_at > v_now) then
    -- Don't deduct stars, just return success with current state
    return query select true, v_row.current_stars, v_row.last_refill_at;
  end if;

  -- Check if infinity just expired
  if v_row.is_infinity = true and v_row.infinity_expires_at is not null and v_row.infinity_expires_at <= v_now then
    -- Reset to normal stars, restore currency if saved
    update public.stars s
       set is_infinity = false,
           infinity_expires_at = null,
           current_stars = coalesce(
             (select current_stars from public.stars where id = v_row.id),
             0
           ),
           updated_at = v_now
     where s.id = v_row.id
     returning * into v_row;
  end if;

  if p_user_id is not null then
    select new_current, coalesce(new_last_refill, v_row.last_refill_at)
      into v_new_current, v_new_last
      from public._star_apply_refill(v_row.current_stars, v_row.last_refill_at, v_now, v_cap, 2);
  else
    -- Anonymous: no hourly refill; apply daily reset logic
    v_new_current := v_row.current_stars;
    v_new_last := v_row.last_refill_at;
    if (v_row.last_refill_at at time zone 'Asia/Bangkok')::date < (v_now at time zone 'Asia/Bangkok')::date then
      v_new_current := 5;
      v_new_last := v_now;
    end if;
  end if;

  if v_new_current < p_amount then
    return query select false, v_new_current, v_new_last;
  end if;

  v_new_current := v_new_current - p_amount;
  if p_user_id is not null then
    if v_prev >= v_cap and v_new_current < v_cap then
      v_new_last := v_now;
    end if;
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

-- Update star_get_or_create to return infinity fields
drop function if exists public.star_get_or_create(text, uuid);
create or replace function public.star_get_or_create(
  p_anon_device_id text,
  p_user_id uuid default null
) returns table (
  id uuid,
  user_id uuid,
  anon_device_id text,
  current_stars integer,
  last_refill_at timestamptz,
  first_login_bonus_granted boolean,
  first_time_login_grant boolean,
  is_infinity boolean,
  infinity_expires_at timestamptz,
  last_currency_before_infinity text
) as $$
declare
  v_state public.stars%rowtype;
  v_cap integer := case when p_user_id is null then 5 else 12 end;
  v_now timestamptz := now();
  v_new_current integer;
  v_new_last timestamptz;
  v_legacy_did text;
begin
  if p_user_id is not null then
    -- Prefer user row; if not exists, attach to existing anon row or create new
    select * into v_state from public.stars s where s.user_id = p_user_id;
    if found then
      -- Legacy combined row migration: if this user row still carries anon_device_id, split it
      if v_state.anon_device_id is not null then
        v_legacy_did := v_state.anon_device_id;
        select new_current, coalesce(new_last_refill, v_state.last_refill_at)
          into v_new_current, v_new_last
          from public._star_apply_refill(v_state.current_stars, v_state.last_refill_at, v_now, v_cap, 2);
        -- Keep this as the user row
        update public.stars s
           set anon_device_id = null,
               current_stars = v_new_current,
               last_refill_at = v_new_last,
               updated_at = v_now
         where s.id = v_state.id
         returning * into v_state;
        -- Create a separate anon row with the same DID (if not exists)
        insert into public.stars (anon_device_id, current_stars, last_refill_at, updated_at)
          select v_legacy_did, v_new_current, v_now, v_now
          where not exists (
            select 1 from public.stars s2 where s2.anon_device_id = v_legacy_did
          );
      end if;
    else
      if p_anon_device_id is not null and length(p_anon_device_id) > 0 then
        select * into v_state from public.stars s where s.anon_device_id = p_anon_device_id;
        if found then
          -- Create a new user row with default 12 stars
          insert into public.stars (user_id, current_stars, last_refill_at, first_login_bonus_granted, first_time_login_grant, updated_at)
               values (p_user_id, 12, v_now, true, true, v_now)
          returning * into v_state;
        else
          -- No anon row; create a fresh user row with default 12 stars
          insert into public.stars (user_id, current_stars, last_refill_at, first_login_bonus_granted, first_time_login_grant, updated_at)
               values (p_user_id, 12, v_now, true, true, v_now)
          returning * into v_state;
        end if;
      else
        insert into public.stars (user_id, current_stars, last_refill_at, first_login_bonus_granted, first_time_login_grant, updated_at)
             values (p_user_id, 12, v_now, true, true, v_now)
        returning * into v_state;
      end if;
    end if;

    -- Check if infinity expired
    if v_state.is_infinity = true and v_state.infinity_expires_at is not null and v_state.infinity_expires_at <= v_now then
      -- Reset to normal stars
      update public.stars s
         set is_infinity = false,
             infinity_expires_at = null,
             updated_at = v_now
       where s.id = v_state.id
       returning * into v_state;
    end if;

    -- Apply refill with user cap; never re-grant bonus here unless flag is false (edge case)
    -- Skip refill if infinity is active
    if v_state.is_infinity = true and (v_state.infinity_expires_at is null or v_state.infinity_expires_at > v_now) then
      v_new_current := v_state.current_stars;
      v_new_last := v_state.last_refill_at;
    else
      select new_current, coalesce(new_last_refill, v_state.last_refill_at)
        into v_new_current, v_new_last
        from public._star_apply_refill(v_state.current_stars, v_state.last_refill_at, v_now, v_cap, 2);
    end if;
    
    update public.stars s
       set current_stars = v_new_current,
           last_refill_at = v_new_last,
           updated_at = v_now
     where s.id = v_state.id
     returning * into v_state;

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

    -- Daily reset at 00:00 Asia/Bangkok (+7). If date changed since last_refill_at in BKK, reset to 5.
    if (v_state.last_refill_at at time zone 'Asia/Bangkok')::date < (v_now at time zone 'Asia/Bangkok')::date then
      update public.stars s
         set current_stars = 5,
             last_refill_at = v_now,
             updated_at = v_now
       where s.id = v_state.id
       returning * into v_state;
    end if;
  end if;

  return query select 
    v_state.id, 
    v_state.user_id, 
    v_state.anon_device_id, 
    v_state.current_stars, 
    v_state.last_refill_at, 
    v_state.first_login_bonus_granted, 
    v_state.first_time_login_grant,
    coalesce(v_state.is_infinity, false),
    v_state.infinity_expires_at,
    v_state.last_currency_before_infinity;
end;
$$ language plpgsql security definer set search_path = public;

-- Update star_set to support setting infinity
drop function if exists public.star_set(text, integer, uuid);
create or replace function public.star_set(
  p_anon_device_id text,
  p_new_balance integer,
  p_user_id uuid default null,
  p_is_infinity boolean default false,
  p_infinity_expires_at timestamptz default null,
  p_last_currency text default null
) returns table (
  current_stars integer,
  last_refill_at timestamptz,
  is_infinity boolean,
  infinity_expires_at timestamptz
) as $$
declare
  v_row public.stars%rowtype;
  v_now timestamptz := now();
  v_target integer := greatest(0, coalesce(p_new_balance, 0));
  v_curr integer;
  v_last timestamptz;
  v_is_infinity boolean;
  v_expires_at timestamptz;
begin
  -- Only allow explicit set for authenticated users; anonymous cannot set arbitrarily
  if p_user_id is null then
    raise exception 'star_set requires authenticated user';
  end if;

  select * from public.star_get_or_create(p_anon_device_id, p_user_id) into v_row;

  update public.stars s
     set current_stars = v_target,
         is_infinity = coalesce(p_is_infinity, v_row.is_infinity),
         infinity_expires_at = coalesce(p_infinity_expires_at, v_row.infinity_expires_at),
         last_currency_before_infinity = case 
           when p_is_infinity = true and p_last_currency is not null then p_last_currency
           else v_row.last_currency_before_infinity
         end,
         updated_at = v_now
   where s.id = v_row.id
   returning s.current_stars, s.last_refill_at, s.is_infinity, s.infinity_expires_at 
     into v_curr, v_last, v_is_infinity, v_expires_at;
  return query select v_curr, v_last, v_is_infinity, v_expires_at;
end;
$$ language plpgsql security definer set search_path = public;

