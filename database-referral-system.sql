-- Referral system tables and functions

-- Create referral_bonuses table
create table if not exists public.referral_bonuses (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_user_id uuid not null references auth.users(id) on delete cascade,
  bonus_amount integer not null default 5,
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  -- Ensure unique referral per user
  unique(referred_user_id)
);

-- Enable RLS
alter table public.referral_bonuses enable row level security;

-- Create policies
create policy "Users can view their own referral bonuses" on public.referral_bonuses
  for select using (auth.uid() = referrer_id or auth.uid() = referred_user_id);

-- Create function to process referral bonus
create or replace function public.process_referral_bonus(
  p_referrer_id uuid,
  p_referred_user_id uuid,
  p_bonus_amount integer default 5
) returns json as $$
declare
  v_referrer_stars integer;
  v_referred_stars integer;
  v_referral_id uuid;
begin
  -- Insert referral bonus record
  insert into public.referral_bonuses (referrer_id, referred_user_id, bonus_amount)
  values (p_referrer_id, p_referred_user_id, p_bonus_amount)
  returning id into v_referral_id;

  -- Add stars to referrer
  update public.stars 
  set current_stars = current_stars + p_bonus_amount,
      updated_at = now()
  where user_id = p_referrer_id
  returning current_stars into v_referrer_stars;

  -- Add stars to referred user
  update public.stars 
  set current_stars = current_stars + p_bonus_amount,
      updated_at = now()
  where user_id = p_referred_user_id
  returning current_stars into v_referred_stars;

  -- Return success with current balances
  return json_build_object(
    'success', true,
    'referral_id', v_referral_id,
    'referrer_stars', v_referrer_stars,
    'referred_stars', v_referred_stars
  );
end;
$$ language plpgsql security definer;
