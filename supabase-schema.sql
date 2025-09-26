-- Enable Row Level Security on auth.users (if not already enabled)
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles table
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to handle user updates
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET 
    name = NEW.raw_user_meta_data->>'name',
    avatar_url = NEW.raw_user_meta_data->>'avatar_url',
    updated_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for user updates
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- ===========================================================================
-- Stars: persisted balance and refill logic (anonymous + authenticated users)
-- ===========================================================================

-- Clean up any old conflicting function signatures (safe if not present)
drop function if exists public.star_spend(text, uuid, integer) cascade;
drop function if exists public.star_add(text, uuid, integer) cascade;
drop function if exists public.star_refresh(text, uuid) cascade;
drop function if exists public.star_get_or_create(text, uuid) cascade;
drop function if exists public.star_sync_user_to_device(text, uuid) cascade;

-- Extensions required for UUID generation
create extension if not exists pgcrypto;

-- Star state table: exactly one row per user OR per anonymous device
create table if not exists public.star_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  anon_device_id text,
  current_stars integer not null default 5 check (current_stars >= 0),
  last_refill_at timestamptz not null default now(),
  first_login_bonus_granted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint star_states_user_or_device check ((user_id is not null) <> (anon_device_id is not null))
);

-- Uniqueness for both identities
create unique index if not exists star_states_unique_user on public.star_states(user_id) where user_id is not null;
create unique index if not exists star_states_unique_device on public.star_states(anon_device_id) where anon_device_id is not null;

-- Lock table down; all access via SECURITY DEFINER functions below
alter table public.star_states enable row level security;

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
    return query select v_current, case when v_cap = 0 then v_last else null end; -- keep last; next refill not needed at/over cap
  end if;

  v_hours := floor(extract(epoch from (p_now - v_last)) / 3600)::int;
  if v_hours <= 0 then
    return query select v_current, v_last;
  end if;

  v_add := least(v_hours, v_cap - v_current);
  return query select v_current + v_add, v_last + (v_add || ' hours')::interval;
end;
$$ language plpgsql immutable;

-- Get or create star state, migrate anon->user on first login, apply refill and onetime +10 bonus
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
  if p_user_id is not null then
    select * into v_state from public.star_states s where s.user_id = p_user_id;
    if not found then
      -- First login for this user; seed from anon device if provided, but DO NOT migrate anon row
      if p_anon_device_id is not null then
        -- read anon state
        declare
          v_anon_row public.star_states%rowtype;
          v_ac integer;
          v_al timestamptz;
        begin
          select * into v_anon_row from public.star_states s where s.anon_device_id = p_anon_device_id;
          if found then
            -- apply refill with anon cap (5)
            select new_current, coalesce(new_last_refill, v_anon_row.last_refill_at)
              into v_ac, v_al
              from public._star_apply_refill(v_anon_row.current_stars, v_anon_row.last_refill_at, v_now, 5);
            -- grant +10 one-time on user creation
            insert into public.star_states (user_id, current_stars, last_refill_at, first_login_bonus_granted, updated_at)
                 values (p_user_id, v_ac + 10, v_al, true, v_now)
            returning * into v_state;
          else
            -- no anon row, start fresh with 5 + 10
            insert into public.star_states (user_id, current_stars, last_refill_at, first_login_bonus_granted, updated_at)
                 values (p_user_id, 15, v_now, true, v_now)
            returning * into v_state;
          end if;
        end;
      else
        -- no anon id provided; start with 5 + 10
        insert into public.star_states (user_id, current_stars, last_refill_at, first_login_bonus_granted, updated_at)
             values (p_user_id, 15, v_now, true, v_now)
        returning * into v_state;
      end if;
    end if;

    -- Apply refill up to user cap
    select new_current, coalesce(new_last_refill, v_state.last_refill_at)
      into v_new_current, v_new_last
      from public._star_apply_refill(v_state.current_stars, v_state.last_refill_at, v_now, v_cap);

    -- After user exists, do NOT add first-login bonus again
    update public.star_states s
       set current_stars = v_new_current,
           last_refill_at = v_new_last,
           updated_at = v_now
     where s.id = v_state.id
     returning * into v_state;

  else
    -- Anonymous
    if p_anon_device_id is null or length(p_anon_device_id) = 0 then
      raise exception 'anon device id required for anonymous state';
    end if;
    select * into v_state from public.star_states s where s.anon_device_id = p_anon_device_id;
    if not found then
      insert into public.star_states (anon_device_id, current_stars, last_refill_at)
           values (p_anon_device_id, 5, v_now)
      returning * into v_state;
    end if;

    -- Apply refill up to anon cap
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

