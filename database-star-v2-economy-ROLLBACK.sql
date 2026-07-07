-- =====================================================================
-- ROLLBACK for database-star-v2-economy.sql
-- =====================================================================
-- Restores the legacy "5 stars / 5-hour batch refill" model by
-- re-installing the original function bodies (copied verbatim from
-- supabase-schema.sql and database-star-refill-notifications.sql) and
-- dropping the v2-only helper functions.
--
-- IMPORTANT — what this DOES and DOES NOT do:
--   * DOES restore star_get_or_create / star_spend / star_sweep_matured_refills
--     to their pre-v2 behaviour (anon 3/day reset, auth 5-per-5-hours).
--   * DOES drop the v2 helper functions (_star_free_refill, _star_local_now,
--     star_set_timezone).
--   * DOES NOT delete the added columns (timezone, last_free_grant_date,
--     signup_bonus_granted, migrated_to_v2) — they are harmless and dropping
--     them is optional (see the commented block at the end).
--   * DOES NOT automatically claw back the +5 stars already granted by the
--     v2 migration. That was a one-way data change. An OPTIONAL, guarded
--     reversal is provided (commented out) at the very end — read its
--     warning before running it.
--
-- Safe to run on staging first. Idempotent.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Restore star_get_or_create (legacy 5/5h + anon 3/day reset)
-- ---------------------------------------------------------------------
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
          values (p_user_id, 5, v_now, 0, 0, 5, v_now, true, true, v_now)
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
          values (p_user_id, 5, v_now, 0, 0, 5, v_now, true, true, v_now)
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
        values (p_user_id, 5, v_now, 0, 0, 5, v_now, true, true, v_now)
        returning * into v_state;
      end if;
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

-- ---------------------------------------------------------------------
-- 2. Restore star_spend (legacy 5/5h refill-then-spend)
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 3. Restore star_sweep_matured_refills (real 5-hour batch sweep)
-- ---------------------------------------------------------------------
create or replace function public.star_sweep_matured_refills()
returns table (user_id uuid) as $$
  with matured as (
    update public.stars s
       set daily_stars = 5,
           current_stars = 5 + coalesce(s.plan_stars, 0) + coalesce(s.addon_stars, 0),
           updated_at = now()
     where s.user_id is not null
       and s.daily_stars < 5
       and public._star_coerce_refill_ts(s.daily_last_refill_at, now()) + interval '5 hours' <= now()
     returning s.user_id
  )
  select user_id from matured;
$$ language sql security definer;

-- Server-only: the cron route calls this with the service role.
revoke all on function public.star_sweep_matured_refills() from public;
revoke all on function public.star_sweep_matured_refills() from anon;
revoke all on function public.star_sweep_matured_refills() from authenticated;
grant execute on function public.star_sweep_matured_refills() to service_role;

-- ---------------------------------------------------------------------
-- 4. Re-grant restored functions
-- ---------------------------------------------------------------------
grant execute on function public.star_get_or_create(text, uuid) to anon, authenticated;
grant execute on function public.star_spend(text, integer, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. Drop v2-only helper functions
-- ---------------------------------------------------------------------
drop function if exists public.star_set_timezone(uuid, text);
drop function if exists public._star_free_refill(integer, integer, integer, date, text, timestamptz);
drop function if exists public._star_local_now(text, timestamptz);

commit;

-- ---------------------------------------------------------------------
-- OPTIONAL: drop the v2 bookkeeping columns. Leaving them is harmless.
-- Uncomment only if you want a fully clean revert.
-- ---------------------------------------------------------------------
-- alter table public.stars drop column if exists timezone;
-- alter table public.stars drop column if exists last_free_grant_date;
-- alter table public.stars drop column if exists signup_bonus_granted;
-- alter table public.stars drop column if exists migrated_to_v2;

-- ---------------------------------------------------------------------
-- OPTIONAL & DESTRUCTIVE: claw back the +5 signup/migration bonus.
-- WARNING: this subtracts 5 from the free (daily) pool of every user the
-- v2 migration touched. Users who already spent some of it may lose stars
-- they would otherwise keep. It also re-arms migrated_to_v2 so a future
-- re-run of the v2 migration would grant +5 again. Review before running.
-- ---------------------------------------------------------------------
-- update public.stars s
--    set daily_stars   = greatest(0, coalesce(s.daily_stars, 0) - 5),
--        current_stars = greatest(0, coalesce(s.daily_stars, 0) - 5)
--                        + coalesce(s.plan_stars, 0) + coalesce(s.addon_stars, 0),
--        migrated_to_v2 = false,
--        signup_bonus_granted = false,
--        updated_at = now()
--  where s.user_id is not null
--    and coalesce(s.migrated_to_v2, false) = true;
