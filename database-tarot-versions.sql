-- Tarot reading versions schema
-- This table stores different versions of tarot reading interpretations

-- Create tarot_versions table
create table if not exists public.tarot_versions (
  id serial primary key,
  reading_id text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create index for efficient querying by reading_id
create index if not exists tarot_versions_reading_id_idx on public.tarot_versions(reading_id);

-- Create index for ordering by creation time
create index if not exists tarot_versions_created_at_idx on public.tarot_versions(created_at desc);

-- Enable RLS
alter table public.tarot_versions enable row level security;

-- Create policies
-- Allow service role to bypass RLS for API operations
create policy "Service role can manage all versions" on public.tarot_versions
  for all using (auth.role() = 'service_role');

-- Allow authenticated users to insert versions (API validates ownership)
create policy "Authenticated users can insert versions" on public.tarot_versions
  for insert with check (auth.uid() is not null);

-- Users can view versions for their own readings
create policy "Users can view versions for their readings" on public.tarot_versions
  for select using (
    reading_id in (
      select id from public.tarot_readings 
      where owner_user_id = auth.uid()::text
    )
  );

-- Users can insert versions for their own readings
create policy "Users can insert versions for their readings" on public.tarot_versions
  for insert with check (
    reading_id in (
      select id from public.tarot_readings 
      where owner_user_id = auth.uid()::text
    )
  );

-- Users can update versions for their own readings
create policy "Users can update versions for their readings" on public.tarot_versions
  for update using (
    reading_id in (
      select id from public.tarot_readings 
      where owner_user_id = auth.uid()::text
    )
  );

-- Users can delete versions for their own readings
create policy "Users can delete versions for their readings" on public.tarot_versions
  for delete using (
    reading_id in (
      select id from public.tarot_readings 
      where owner_user_id = auth.uid()::text
    )
  );

-- Function to automatically update updated_at timestamp
create or replace function public.update_tarot_versions_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger to automatically update updated_at
create trigger tarot_versions_updated_at_trigger
  before update on public.tarot_versions
  for each row
  execute function public.update_tarot_versions_updated_at();
