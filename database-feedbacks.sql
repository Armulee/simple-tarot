-- Feedbacks table for user satisfaction ratings
create table if not exists public.feedbacks (
  id serial primary key,
  reading_id text not null,
  did text,
  owner_user_id text,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists feedbacks_reading_id_idx on public.feedbacks(reading_id);
create index if not exists feedbacks_created_at_idx on public.feedbacks(created_at desc);

alter table public.feedbacks enable row level security;

create policy "Service role can manage all feedbacks" on public.feedbacks
  for all using (auth.role() = 'service_role');
