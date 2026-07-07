-- =====================================================================
-- Star Economy v2 — free-star model change + one-time migration
-- =====================================================================
-- Run ONCE, on staging first, then production. Idempotent: safe to
-- re-run (guarded by the `migrated_to_v2` flag and IF NOT EXISTS).
--
-- New rules (replaces the "5 stars / 5 hours batch refill" model):
--   * Anonymous: 1 lifetime star. No refill, no daily reset ever.
--   * Authenticated signup: +5 stars once per account (new rows start at 5).
--   * Authenticated daily refill: +1 star per LOCAL day, granted lazily
--     on read, ONLY when the TOTAL balance is 0 and the user's local time
--     is >= 09:00. If the balance is > 0 at 09:00 (e.g. purchased/leftover
--     stars) nothing is granted, so free stars never pile on paid ones.
--   * Migration: every existing authenticated user gets +5 (added, never
--     set) exactly once; purchased stars are preserved.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Schema: per-user timezone + v2 bookkeeping columns
-- ---------------------------------------------------------------------
alter table public.stars add column if not exists timezone text;
alter table public.stars add column if not exists last_free_grant_date date;
alter table public.stars add column if not exists signup_bonus_granted boolean not null default false;
alter table public.stars add column if not exists migrated_to_v2 boolean not null default false;

-- ---------------------------------------------------------------------
-- 2. Helpers: timezone-aware local time + the free-refill decision
-- ---------------------------------------------------------------------

-- Local wall-clock timestamp for the user's timezone. Falls back to
-- Asia/Bangkok when the stored tz is null/empty or an invalid IANA name
-- (so `AT TIME ZONE` can never abort the whole transaction).
create or replace function public._star_local_now(
  p_tz text,
  p_now timestamptz
) returns timestamp as $$
begin
  return p_now at time zone coalesce(nullif(trim(p_tz), ''), 'Asia/Bangkok');
exception when others then
  return p_now at time zone 'Asia/Bangkok';
end;
$$ language plpgsql stable;

-- Free daily refill decision for AUTHENTICATED users.
-- Grants exactly +1 to the free (daily) pool when, and only when:
--   * total balance (daily + plan + addon) is 0, AND
--   * it is >= 09:00 in the user's local timezone, AND
--   * no free star has already been granted on this local day.
-- Returns the (possibly unchanged) new daily balance and the local date
-- stamp to persist. Never touches plan/addon (purchased) pools.
create or replace function public._star_free_refill(
  p_daily integer,
  p_plan integer,
  p_addon integer,
  p_last_grant date,
  p_tz text,
  p_now timestamptz
) returns table (new_daily integer, new_last_grant date) as $$
declare
  v_daily integer := greatest(0, coalesce(p_daily, 0));
  v_total integer :=
      greatest(0, coalesce(p_daily, 0))
    + greatest(0, coalesce(p_plan, 0))
    + greatest(0, coalesce(p_addon, 0));
  v_local timestamp := public._star_local_now(p_tz, p_now);
  v_local_date date := v_local::date;
  v_local_hour integer := extract(hour from v_local)::integer;
begin
  if v_total = 0
     and v_local_hour >= 9
     and (p_last_grant is null or p_last_grant < v_local_date) then
    return query select 1, v_local_date;
  else
    return query select v_daily, p_last_grant;
  end if;
end;
$$ language plpgsql stable;

-- ---------------------------------------------------------------------
-- 3. star_get_or_create — v2 model
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
  v_now timestamptz := now();
  v_new_daily integer;
  v_new_last_grant date;
  v_legacy_did text;
  v_dl_safe timestamptz;
