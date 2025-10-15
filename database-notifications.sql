-- Notifications table for in-app notifications
-- Run this in Supabase SQL editor

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text,
  body text,
  link text,
  shared_id text,
  date_key text,
  visits_count integer not null default 1,
  read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);
create index if not exists idx_notifications_unread on public.notifications(user_id, read) where read = false;

-- RLS
alter table public.notifications enable row level security;
drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications" on public.notifications
  for select using (auth.uid() = user_id);
drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications" on public.notifications
  for update using (auth.uid() = user_id);
-- Inserts will be done by server routes via service role; no insert policy for clients

comment on table public.notifications is 'In-app notifications for users';

