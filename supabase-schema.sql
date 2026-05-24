-- Stars schema (public-only). No auth.users DDL required.
-- Profiles (idempotent)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  avatar_url text,
  bio text,
  birth_date date,
  birth_time time,
  birth_place text,
  job text,
  gender text,
  consented_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Idempotent column add for existing deployments
alter table public.profiles
  add column if not exists consented_at timestamptz;

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

-- Stars table: separate rows for anonymous device and user.
create table if not exists public.stars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  anon_device_id text,
  current_stars integer not null default 3 check (current_stars >= 0),
  last_refill_at timestamptz not null default now(),
  daily_stars integer not null default 3,
  daily_last_refill_at timestamptz not null default now(),
  plan_stars integer not null default 0,
  plan_last_refill_at timestamptz,
  addon_stars integer not null default 0,
  addon_last_refill_at timestamptz,
  engagement_stars_current integer not null default 0,
  engagement_stars_total integer not null default 0,
  first_login_bonus_granted boolean not null default false,
  first_time_login_grant boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Allow either or both identifiers to be present
  constraint stars_user_or_device check ((user_id is not null) or (anon_device_id is not null))
);

-- Uniqueness: only one row per user and per device
create unique index if not exists stars_unique_user on public.stars(user_id) where user_id is not null;
create unique index if not exists stars_unique_device on public.stars(anon_device_id) where anon_device_id is not null;

alter table public.stars enable row level security;

-- Optional legacy columns: some DBs store anonymous balance in anon_stars; RPCs keep it equal to daily_stars.
alter table public.stars add column if not exists anon_stars integer;
alter table public.stars add column if not exists anon_last_refill_at timestamptz;
update public.stars s
   set anon_stars = coalesce(s.anon_stars, s.daily_stars, 0),
       anon_last_refill_at = coalesce(
           s.anon_last_refill_at,
           s.daily_last_refill_at,
           s.last_refill_at
       )
 where s.user_id is null
   and (s.anon_stars is distinct from coalesce(s.daily_stars, 0)
        or s.anon_last_refill_at is null);
update public.stars s
   set anon_stars = 0,
       anon_last_refill_at = null
 where s.user_id is not null;

-- Track which social follow rewards each user has claimed (one per platform)
create table if not exists public.star_social_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('facebook','instagram','threads','tiktok','x')),
  stars_awarded integer not null default 1 check (stars_awarded >= 0),
  claimed_at timestamptz not null default now()
);

create unique index if not exists star_social_claims_user_platform on public.star_social_claims(user_id, platform);

alter table public.star_social_claims enable row level security;

drop policy if exists "Users can view own social claims" on public.star_social_claims;
create policy "Users can view own social claims" on public.star_social_claims
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own social claims" on public.star_social_claims;
create policy "Users can insert own social claims" on public.star_social_claims
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can delete own social claims" on public.star_social_claims;
create policy "Users can delete own social claims" on public.star_social_claims
  for delete using (auth.uid() = user_id);

-- Removed star_identities as it's not used by the app
drop table if exists public.star_identities;

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

-- Grants
grant execute on function public._star_coerce_refill_ts(timestamptz, timestamptz) to anon, authenticated;
grant execute on function public._star_bangkok_date_safe(timestamptz, timestamptz) to anon, authenticated;
grant execute on function public.star_get_or_create(text, uuid) to anon, authenticated;
grant execute on function public.star_spend(text, integer, uuid) to anon, authenticated;
grant execute on function public.star_add(text, integer, uuid) to anon, authenticated;

-- Billing tables
-- Subscriptions: tracks recurring products
  create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
    provider text not null default 'manual',
  provider_subscription_id text unique,
  provider_customer_id text,
  plan text,
  pending_plan text,
  pending_change_at timestamptz,
  status text not null default 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  addon_stars integer not null default 0,
  addon_amount_usd numeric not null default 0,
  addon_items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Transactions: records one-time and subscription charges
  create table if not exists public.billing_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
    type text not null check (type in ('one_time','subscription_initial','subscription_recurring','refund','chargeback')),
    provider text not null default 'manual',
  provider_payment_id text,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'USD',
  reference text,
  status text not null default 'succeeded',
  subscription_id uuid references public.billing_subscriptions(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_billing_transactions_user_id on public.billing_transactions(user_id);
create index if not exists idx_billing_transactions_created_at on public.billing_transactions(created_at desc);
create index if not exists idx_billing_subscriptions_user_id on public.billing_subscriptions(user_id);

-- Enable RLS
alter table public.billing_transactions enable row level security;
alter table public.billing_subscriptions enable row level security;

-- Policies: users can view their own billing data
drop policy if exists "Users can view own transactions" on public.billing_transactions;
create policy "Users can view own transactions" on public.billing_transactions
  for select using (auth.uid() = user_id);

drop policy if exists "Users can view own subscriptions" on public.billing_subscriptions;
create policy "Users can view own subscriptions" on public.billing_subscriptions
  for select using (auth.uid() = user_id);

-- Insert/update policies are intentionally omitted; use service role via server routes

-- Set stars to an absolute balance (authenticated users only). This enables pack purchases to exceed 6.
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

grant execute on function public.star_set(text, integer, uuid) to authenticated;

-- Storage bucket for profile pictures
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;

-- Storage policies for avatars bucket
drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar" on storage.objects
  for update with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar" on storage.objects
  for delete using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Avatar images are publicly accessible" on storage.objects;
create policy "Avatar images are publicly accessible" on storage.objects
  for select using (bucket_id = 'avatars');

-- Per-date paid unlocks for the calendar (1 star per day). One row per
-- (user_id, unlocked_date); the unique index makes the unlock endpoint
-- idempotent so re-clicking a paid date never deducts a second star.
create table if not exists public.calendar_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  unlocked_date date not null,
  stars_spent integer not null default 1 check (stars_spent >= 0),
  created_at timestamptz not null default now()
);

create unique index if not exists calendar_unlocks_user_date
  on public.calendar_unlocks(user_id, unlocked_date);

create index if not exists calendar_unlocks_user
  on public.calendar_unlocks(user_id);

alter table public.calendar_unlocks enable row level security;

drop policy if exists "Users can view own calendar unlocks" on public.calendar_unlocks;
create policy "Users can view own calendar unlocks" on public.calendar_unlocks
  for select using (auth.uid() = user_id);