begin
  if p_user_id is not null then
    select * into v_state from public.stars s where s.user_id = p_user_id;
    if found then
      -- Detach any device id inherited from an anon merge (unchanged behaviour)
      if v_state.anon_device_id is not null then
        v_legacy_did := v_state.anon_device_id;
        update public.stars s
           set anon_device_id = null,
               updated_at = v_now
         where s.id = v_state.id
         returning * into v_state;
        insert into public.stars (anon_device_id, daily_stars, daily_last_refill_at, last_refill_at, current_stars, updated_at)
          select v_legacy_did, 1, v_now, v_now, 1, v_now
          where not exists (
            select 1 from public.stars s2 where s2.anon_device_id = v_legacy_did
          );
      end if;
    else
      -- Brand-new authenticated account: signup bonus = 5 (once). Stamp
      -- today's local date so no extra +1 free star is granted same day.
      -- Timezone is not known yet at creation, so the stamp uses the
      -- Asia/Bangkok fallback; star_set_timezone stores the real tz on the
      -- next app load, well before the account can reach a 0 balance.
      insert into public.stars (
        user_id,
        daily_stars,
        daily_last_refill_at,
        plan_stars,
        addon_stars,
        current_stars,
        last_refill_at,
        last_free_grant_date,
        signup_bonus_granted,
        migrated_to_v2,
        first_login_bonus_granted,
        first_time_login_grant,
        updated_at
      )
      values (
        p_user_id, 5, v_now, 0, 0, 5, v_now,
        public._star_local_now(null, v_now)::date,
        true, true, true, true, v_now
      )
      returning * into v_state;
    end if;

    -- Lazy free daily refill (+1 when empty, >=09:00 local, once/local-day)
    select new_daily, new_last_grant
      into v_new_daily, v_new_last_grant
      from public._star_free_refill(
        v_state.daily_stars,
        v_state.plan_stars,
        v_state.addon_stars,
        v_state.last_free_grant_date,
        v_state.timezone,
        v_now
      );
    if v_new_daily is distinct from v_state.daily_stars
       or v_new_last_grant is distinct from v_state.last_free_grant_date then
      update public.stars s
         set daily_stars = v_new_daily,
             last_free_grant_date = v_new_last_grant,
             current_stars = v_new_daily + coalesce(s.plan_stars, 0) + coalesce(s.addon_stars, 0),
             updated_at = v_now
       where s.id = v_state.id
       returning * into v_state;
    end if;
  else
    -- Anonymous: 1 lifetime star, no refill, no reset.
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
           values (p_anon_device_id, 1, v_now, 1, v_now, 1, v_now)
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

    -- Cap the anon balance at 1 (down from the legacy 3) without ever
    -- topping it back up: min(existing, 1) so a spent anon stays at 0.
    <<anon_sync>>
    declare
      v_anon_cap constant int := 1;
      v_from_anon int := greatest(0, coalesce(v_state.anon_stars, 0));
      v_from_daily int := greatest(0, coalesce(v_state.daily_stars, 0));
      -- Take the higher of the two legacy balance columns (they can drift
      -- out of sync in old rows), then cap at 1. A fully-spent anon (0,0)
      -- correctly stays at 0 — no lifetime top-up.
      v_sync int := least(v_anon_cap, greatest(v_from_anon, v_from_daily));
    begin
      if v_sync is distinct from v_state.daily_stars
         or coalesce(v_state.anon_stars, -1) is distinct from v_sync then
        update public.stars s
           set daily_stars = v_sync,
               anon_stars = v_sync,
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
-- 4. star_spend — v2 model (no anon reset, tz-aware free refill first)
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
  v_now timestamptz := now();
  v_new_daily integer;
  v_plan_stars integer;
  v_addon_stars integer;
  v_engagement_stars_current integer;
  v_engagement_stars_total integer;
  v_current_stars integer;
  v_last timestamptz;