-- Spend stars, applying refill first and starting timer if dropping below cap
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

  -- Apply refill just in case (get_or_create already did, but safe for idempotency)
  select new_current, coalesce(new_last_refill, v_row.last_refill_at)
    into v_new_current, v_new_last
    from public._star_apply_refill(v_row.current_stars, v_row.last_refill_at, v_now, v_cap);

  if v_new_current < p_amount then
    return query select false, v_new_current, v_new_last;
  end if;

  v_new_current := v_new_current - p_amount;
  if v_prev >= v_cap and v_new_current < v_cap then
    v_new_last := v_now; -- start timer when dropping below cap
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

-- Add stars utility (e.g., purchases or rewards)
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
  if coalesce(p_amount, 0) <= 0 then
    select * from public.star_get_or_create(p_anon_device_id, p_user_id) into v_row;
    return query select v_row.current_stars, v_row.last_refill_at;
  end if;

  select * from public.star_get_or_create(p_anon_device_id, p_user_id) into v_row;
  update public.star_states s
     set current_stars = v_row.current_stars + p_amount,
         updated_at = v_now
   where s.id = v_row.id
   returning s.current_stars, s.last_refill_at;
end;
$$ language plpgsql security definer set search_path = public;

-- Refresh state to apply any due refill without other changes
create or replace function public.star_refresh(
  p_anon_device_id text,
  p_user_id uuid default null
) returns table (
  current_stars integer,
  last_refill_at timestamptz
) as $$
declare
  v_row public.star_states%rowtype;
  v_cap integer := case when p_user_id is null then 5 else 15 end;
  v_now timestamptz := now();
  v_new_current integer;
  v_new_last timestamptz;
begin
  select * from public.star_get_or_create(p_anon_device_id, p_user_id) into v_row;
  select new_current, coalesce(new_last_refill, v_row.last_refill_at)
    into v_new_current, v_new_last
    from public._star_apply_refill(v_row.current_stars, v_row.last_refill_at, v_now, v_cap);

  update public.star_states s
     set current_stars = v_new_current,
         last_refill_at = v_new_last,
         updated_at = v_now
   where s.id = v_row.id;

  return query select v_new_current, v_new_last;
end;
$$ language plpgsql security definer set search_path = public;

-- On sign out: copy user state into this device row, preserving balance and last_refill
create or replace function public.star_sync_user_to_device(
  p_anon_device_id text,
  p_user_id uuid
) returns table (
  device_current_stars integer,
  device_last_refill_at timestamptz
) as $$
declare
  v_user_row public.star_states%rowtype;
  v_dev_row public.star_states%rowtype;
  v_now timestamptz := now();
begin
  if p_anon_device_id is null or length(p_anon_device_id) = 0 then
    raise exception 'anon device id required';
  end if;

  select * from public.star_get_or_create(null, p_user_id) into v_user_row; -- ensure user row exists/refreshed

  -- Upsert device row from user values
  select * into v_dev_row from public.star_states s where s.anon_device_id = p_anon_device_id;
  if not found then
    insert into public.star_states (anon_device_id, current_stars, last_refill_at)
         values (p_anon_device_id, v_user_row.current_stars, v_user_row.last_refill_at)
    returning * into v_dev_row;
  else
    update public.star_states s
       set current_stars = v_user_row.current_stars,
           last_refill_at = v_user_row.last_refill_at,
           updated_at = v_now
     where s.id = v_dev_row.id
     returning * into v_dev_row;
  end if;

  return query select v_dev_row.current_stars, v_dev_row.last_refill_at;
end;
$$ language plpgsql security definer set search_path = public;

-- Permissions: allow RPC execution for both anon and authenticated
grant execute on function public.star_get_or_create(text, uuid) to anon, authenticated;
grant execute on function public.star_spend(text, integer, uuid) to anon, authenticated;
grant execute on function public.star_add(text, integer, uuid) to anon, authenticated;
grant execute on function public.star_refresh(text, uuid) to anon, authenticated;
grant execute on function public.star_sync_user_to_device(text, uuid) to anon, authenticated;