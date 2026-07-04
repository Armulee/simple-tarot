-- Migration: batch star refill — 5 stars every 5 hours (authenticated users).
--
-- Replaces the incremental refill (1 star per 2 hours, cap 6) with a single
-- batch refill: free authenticated users hold up to 5 daily stars, and once
-- the balance drops below the cap (the moment a star is deducted for a
-- reading), a 5-hour timer starts. When the 5 hours elapse the balance resets
-- to the full 5 stars in one step — there is NO faster partial refill.
--
-- The refill anchor (`daily_last_refill_at`) is already set to "the moment the
-- balance dropped from full" by star_spend; this migration only changes what
-- happens when the timer matures (full reset instead of +1 per interval) and
-- lowers the cap 6 → 5.
--
-- Anonymous users are unchanged: 3 stars, reset at midnight Asia/Bangkok.
-- Plan / add-on / engagement pools are unchanged.
--
-- Based on the hardened definitions in database-star-invalid-refill-ts-fix.sql.
-- Run in the Supabase SQL editor after deploying app code that expects the
-- new cap (client shows cap 5 and a 5-hour countdown).

-- 1. Clamp existing authenticated balances to the new cap and keep the
--    aggregate in sync.
update public.stars s
set daily_stars = 5,
    current_stars = 5 + coalesce(s.plan_stars, 0) + coalesce(s.addon_stars, 0),
    updated_at = now()
where s.user_id is not null
  and s.daily_stars > 5;

-- 2. Recreate the refill helper with batch semantics.
--    p_interval_hours is now the FULL-REFILL period (5 hours), not a per-star
--    drip rate. Below the cap: once the period has elapsed since the anchor,
--    the balance jumps straight to the cap. Otherwise nothing accrues.
drop function if exists public._star_apply_refill(integer, timestamptz, timestamptz, integer, integer);
create or replace function public._star_apply_refill(
  p_current integer,
  p_last_refill timestamptz,
  p_now timestamptz,
  p_cap integer,
  p_interval_hours integer default 5
) returns table (new_current integer, new_last_refill timestamptz) as $$
declare
  v_current integer := greatest(0, coalesce(p_current, 0));
  v_last timestamptz := public._star_coerce_refill_ts(p_last_refill, p_now);
  v_cap integer := greatest(0, coalesce(p_cap, 0));
begin
  if v_current >= v_cap then
    -- At (or above) cap: nothing to refill. Null anchor keeps callers'
    -- existing coalesce() behavior (anchor resets on the spend that next
    -- drops the balance below the cap).
    return query select v_current, case when v_cap = 0 then v_last else null end;
  elsif p_now - v_last >= (greatest(1, p_interval_hours) || ' hours')::interval then
    -- One full period elapsed since the balance dropped from full:
    -- batch-refill straight to the cap.
    return query select v_cap, null::timestamptz;
  else
    -- Mid-cycle: no partial refill. The countdown keeps running.
    return query select v_current, v_last;
  end if;
end;
$$ language plpgsql stable;

-- 3. Recreate the RPCs with cap 5 and the 5-hour period.
drop function if exists public.star_spend(text, integer, uuid);
drop function if exists public.star_add(text, integer, uuid);
drop function if exists public.star_get_or_create(text, uuid);

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
  v_cap integer := case when p_user_id is null then 3 else 5 end;
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
          from public._star_apply_refill(v_state.daily_stars, v_state.daily_last_refill_at, v_now, v_cap, 5);
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
      values (p_user_id, 5, v_now, 0, 0, 5, v_now, true, true, v_now)
      returning * into v_state;
    end if;

    select new_current, coalesce(new_last_refill, v_state.daily_last_refill_at)
      into v_new_current, v_new_last
      from public._star_apply_refill(v_state.daily_stars, v_state.daily_last_refill_at, v_now, v_cap, 5);
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

-- Spend stars, applying refill first. The 5-hour batch timer starts the moment
-- a spend drops the balance below the cap (i.e. when a star is deducted for a
-- reading from a full balance).
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
  v_row record;
  v_cap integer := case when p_user_id is null then 3 else 5 end;
  v_now timestamptz := now();
  v_new_daily integer;
  v_new_last timestamptz;
  v_plan_stars integer;
  v_addon_stars integer;
  v_engagement_stars_current integer;
  v_engagement_stars_total integer;
  v_current_stars integer;
