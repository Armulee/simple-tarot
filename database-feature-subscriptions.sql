-- Migration: feature waitlist subscriptions ("notify me when X ships").
--
-- Backs the "COMING SOON" avatar subscribe flow and the admin broadcast tool.
-- A user subscribes to be emailed when a feature (e.g. the avatar) launches;
-- admins later broadcast an announcement to everyone subscribed to a feature.
--
-- Idempotent: safe to run multiple times.

create extension if not exists pgcrypto;

create table if not exists public.feature_subscriptions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    email text not null,
    feature text not null,
    created_at timestamptz not null default now()
);

-- One subscription per user per feature.
create unique index if not exists feature_subscriptions_user_feature
    on public.feature_subscriptions(user_id, feature);

create index if not exists feature_subscriptions_feature
    on public.feature_subscriptions(feature);

alter table public.feature_subscriptions enable row level security;

-- Users may read their own subscriptions (for showing "you're on the list").
drop policy if exists "Users can view own feature subscriptions" on public.feature_subscriptions;
create policy "Users can view own feature subscriptions" on public.feature_subscriptions
    for select using (auth.uid() = user_id);

-- Mutations go through the SECURITY DEFINER RPC below (never direct client writes).

-- ---------------------------------------------------------------------------
-- Subscribe the current user to a feature (idempotent upsert). Keeps the email
-- in sync with the account's current email.
-- ---------------------------------------------------------------------------
create or replace function public.feature_subscribe(
    p_user_id uuid,
    p_email text,
    p_feature text
) returns boolean as $$
begin
    if p_user_id is null or coalesce(trim(p_email), '') = '' or coalesce(trim(p_feature), '') = '' then
        raise exception 'user_id, email and feature are required';
    end if;

    insert into public.feature_subscriptions (user_id, email, feature)
        values (p_user_id, lower(trim(p_email)), lower(trim(p_feature)))
        on conflict (user_id, feature)
        do update set email = excluded.email;

    return true;
end;
$$ language plpgsql security definer;
