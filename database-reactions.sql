-- Generic reactions (like/dislike) for any content type
create table if not exists public.reactions (
  id serial primary key,
  content_id text not null,
  content_type text not null default 'tarot',
  did text,
  owner_user_id text,
  reaction text not null check (reaction in ('like', 'dislike')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reactions
  add constraint reactions_content_did_uq unique (content_id, content_type, did);

create index if not exists reactions_content_idx on public.reactions(content_id, content_type);
create index if not exists reactions_content_type_idx on public.reactions(content_type);

alter table public.reactions enable row level security;

create policy "Service role can manage all reactions" on public.reactions
  for all using (auth.role() = 'service_role');

create or replace function public.update_reactions_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger reactions_updated_at_trigger
  before update on public.reactions
  for each row
  execute function public.update_reactions_updated_at();
