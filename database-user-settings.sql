-- User Settings table for account preferences and email marketing
create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  
  -- Email Marketing Preferences
  email_marketing_enabled boolean not null default true,
  email_promotional boolean not null default true,
  email_newsletter boolean not null default true,
  email_product_updates boolean not null default true,
  email_reading_reminders boolean not null default true,
  email_special_offers boolean not null default true,
  
  -- Notification Preferences
  push_notifications_enabled boolean not null default true,
  push_reading_reminders boolean not null default true,
  push_special_offers boolean not null default true,
  push_system_updates boolean not null default true,
  
  -- Privacy Settings
  profile_visibility text not null default 'private' check (profile_visibility in ('public', 'private', 'friends')),
  show_email boolean not null default false,
  show_birth_date boolean not null default false,
  allow_messages boolean not null default true,
  
  -- Reading Preferences
  default_reading_type text,
  auto_save_readings boolean not null default true,
  share_readings_by_default boolean not null default false,
  
  -- Language and Localization
  preferred_language text default 'en',
  timezone text,
  date_format text default 'MM/DD/YYYY',
  time_format text default '12h' check (time_format in ('12h', '24h')),
  
  -- Accessibility
  reduced_motion boolean not null default false,
  high_contrast boolean not null default false,
  font_size text default 'medium' check (font_size in ('small', 'medium', 'large')),
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for faster lookups
create index if not exists idx_user_settings_user_id on public.user_settings(user_id);

-- Enable RLS
alter table public.user_settings enable row level security;

-- RLS Policies
drop policy if exists "Users can view own settings" on public.user_settings;
create policy "Users can view own settings" on public.user_settings
  for select using (auth.uid() = user_id);

drop policy if exists "Users can update own settings" on public.user_settings;
create policy "Users can update own settings" on public.user_settings
  for update using (auth.uid() = user_id);

drop policy if exists "Users can insert own settings" on public.user_settings;
create policy "Users can insert own settings" on public.user_settings
  for insert with check (auth.uid() = user_id);

-- Function to get or create user settings
create or replace function public.get_or_create_user_settings(p_user_id uuid)
returns table (
  id uuid,
  user_id uuid,
  email_marketing_enabled boolean,
  email_promotional boolean,
  email_newsletter boolean,
  email_product_updates boolean,
  email_reading_reminders boolean,
  email_special_offers boolean,
  push_notifications_enabled boolean,
  push_reading_reminders boolean,
  push_special_offers boolean,
  push_system_updates boolean,
  profile_visibility text,
  show_email boolean,
  show_birth_date boolean,
  allow_messages boolean,
  default_reading_type text,
  auto_save_readings boolean,
  share_readings_by_default boolean,
  preferred_language text,
  timezone text,
  date_format text,
  time_format text,
  reduced_motion boolean,
  high_contrast boolean,
  font_size text,
  created_at timestamptz,
  updated_at timestamptz
) as $$
declare
  v_settings public.user_settings%rowtype;
begin
  -- Try to get existing settings
  select * into v_settings
  from public.user_settings
  where user_id = p_user_id;
  
  -- If not found, create default settings
  if not found then
    insert into public.user_settings (user_id)
    values (p_user_id)
    returning * into v_settings;
  end if;
  
  return query select * from public.user_settings where id = v_settings.id;
end;
$$ language plpgsql security definer set search_path = public;