begin
  if coalesce(p_amount, 0) <= 0 then
    return query select
      false, null::int, null::int, null::int,
      null::int, null::int, null::int, null::timestamptz;
    return;
  end if;

  -- get_or_create already applied the lazy free refill and any anon cap.
  select * from public.star_get_or_create(p_anon_device_id, p_user_id) into v_row;
  v_new_daily := coalesce(v_row.daily_stars, 0);
  v_plan_stars := coalesce(v_row.plan_stars, 0);
  v_addon_stars := coalesce(v_row.addon_stars, 0);
  v_engagement_stars_current := coalesce(v_row.engagement_stars_current, 0);
  v_engagement_stars_total := coalesce(v_row.engagement_stars_total, 0);
  v_current_stars := coalesce(v_row.current_stars, 0);
  v_last := public._star_coerce_refill_ts(v_row.daily_last_refill_at, v_now);

  -- Spend order matches the legacy behaviour: from the free (daily) pool.
  if v_new_daily < p_amount then
    return query select
      false,
      v_new_daily,
      v_plan_stars,
      v_addon_stars,
      greatest(0, v_engagement_stars_current - p_amount),
      v_engagement_stars_total,
      v_new_daily + v_plan_stars + v_addon_stars,
      v_last;
    return;
  end if;

  v_new_daily := v_new_daily - p_amount;

  update public.stars s
     set daily_stars = v_new_daily,
         anon_stars = case
           when p_user_id is null then v_new_daily
           else coalesce(s.anon_stars, 0)
         end,
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
      v_last;

  return query select
    true,
    v_new_daily,
    v_plan_stars,
    v_addon_stars,
    v_engagement_stars_current,
    v_engagement_stars_total,
    v_current_stars,
    v_last;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------------------------------------------------------------------
-- 5. Store the user's timezone on the stars row (called from the app).
--    Only sets it when currently empty, so we capture the first-seen tz.
-- ---------------------------------------------------------------------
create or replace function public.star_set_timezone(
  p_user_id uuid,
  p_timezone text
) returns void as $$
begin
  if p_user_id is null or coalesce(nullif(trim(p_timezone), ''), '') = '' then
    return;
  end if;
  update public.stars s
     set timezone = p_timezone,
         updated_at = now()
   where s.user_id = p_user_id
     and (s.timezone is null or trim(s.timezone) = '');
end;
$$ language plpgsql security definer set search_path = public;

-- ---------------------------------------------------------------------
-- 6. Grants
-- ---------------------------------------------------------------------
grant execute on function public._star_local_now(text, timestamptz) to anon, authenticated;
grant execute on function public._star_free_refill(integer, integer, integer, date, text, timestamptz) to anon, authenticated;
grant execute on function public.star_get_or_create(text, uuid) to anon, authenticated;
grant execute on function public.star_spend(text, integer, uuid) to anon, authenticated;
grant execute on function public.star_set_timezone(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- 6b. Neutralize the legacy 5-hour batch-refill sweep.
--     v2 has no 5h batch refill — the free star is granted lazily, 1/day
--     when empty at 09:00 local. Left as a no-op so the existing cron
--     (app/api/stars/refill-sweep, vercel.json, the GitHub Action) keeps
--     returning 200 without ever wrongly refilling free stars to 5 or
--     sending "your 5 stars refilled" emails. The cron can be removed
--     entirely in a follow-up.
-- ---------------------------------------------------------------------
create or replace function public.star_sweep_matured_refills()
returns table (user_id uuid) as $$
  select null::uuid where false;
$$ language sql security definer;

revoke all on function public.star_sweep_matured_refills() from public;
revoke all on function public.star_sweep_matured_refills() from anon;
revoke all on function public.star_sweep_matured_refills() from authenticated;
grant execute on function public.star_sweep_matured_refills() to service_role;

-- ---------------------------------------------------------------------
-- 7. One-time migration of existing authenticated users: +5 stars.
--    Idempotent via migrated_to_v2. Purchased (plan/addon) pools are
--    never touched — we ADD to the free pool, we never SET it.
-- ---------------------------------------------------------------------
do $$
declare
  v_count integer;
begin
  with migrated as (
    update public.stars s
       set daily_stars = greatest(0, coalesce(s.daily_stars, 0)) + 5,
           current_stars = greatest(0, coalesce(s.daily_stars, 0)) + 5
                            + coalesce(s.plan_stars, 0) + coalesce(s.addon_stars, 0),
           signup_bonus_granted = true,
           migrated_to_v2 = true,
           last_free_grant_date = public._star_local_now(s.timezone, now())::date,
           updated_at = now()
     where s.user_id is not null
       and coalesce(s.migrated_to_v2, false) = false
    returning s.id
  )
  select count(*) into v_count from migrated;
  raise notice 'star v2 migration: % existing authenticated users granted +5', v_count;
end;
$$;

commit;
