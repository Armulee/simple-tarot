-- Fix: repair corrupt daily_last_refill_at values (epoch-zero / "0") that cause
-- PostgreSQL error 22008 "date/time field value out of range" in star RPCs.

-- 1. Patch any rows with corrupt or missing refill timestamps.
UPDATE public.stars
SET daily_last_refill_at = now(),
    last_refill_at = now()
WHERE daily_last_refill_at IS NULL
   OR daily_last_refill_at <= '1970-01-02T00:00:00Z'::timestamptz;

-- 2. Harden star_get_or_create: COALESCE guards on the timezone cast.
CREATE OR REPLACE FUNCTION public.star_get_or_create(
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
            user_id, daily_stars, daily_last_refill_at, plan_stars, addon_stars,
            current_stars, last_refill_at, first_login_bonus_granted, first_time_login_grant, updated_at
          ) values (p_user_id, 6, v_now, 0, 0, 6, v_now, true, true, v_now)
          returning * into v_state;
        else
          insert into public.stars (
            user_id, daily_stars, daily_last_refill_at, plan_stars, addon_stars,
            current_stars, last_refill_at, first_login_bonus_granted, first_time_login_grant, updated_at
          ) values (p_user_id, 6, v_now, 0, 0, 6, v_now, true, true, v_now)
          returning * into v_state;
        end if;
      else
        insert into public.stars (
          user_id, daily_stars, daily_last_refill_at, plan_stars, addon_stars,
          current_stars, last_refill_at, first_login_bonus_granted, first_time_login_grant, updated_at
        ) values (p_user_id, 6, v_now, 0, 0, 6, v_now, true, true, v_now)
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
           values (p_anon_device_id, 3, v_now, 3, v_now)
      returning * into v_state;
    end if;

    -- COALESCE guard: treat null/corrupt timestamps as "needs refill"
    if (coalesce(v_state.daily_last_refill_at, '1970-01-01'::timestamptz) at time zone 'Asia/Bangkok')::date < (v_now at time zone 'Asia/Bangkok')::date then
      update public.stars s
         set daily_stars = 3,
             daily_last_refill_at = v_now,
             last_refill_at = v_now,
             current_stars = 3,
             updated_at = v_now
       where s.id = v_state.id
       returning * into v_state;
    end if;
  end if;

  return query select
    v_state.id, v_state.user_id, v_state.anon_device_id,
    v_state.daily_stars, v_state.daily_last_refill_at,
    v_state.plan_stars, v_state.plan_last_refill_at,
    v_state.addon_stars, v_state.addon_last_refill_at,
    v_state.engagement_stars_current, v_state.engagement_stars_total,
    v_state.current_stars, v_state.last_refill_at,
    v_state.first_login_bonus_granted, v_state.first_time_login_grant;
end;
$$ language plpgsql security definer set search_path = public;

-- 3. Harden star_spend: COALESCE guard on the timezone cast.
CREATE OR REPLACE FUNCTION public.star_spend(
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
    return query select false, null::int, null::int, null::int, null::int, null::int, null::int, null::timestamptz;
  end if;

  select * from public.star_get_or_create(p_anon_device_id, p_user_id) into v_row;
  v_new_daily := v_row.daily_stars;
  v_new_last := v_row.daily_last_refill_at;

  if p_user_id is not null then
    select new_current, coalesce(new_last_refill, v_row.daily_last_refill_at)
      into v_new_daily, v_new_last
      from public._star_apply_refill(v_row.daily_stars, v_row.daily_last_refill_at, v_now, v_cap, 2);
  else
    -- COALESCE guard: treat null/corrupt timestamps as "needs refill"
    if (coalesce(v_row.daily_last_refill_at, '1970-01-01'::timestamptz) at time zone 'Asia/Bangkok')::date < (v_now at time zone 'Asia/Bangkok')::date then
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
         last_refill_at = v_new_last,
         engagement_stars_current = greatest(0, coalesce(s.engagement_stars_current, 0) - p_amount),
         current_stars = v_new_daily + coalesce(s.plan_stars, 0) + coalesce(s.addon_stars, 0),
         updated_at = v_now
   where s.id = v_row.id
   returning
      s.daily_stars, s.plan_stars, s.addon_stars,
      s.engagement_stars_current, s.engagement_stars_total,
      s.current_stars, s.daily_last_refill_at
   into
      v_new_daily, v_row.plan_stars, v_row.addon_stars,
      v_row.engagement_stars_current, v_row.engagement_stars_total,
      v_row.current_stars, v_new_last;

  return query select
    true,
    v_new_daily, v_row.plan_stars, v_row.addon_stars,
    v_row.engagement_stars_current, v_row.engagement_stars_total,
    v_row.current_stars, v_new_last;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.star_get_or_create(text, uuid) to anon, authenticated;
grant execute on function public.star_spend(text, integer, uuid) to anon, authenticated;
