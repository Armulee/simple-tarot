-- Fix PostgreSQL error 22008: date/time field value out of range: "0"
-- Cause: invalid timestamptz stored in stars (e.g. daily_last_refill_at / last_refill_at / anon_last_refill_at).
-- Run in Supabase SQL editor after deploying app that uses the updated RPCs.

update public.stars
set
  daily_last_refill_at = now(),
  last_refill_at = now(),
  anon_last_refill_at = case when user_id is null then now() else anon_last_refill_at end,
  updated_at = now()
where user_id is null
  and (
    trim(both from daily_last_refill_at::text) in ('0', '')
    or trim(both from last_refill_at::text) in ('0', '')
    or (
      anon_last_refill_at is not null
      and trim(both from anon_last_refill_at::text) in ('0', '')
    )
  );

-- Ensure function signature changes can be applied cleanly by dropping dependents first
-- This avoids: ERROR 42P13: cannot change return type of existing function
drop function if exists public.star_spend(text, integer, uuid);
drop function if exists public.star_add(text, integer, uuid);
drop function if exists public.star_get_or_create(text, uuid);
drop function if exists public._star_apply_refill(integer, timestamptz, timestamptz, integer, integer);
drop function if exists public._star_bangkok_date_safe(timestamptz, timestamptz);
drop function if exists public._star_coerce_refill_ts(timestamptz, timestamptz);

-- Replace corrupt / unparseable refill timestamps (e.g. legacy "0") so AT TIME ZONE never throws 22008.
-- Uses text first: some DBs store values that error as soon as they are passed as timestamptz to a function.
create or replace function public._star_coerce_refill_ts(
  p_ts timestamptz,
  p_fallback timestamptz
) returns timestamptz as $$
declare
  v_txt text;
  v_parsed timestamptz;
begin
  if p_ts is null then
    return p_fallback;
  end if;
  v_txt := trim(both from p_ts::text);
  if v_txt in ('0', '', '-infinity', 'infinity') then
    return p_fallback;
  end if;
  begin
    v_parsed := v_txt::timestamptz;
  exception
    when others then
      return p_fallback;
  end;
  begin
    perform (v_parsed at time zone 'Asia/Bangkok');
    return v_parsed;
  exception
    when others then
      return p_fallback;
  end;
end;
$$ language plpgsql stable;

-- Bangkok calendar date without leaking invalid ts through AT TIME ZONE on the caller side.
create or replace function public._star_bangkok_date_safe(
  p_ts timestamptz,
  p_fallback timestamptz
) returns date as $$
declare
  v_safe timestamptz := public._star_coerce_refill_ts(p_ts, p_fallback);
begin
  return (v_safe at time zone 'Asia/Bangkok')::date;
exception
  when others then
    return (p_fallback at time zone 'Asia/Bangkok')::date;
end;
$$ language plpgsql stable;

-- Helper: compute refill based on cap and interval hours per star
-- For authenticated users we will pass p_interval_hours = 2
-- For anonymous users we will bypass this function (daily reset logic applies elsewhere)
create or replace function public._star_apply_refill(
  p_current integer,
  p_last_refill timestamptz,
  p_now timestamptz,
  p_cap integer,
  p_interval_hours integer default 1
) returns table (new_current integer, new_last_refill timestamptz) as $$
declare
  v_current integer := greatest(0, coalesce(p_current, 0));
  v_last timestamptz := public._star_coerce_refill_ts(p_last_refill, p_now);
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
$$ language plpgsql stable;

