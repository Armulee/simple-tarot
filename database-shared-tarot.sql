-- Shared tarot interpretations for public share links
create table if not exists public.shared_tarot (
  id text primary key,
  did text,
  owner_user_id text,
  question text not null,
  cards text[] not null default '{}',
  interpretation text not null,
  assistant_text text,
  insights jsonb,
  conclusion text,
  spread_type text,
  cards_full jsonb,
  created_at timestamptz not null default now()
);

create index if not exists shared_tarot_did_idx on public.shared_tarot(did);
create index if not exists shared_tarot_owner_user_id_idx on public.shared_tarot(owner_user_id);
create index if not exists shared_tarot_created_at_idx on public.shared_tarot(created_at desc);

create index if not exists idx_shared_tarot_lookup
  on public.shared_tarot(question, interpretation, did);

create index if not exists idx_shared_tarot_user_lookup
  on public.shared_tarot(question, interpretation, owner_user_id);

alter table public.shared_tarot enable row level security;

create policy "Service role can manage all shared_tarot" on public.shared_tarot
  for all using (auth.role() = 'service_role');

create policy "Anyone can read shared_tarot" on public.shared_tarot
  for select using (true);