begin
  if coalesce(p_amount, 0) <= 0 then
    return query select
      false,
      null::int,
      null::int,
      null::int,
      null::int,
      null::int,
      null::int,
      null::timestamptz;
  end if;

  select * from public.star_get_or_create(p_anon_device_id, p_user_id) into v_row;
  v_new_daily := v_row.daily_stars;
  v_new_last := public._star_coerce_refill_ts(v_row.daily_last_refill_at, v_now);
  v_plan_stars := coalesce(v_row.plan_stars, 0);
  v_addon_stars := coalesce(v_row.addon_stars, 0);
  v_engagement_stars_current := coalesce(v_row.engagement_stars_current, 0);
  v_engagement_stars_total := coalesce(v_row.engagement_stars_total, 0);
  v_current_stars := coalesce(v_row.current_stars, 0);

  if p_user_id is not null then
    select new_current,
           public._star_coerce_refill_ts(
             coalesce(new_last_refill, v_row.daily_last_refill_at),
             v_now
           )
      into v_new_daily, v_new_last
      from public._star_apply_refill(v_row.daily_stars, v_row.daily_last_refill_at, v_now, v_cap, 5);
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
      v_plan_stars,
      v_addon_stars,
      greatest(0, v_engagement_stars_current - p_amount),
      v_engagement_stars_total,
      v_new_daily + v_plan_stars + v_addon_stars,
      v_new_last;
  end if;

  v_new_daily := v_new_daily - p_amount;
  if p_user_id is not null then
    -- Start the 5-hour batch timer when this deduction drops the balance
    -- below the cap. Further spends inside the window keep the same anchor,
    -- so the full 5-star reset still lands 5 hours after the first deduction.
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
      v_plan_stars,
      v_addon_stars,
      v_engagement_stars_current,
      v_engagement_stars_total,
      v_current_stars,
      v_new_last;

  return query select
    true,
    v_new_daily,
    v_plan_stars,
    v_addon_stars,
    v_engagement_stars_current,
    v_engagement_stars_total,
    v_current_stars,
    v_new_last;
end;
$$ language plpgsql security definer set search_path = public;

-- Add stars utility (unchanged semantics; recreated because star_get_or_create
-- was dropped above and its return shape must stay aligned).
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
  v_row record;
  v_now timestamptz := now();
  v_curr integer;
  v_last timestamptz;
  v_engagement_stars_current integer;
  v_engagement_stars_total integer;
  v_current_stars integer;
begin
  select * from public.star_get_or_create(p_anon_device_id, p_user_id) into v_row;
  v_curr := v_row.daily_stars + greatest(0, coalesce(p_amount, 0));
  v_last := public._star_coerce_refill_ts(v_row.daily_last_refill_at, v_now);
  v_engagement_stars_current := coalesce(v_row.engagement_stars_current, 0);
  v_engagement_stars_total := coalesce(v_row.engagement_stars_total, 0);
  v_current_stars := coalesce(v_row.current_stars, 0);
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
      v_engagement_stars_current,
      v_engagement_stars_total,
      v_current_stars,
      v_last;
  return query select
    v_curr,
    v_engagement_stars_current,
    v_engagement_stars_total,
    v_current_stars,
    v_last;
end;
$$ language plpgsql security definer set search_path = public;

-- star_set: clamp the daily portion to the new cap.
drop function if exists public.star_set(text, integer, uuid);
create or replace function public.star_set(
  p_anon_device_id text,
  p_new_balance integer,
  p_user_id uuid default null
) returns table (
  daily_stars integer,
  plan_stars integer,
  addon_stars integer,
  engagement_stars_current integer,
  engagement_stars_total integer,
  current_stars integer,
  daily_last_refill_at timestamptz
) as $$
declare
  v_row record;
  v_now timestamptz := now();
  v_target integer := greatest(0, coalesce(p_new_balance, 0));
  v_daily integer;
  v_plan integer;
  v_addon integer;
  v_engagement_stars_current integer;
  v_engagement_stars_total integer;
  v_current_stars integer;
  v_daily_last_refill_at timestamptz;
begin
  if p_user_id is null then
    raise exception 'star_set requires authenticated user';
  end if;

  select * from public.star_get_or_create(p_anon_device_id, p_user_id) into v_row;
  v_daily := least(5, v_target);
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
   returning
      s.daily_stars,
      s.plan_stars,
      s.addon_stars,
      s.engagement_stars_current,
      s.engagement_stars_total,
      s.current_stars,
      s.daily_last_refill_at
   into
      v_daily,
      v_plan,
      v_addon,
      v_engagement_stars_current,
      v_engagement_stars_total,
      v_current_stars,
      v_daily_last_refill_at;
  return query select
    v_daily,
    v_plan,
    v_addon,
    v_engagement_stars_current,
    v_engagement_stars_total,
    v_current_stars,
    v_daily_last_refill_at;
end;
$$ language plpgsql security definer set search_path = public;

-- Grants
grant execute on function public._star_apply_refill(integer, timestamptz, timestamptz, integer, integer) to anon, authenticated;
grant execute on function public.star_get_or_create(text, uuid) to anon, authenticated;
grant execute on function public.star_spend(text, integer, uuid) to anon, authenticated;
grant execute on function public.star_add(text, integer, uuid) to anon, authenticated;
grant execute on function public.star_set(text, integer, uuid) to authenticated;