-- Get/create and normalize state. On first login, create a new user row with default 6 daily stars.
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
  engagement_stars_current integer,
  engagement_stars_total integer,
  current_stars integer,
  last_refill_at timestamptz,
  first_login_bonus_granted boolean,
  first_time_login_grant boolean
) as $$
declare
  v_state public.stars%rowtype;
  v_cap integer := case when p_user_id is null then 3 else 6 end;
  v_now timestamptz := now();
  v_new_current integer;
  v_new_last timestamptz;
  v_legacy_did text;
  v_dl_safe timestamptz;
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
          values (p_user_id, 6, v_now, 0, 0, 6, v_now, true, true, v_now)
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
          values (p_user_id, 6, v_now, 0, 0, 6, v_now, true, true, v_now)
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
        values (p_user_id, 6, v_now, 0, 0, 6, v_now, true, true, v_now)
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
      insert into public.stars (
            anon_device_id,
            daily_stars,
            daily_last_refill_at,
            anon_stars,
            anon_last_refill_at,
            current_stars,
            last_refill_at
          )
           values (p_anon_device_id, 3, v_now, 3, v_now, 3, v_now)
      returning * into v_state;
    end if;

    v_dl_safe := public._star_coerce_refill_ts(v_state.daily_last_refill_at, v_now);
    if v_dl_safe is distinct from v_state.daily_last_refill_at then
      update public.stars s
         set daily_last_refill_at = v_dl_safe,
             last_refill_at = public._star_coerce_refill_ts(s.last_refill_at, v_dl_safe),
             updated_at = v_now
       where s.id = v_state.id
       returning * into v_state;
    end if;

    if public._star_bangkok_date_safe(v_dl_safe, v_now) < public._star_bangkok_date_safe(v_now, v_now) then
      update public.stars s
         set daily_stars = 3,
             daily_last_refill_at = v_now,
             anon_stars = 3,
             anon_last_refill_at = v_now,
             last_refill_at = v_now,
             current_stars = 3,
             updated_at = v_now
       where s.id = v_state.id
       returning * into v_state;
    end if;

    -- Legacy rows: balance split between anon_stars and daily_stars; spend uses daily_stars only.
    <<anon_sync>>
    declare
      v_anon_cap constant int := 3;
      v_from_anon int := greatest(0, coalesce(v_state.anon_stars, 0));
      v_from_daily int := greatest(0, coalesce(v_state.daily_stars, 0));
      v_sync int := least(v_anon_cap, greatest(v_from_anon, v_from_daily));
    begin
      if v_sync is distinct from v_state.daily_stars
         or coalesce(v_state.anon_stars, -1) is distinct from v_sync then
        update public.stars s
           set daily_stars = v_sync,
               anon_stars = v_sync,
               anon_last_refill_at = public._star_coerce_refill_ts(
                 coalesce(s.anon_last_refill_at, v_state.daily_last_refill_at),
                 v_now
               ),
               current_stars = v_sync + coalesce(s.plan_stars, 0) + coalesce(s.addon_stars, 0),
               updated_at = v_now
         where s.id = v_state.id
         returning * into v_state;
      end if;
    end anon_sync;
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
    v_state.engagement_stars_current,
    v_state.engagement_stars_total,
    v_state.current_stars,
    v_state.last_refill_at,
    v_state.first_login_bonus_granted,
    v_state.first_time_login_grant;
end;
$$ language plpgsql security definer set search_path = public;

-- Spend stars, applying refill first and starting timer when dropping below cap
create or replace function public.star_spend(
  p_anon_device_id text,
  p_amount integer,
  p_user_id uuid default null
) returns table (
  ok boolean,
  daily_stars integer,
  plan_stars integer,
  addon_stars integer,
  engagement_stars_current integer,
  engagement_stars_total integer,
  current_stars integer,
  daily_last_refill_at timestamptz
) as $$
declare
  v_row public.stars%rowtype;
  v_cap integer := case when p_user_id is null then 3 else 6 end;
  v_now timestamptz := now();
  v_new_daily integer;
  v_new_last timestamptz;
