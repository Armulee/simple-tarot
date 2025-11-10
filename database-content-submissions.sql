-- Content submissions schema for ownership verification
create extension if not exists pgcrypto;

create table if not exists public.content_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  url text not null,
  title text,
  platform text,
  notes text,
  verification_code text not null,
  verification_method text not null default 'public_code' check (
    verification_method in ('public_code', 'meta_tag', 'profile_bio', 'manual_proof')
  ),
  verification_status text not null default 'pending' check (
    verification_status in ('pending', 'verified', 'failed', 'manual_review')
  ),
  verification_result jsonb,
  auto_verified boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_submissions_user_id_idx
  on public.content_submissions(user_id);

alter table public.content_submissions enable row level security;

drop policy if exists "Users can insert their own submissions" on public.content_submissions;
create policy "Users can insert their own submissions" on public.content_submissions
  for insert
  with check (auth.uid() = user_id);

create table if not exists public.content_submission_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now()
);

alter table public.content_submission_tokens enable row level security;

drop policy if exists "Users can view their submission token" on public.content_submission_tokens;
create policy "Users can view their submission token" on public.content_submission_tokens
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their submission token" on public.content_submission_tokens;
create policy "Users can insert their submission token" on public.content_submission_tokens
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can view their own submissions" on public.content_submissions;
create policy "Users can view their own submissions" on public.content_submissions
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can update their submissions for metadata" on public.content_submissions;
create policy "Users can update their submissions for metadata" on public.content_submissions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

