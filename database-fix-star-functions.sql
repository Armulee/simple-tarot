-- Migration: fix star RPC functions for split balances.
-- This script keeps existing balances intact and only ensures columns/functions
-- match the application's current RPC contract.

alter table public.stars
    add column if not exists daily_stars integer not null default 5,
    add column if not exists daily_last_refill_at timestamptz not null default now(),
    add column if not exists plan_stars integer not null default 0,
    add column if not exists plan_last_refill_at timestamptz,
    add column if not exists addon_stars integer not null default 0,
    add column if not exists addon_last_refill_at timestamptz;

drop function if exists public.star_spend(text, integer, uuid);
drop function if exists public.star_add(text, integer, uuid);
drop function if exists public.star_get_or_create(text, uuid);
drop function if exists public.star_set(text, integer, uuid);

create or replace function public._star_apply_refill(
  p_current integer,
  p_last_refill timestamptz,
  p_now timestamptz,
  p_cap integer,
  p_interval_hours integer default 1
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

  v_hours := floor(extract(epoch from (p_now - v_last)) / (greatest(1, p_interval_hours) * 3600))::int;
  if v_hours <= 0 then
    return query select v_current, v_last;
  end if;

  v_add := least(v_hours, v_cap - v_current);
  return query select v_current + v_add, v_last + (v_add * greatest(1, p_interval_hours) || ' hours')::interval;
end;
$$ language plpgsql immutable;

create or replace function public.star_get_or_create(
  p_anon_device_id text,
  p_user_id uuid default null
) returns table (
  id uuid,
  user_id uuid,
  anon_device_id text,
  daily_stars integer,
  daily_last_refill_at timestamptz,
  plan_stars integer,
  plan_last_refill_at timestamptz,
  addon_stars integer,
  addon_last_refill_at timestamptz,
  current_stars integer,
  last_refill_at timestamptz,
  first_login_bonus_granted boolean,
  first_time_login_grant boolean
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
    select * into v_state from public.stars s where s.user_id = p_user_id;
    if found then
      if v_state.anon_device_id is not null then
        v_legacy_did := v_state.anon_device_id;
        select new_current, coalesce(new_last_refill, v_state.daily_last_refill_at)
          into v_new_current, v_new_last
          from public._star_apply_refill(v_state.daily_stars, v_state.daily_last_refill_at, v_now, v_cap, 2);
        update public.stars s
           set anon_device_id = null,
               daily_stars = v_new_current,
               daily_last_refill_at = v_new_last,
               last_refill_at = v_new_last,
               current_stars = v_new_current + coalesce(s.plan_stars, 0) + coalesce(s.addon_stars, 0),
               updated_at = v_now
         where s.id = v_state.id
         returning * into v_state;
        insert into public.stars (anon_device_id, daily_stars, daily_last_refill_at, last_refill_at, current_stars, updated_at)
          select v_legacy_did, v_new_current, v_now, v_now, v_new_current, v_now
          where not exists (
            select 1 from public.stars s2 where s2.anon_device_id = v_legacy_did
          );
      end if;
    else
      if p_anon_device_id is not null and length(p_anon_device_id) > 0 then
        select * into v_state from public.stars s where s.anon_device_id = p_anon_device_id;
        if found then
          insert into public.stars (
            user_id,
            daily_stars,
            daily_last_refill_at,
            plan_stars,
            addon_stars,
            current_stars,
            last_refill_at,
            first_login_bonus_granted,
            first_time_login_grant,
            updated_at
          )
          values (p_user_id, 12, v_now, 0, 0, 12, v_now, true, true, v_now)
          returning * into v_state;
        else
          insert into public.stars (
            user_id,
            daily_stars,
            daily_last_refill_at,
            plan_stars,
            addon_stars,
            current_stars,
            last_refill_at,
            first_login_bonus_granted,
            first_time_login_grant,
            updated_at
          )
          values (p_user_id, 12, v_now, 0, 0, 12, v_now, true, true, v_now)
          returning * into v_state;
        end if;
      else
        insert into public.stars (
          user_id,
          daily_stars,
          daily_last_refill_at,
          plan_stars,
          addon_stars,
          current_stars,
          last_refill_at,
          first_login_bonus_granted,
          first_time_login_grant,
          updated_at
        )
        values (p_user_id, 12, v_now, 0, 0, 12, v_now, true, true, v_now)
        returning * into v_state;
      end if;
    end if;

    select new_current, coalesce(new_last_refill, v_state.daily_last_refill_at)
      into v_new_current, v_new_last
      from public._star_apply_refill(v_state.daily_stars, v_state.daily_last_refill_at, v_now, v_cap, 2);
    update public.stars s
       set daily_stars = v_new_current,
           daily_last_refill_at = v_new_last,
           last_refill_at = v_new_last,
           current_stars = v_new_current + coalesce(s.plan_stars, 0) + coalesce(s.addon_stars, 0),
           updated_at = v_now
     where s.id = v_state.id
     returning * into v_state;
  else
    if p_anon_device_id is null or length(p_anon_device_id) = 0 then
      raise exception 'anon device id required for anonymous state';
    end if;
    select * into v_state from public.stars s where s.anon_device_id = p_anon_device_id;
    if not found then
      insert into public.stars (anon_device_id, daily_stars, daily_last_refill_at, current_stars, last_refill_at)
           values (p_anon_device_id, 5, v_now, 5, v_now)
      returning * into v_state;
    end if;

    if (v_state.daily_last_refill_at at time zone 'Asia/Bangkok')::date < (v_now at time zone 'Asia/Bangkok')::date then
      update public.stars s
         set daily_stars = 5,
             daily_last_refill_at = v_now,
             last_refill_at = v_now,
             current_stars = 5,
             updated_at = v_now
       where s.id = v_state.id
       returning * into v_state;
    end if;
  end if;

  return query select
    v_state.id,
    v_state.user_id,
    v_state.anon_device_id,
    v_state.daily_stars,
    v_state.daily_last_refill_at,
    v_state.plan_stars,
    v_state.plan_last_refill_at,
    v_state.addon_stars,
    v_state.addon_last_refill_at,
    v_state.current_stars,
    v_state.last_refill_at,
    v_state.first_login_bonus_granted,
    v_state.first_time_login_grant;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.star_spend(
  p_anon_device_id text,
  p_amount integer,
  p_user_id uuid default null
) returns table (
  ok boolean,
  daily_stars integer,
  plan_stars integer,
  addon_stars integer,
  current_stars integer,
  daily_last_refill_at timestamptz
) as $$
declare
  v_row public.stars%rowtype;
  v_cap integer := case when p_user_id is null then 5 else 12 end;
  v_now timestamptz := now();
  v_new_daily integer;
  v_new_last timestamptz;
begin
  if coalesce(p_amount, 0) <= 0 then
    return query select false, null::int, null::int, null::int, null::int, null::timestamptz;
  end if;

  select * from public.star_get_or_create(p_anon_device_id, p_user_id) into v_row;
  v_new_daily := v_row.daily_stars;
  v_new_last := v_row.daily_last_refill_at;

  if p_user_id is not null then
    select new_current, coalesce(new_last_refill, v_row.daily_last_refill_at)
      into v_new_daily, v_new_last
      from public._star_apply_refill(v_row.daily_stars, v_row.daily_last_refill_at, v_now, v_cap, 2);
  else
    if (v_row.daily_last_refill_at at time zone 'Asia/Bangkok')::date < (v_now at time zone 'Asia/Bangkok')::date then
      v_new_daily := 5;
      v_new_last := v_now;
    end if;
  end if;

  if v_new_daily < p_amount then
    return query select false, v_new_daily, v_row.plan_stars, v_row.addon_stars, v_new_daily + coalesce(v_row.plan_stars, 0) + coalesce(v_row.addon_stars, 0), v_new_last;
  end if;

  v_new_daily := v_new_daily - p_amount;
  if p_user_id is not null then
    if v_row.daily_stars >= v_cap and v_new_daily < v_cap then
      v_new_last := v_now;
    end if;
  end if;

  update public.stars s
     set daily_stars = v_new_daily,
         daily_last_refill_at = v_new_last,
         last_refill_at = v_new_last,
         current_stars = v_new_daily + coalesce(s.plan_stars, 0) + coalesce(s.addon_stars, 0),
         updated_at = v_now
   where s.id = v_row.id
   returning s.daily_stars, s.plan_stars, s.addon_stars, s.current_stars, s.daily_last_refill_at into v_new_daily, v_row.plan_stars, v_row.addon_stars, v_row.current_stars, v_new_last;

  return query select true, v_new_daily, v_row.plan_stars, v_row.addon_stars, v_row.current_stars, v_new_last;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.star_add(
  p_anon_device_id text,
  p_amount integer,
  p_user_id uuid default null
) returns table (
  daily_stars integer,
  current_stars integer,
  daily_last_refill_at timestamptz
) as $$
declare
  v_row public.stars%rowtype;
  v_now timestamptz := now();
  v_curr integer;
  v_last timestamptz;
begin
  select * from public.star_get_or_create(p_anon_device_id, p_user_id) into v_row;
  v_curr := v_row.daily_stars + greatest(0, coalesce(p_amount, 0));
  v_last := v_row.daily_last_refill_at;
  update public.stars s
     set daily_stars = v_curr,
         current_stars = v_curr + coalesce(s.plan_stars, 0) + coalesce(s.addon_stars, 0),
         updated_at = v_now
   where s.id = v_row.id
   returning s.daily_stars, s.current_stars, s.daily_last_refill_at into v_curr, v_row.current_stars, v_last;
  return query select v_curr, v_row.current_stars, v_last;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.star_set(
  p_anon_device_id text,
  p_new_balance integer,
  p_user_id uuid default null
) returns table (
  daily_stars integer,
  plan_stars integer,
  addon_stars integer,
  current_stars integer,
  daily_last_refill_at timestamptz
) as $$
declare
  v_row public.stars%rowtype;
  v_now timestamptz := now();
  v_target integer := greatest(0, coalesce(p_new_balance, 0));
  v_daily integer;
  v_plan integer;
  v_addon integer;
begin
  if p_user_id is null then
    raise exception 'star_set requires authenticated user';
  end if;

  select * from public.star_get_or_create(p_anon_device_id, p_user_id) into v_row;
  v_daily := least(12, v_target);
  v_plan := greatest(0, v_target - v_daily);
  v_addon := 0;

  update public.stars s
     set daily_stars = v_daily,
         plan_stars = v_plan,
         addon_stars = v_addon,
         current_stars = v_daily + v_plan + v_addon,
         daily_last_refill_at = coalesce(s.daily_last_refill_at, v_now),
         last_refill_at = coalesce(s.daily_last_refill_at, v_now),
         updated_at = v_now
   where s.id = v_row.id
   returning s.daily_stars, s.plan_stars, s.addon_stars, s.current_stars, s.daily_last_refill_at into v_daily, v_plan, v_addon, v_row.current_stars, v_row.daily_last_refill_at;
  return query select v_daily, v_plan, v_addon, v_row.current_stars, v_row.daily_last_refill_at;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.star_get_or_create(text, uuid) to anon, authenticated;
grant execute on function public.star_spend(text, integer, uuid) to anon, authenticated;
grant execute on function public.star_add(text, integer, uuid) to anon, authenticated;
grant execute on function public.star_set(text, integer, uuid) to authenticated;
