-- Reports table for flagging inappropriate content
create table if not exists public.reports (
  id serial primary key,
  reading_id text not null,
  did text,
  owner_user_id text,
  reason text not null,
  details text,
  created_at timestamptz not null default now()
);

create index if not exists reports_reading_id_idx on public.reports(reading_id);
create index if not exists reports_created_at_idx on public.reports(created_at desc);

alter table public.reports enable row level security;

create policy "Service role can manage all reports" on public.reports
  for all using (auth.role() = 'service_role');
