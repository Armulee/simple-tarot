-- Encrypted privacy alias vault (idempotent)
-- Stores the per-user mapping from privacy placeholder tokens (e.g. [Person_0])
-- to the original PII string. The placeholder + alias_type are cleartext (used as
-- DB indexes), but the original PII is encrypted with AES-256-GCM using a per-user
-- HKDF-derived key from a server master secret. The server can decrypt; the goal
-- is encryption at rest with per-user key isolation, not true client-side E2EE.
-- Safe to run multiple times.

create extension if not exists pgcrypto;

create table if not exists public.privacy_aliases (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    session_id text not null references public.chat_sessions(id) on delete cascade,
    placeholder text not null,
    alias_type text not null,
    ciphertext bytea not null,
    iv bytea not null,
    auth_tag bytea not null,
    key_version smallint not null default 1,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id, session_id, placeholder)
);

create index if not exists idx_privacy_aliases_user_session
    on public.privacy_aliases(user_id, session_id);

alter table public.privacy_aliases enable row level security;

drop policy if exists "Users read own aliases" on public.privacy_aliases;
create policy "Users read own aliases" on public.privacy_aliases
    for select using (auth.uid() = user_id);

drop policy if exists "Users write own aliases" on public.privacy_aliases;
create policy "Users write own aliases" on public.privacy_aliases
    for insert with check (auth.uid() = user_id);

drop policy if exists "Users update own aliases" on public.privacy_aliases;
create policy "Users update own aliases" on public.privacy_aliases
    for update using (auth.uid() = user_id);

drop policy if exists "Users delete own aliases" on public.privacy_aliases;
create policy "Users delete own aliases" on public.privacy_aliases
    for delete using (auth.uid() = user_id);

comment on table public.privacy_aliases is
    'Encrypted per-user mapping from privacy placeholder tokens (e.g. [Person_0]) to original PII. Encrypted with AES-256-GCM using a per-user HKDF-derived key from a server master secret.';
comment on column public.privacy_aliases.placeholder is
    'Cleartext placeholder token such as [Person_0]. Safe to expose because it carries no PII on its own.';
comment on column public.privacy_aliases.alias_type is
    'Redaction type matching PromptRedactionType in lib/privacy/prompt-redaction.ts (person, email, phone, handle, address, card, passport, national_id).';
comment on column public.privacy_aliases.ciphertext is
    'AES-256-GCM ciphertext of the original PII.';
comment on column public.privacy_aliases.iv is
    '12-byte random IV used for the AES-GCM encryption.';
comment on column public.privacy_aliases.auth_tag is
    '16-byte GCM authentication tag. Must verify on decrypt.';
comment on column public.privacy_aliases.key_version is
    'Versioning hook for future key rotation. Always 1 for now.';