begin
  if coalesce(p_amount, 0) <= 0 then
    return query select false, null::int, null::int, null::int, null::int, null::timestamptz;
  end if;

  select * from public.star_get_or_create(p_anon_device_id, p_user_id) into v_row;
  v_new_daily := v_row.daily_stars;
  v_new_last := public._star_coerce_refill_ts(v_row.daily_last_refill_at, v_now);

  if p_user_id is not null then
    select new_current,
           public._star_coerce_refill_ts(
             coalesce(new_last_refill, v_row.daily_last_refill_at),
             v_now
           )
      into v_new_daily, v_new_last
      from public._star_apply_refill(v_row.daily_stars, v_row.daily_last_refill_at, v_now, v_cap, 2);
  else
    if public._star_bangkok_date_safe(v_new_last, v_now) < public._star_bangkok_date_safe(v_now, v_now) then
      v_new_daily := 3;
      v_new_last := v_now;
    end if;
  end if;

  if v_new_daily < p_amount then
    return query select
      false,
      v_new_daily,
      v_row.plan_stars,
      v_row.addon_stars,
      greatest(0, coalesce(v_row.engagement_stars_current, 0) - p_amount),
      coalesce(v_row.engagement_stars_total, 0),
      v_new_daily + coalesce(v_row.plan_stars, 0) + coalesce(v_row.addon_stars, 0),
      v_new_last;
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
         anon_stars = case
           when p_user_id is null then v_new_daily
           else coalesce(s.anon_stars, 0)
         end,
         anon_last_refill_at = case
           when p_user_id is null then v_new_last
           else s.anon_last_refill_at
         end,
         last_refill_at = v_new_last,
         engagement_stars_current = greatest(0, coalesce(s.engagement_stars_current, 0) - p_amount),
         current_stars = v_new_daily + coalesce(s.plan_stars, 0) + coalesce(s.addon_stars, 0),
         updated_at = v_now
   where s.id = v_row.id
   returning
      s.daily_stars,
      s.plan_stars,
      s.addon_stars,
      s.engagement_stars_current,
      s.engagement_stars_total,
      s.current_stars,
      s.daily_last_refill_at
   into
      v_new_daily,
      v_row.plan_stars,
      v_row.addon_stars,
      v_row.engagement_stars_current,
      v_row.engagement_stars_total,
      v_row.current_stars,
      v_new_last;

  return query select
    true,
    v_new_daily,
    v_row.plan_stars,
    v_row.addon_stars,
    v_row.engagement_stars_current,
    v_row.engagement_stars_total,
    v_row.current_stars,
    v_new_last;
end;
$$ language plpgsql security definer set search_path = public;

-- Add stars utility
create or replace function public.star_add(
  p_anon_device_id text,
  p_amount integer,
  p_user_id uuid default null
) returns table (
  daily_stars integer,
  engagement_stars_current integer,
  engagement_stars_total integer,
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
  v_last := public._star_coerce_refill_ts(v_row.daily_last_refill_at, v_now);
  update public.stars s
     set daily_stars = v_curr,
         anon_stars = case
           when p_user_id is null then v_curr
           else coalesce(s.anon_stars, 0)
         end,
         engagement_stars_current = coalesce(s.engagement_stars_current, 0) + greatest(0, coalesce(p_amount, 0)),
         engagement_stars_total = coalesce(s.engagement_stars_total, 0) + greatest(0, coalesce(p_amount, 0)),
         current_stars = v_curr + coalesce(s.plan_stars, 0) + coalesce(s.addon_stars, 0),
         updated_at = v_now
   where s.id = v_row.id
   returning
      s.daily_stars,
      s.engagement_stars_current,
      s.engagement_stars_total,
      s.current_stars,
      s.daily_last_refill_at
   into
      v_curr,
      v_row.engagement_stars_current,
      v_row.engagement_stars_total,
      v_row.current_stars,
      v_last;
  return query select
    v_curr,
    v_row.engagement_stars_current,
    v_row.engagement_stars_total,
    v_row.current_stars,
    v_last;
end;
$$ language plpgsql security definer set search_path = public;

-- Grants
grant execute on function public._star_coerce_refill_ts(timestamptz, timestamptz) to anon, authenticated;
grant execute on function public._star_bangkok_date_safe(timestamptz, timestamptz) to anon, authenticated;
grant execute on function public.star_get_or_create(text, uuid) to anon, authenticated;
grant execute on function public.star_spend(text, integer, uuid) to anon, authenticated;
grant execute on function public.star_add(text, integer, uuid) to anon, authenticated;
