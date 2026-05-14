-- Fix RPC row-shape mismatch when loading star_get_or_create(...) into public.stars%rowtype.
-- Symptom: ERROR 22008 date/time field value out of range: "0" in star_spend/star_add/star_set.
-- Cause: RETURNS TABLE order from star_get_or_create does not match physical public.stars column order.
-- Run this in Supabase SQL editor after the timestamp safety helpers already exist.

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
  v_cap integer := case when p_user_id is null then 3 else 6 end;
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
      v_plan_stars,
      v_addon_stars,
      greatest(0, v_engagement_stars_current - p_amount),
      v_engagement_stars_total,
      v_new_daily + v_plan_stars + v_addon_stars,
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
  v_daily := least(6, v_target);
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

grant execute on function public.star_spend(text, integer, uuid) to anon, authenticated;
grant execute on function public.star_add(text, integer, uuid) to anon, authenticated;
grant execute on function public.star_set(text, integer, uuid) to authenticated;
